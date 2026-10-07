const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { generateOTP, sendOtpEmail } = require('../mailer');

// In-memory OTP storage: email -> { otp, expiresAt, firstName, lastName, phone }
const otpStore = new Map();

// In-memory Password Reset OTP storage: email -> { otp, expiresAt, userId, name }
const resetOtpStore = new Map();

// Helper to validate forcecraver domain
function isForceCraverEmail(email) {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith('@forcecraver.com');
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is deactivated. Please contact admin.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/send-otp (1st time employee verification code generation via SMTP)
router.post('/send-otp', async (req, res) => {
  const { email, firstName, lastName, phone } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Work Email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Strict domain validation: Must end with @forcecraver.com
  if (!isForceCraverEmail(cleanEmail)) {
    return res.status(400).json({
      error: 'Invalid email domain. Only official @forcecraver.com email addresses are allowed (e.g. name@forcecraver.com).',
    });
  }

  if (!firstName || !firstName.trim()) {
    return res.status(400).json({ error: 'First Name is compulsory.' });
  }

  try {
    // Check if account already exists with active password
    const existing = await db.get('SELECT id, name, status FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({
        error: `An account for ${cleanEmail} is already registered. Please switch to the "Sign In" tab to log in.`,
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    const computedFullName = `${firstName.trim()} ${(lastName || '').trim()}`.trim().toUpperCase();

    otpStore.set(cleanEmail, {
      otp,
      expiresAt,
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      phone: phone ? phone.trim() : '',
    });

    // Send real email via SMTP
    const mailResult = await sendOtpEmail(cleanEmail, otp, computedFullName);

    res.json({
      success: true,
      message: `A 6-digit verification code (OTP) has been sent to ${cleanEmail}`,
      email: cleanEmail,
      demoOtp: mailResult.devOtp || otp, // Returned for dev/fallback convenience
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to process OTP request' });
  }
});

// POST /api/auth/verify-otp-register (1st time employee OTP verification & password setup)
router.post('/verify-otp-register', async (req, res) => {
  const { email, otp, password, confirmPassword, firstName, lastName, phone } = req.body;

  if (!email || !otp || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Email, OTP, Password, and Confirm Password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Strict domain check
  if (!isForceCraverEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Only official @forcecraver.com email addresses are allowed.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'New Password and Re-entered Password do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const storedData = otpStore.get(cleanEmail);
  if (!storedData) {
    return res.status(400).json({ error: 'No OTP requested for this email or OTP expired. Please request OTP again.' });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
  }

  if (storedData.otp !== String(otp).trim()) {
    return res.status(400).json({ error: 'Invalid verification OTP code. Please enter the correct 6-digit OTP.' });
  }

  // OTP is verified! Clean up OTP from store
  otpStore.delete(cleanEmail);

  const finalFirstName = (storedData.firstName || firstName || '').trim();
  const finalLastName = (storedData.lastName || lastName || '').trim();
  const fullName = `${finalFirstName} ${finalLastName}`.trim().toUpperCase();
  const finalPhone = (storedData.phone || phone || '').trim();

  try {
    const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'User with this email is already registered.' });
    }

    // Auto-generate unique employee ID by scanning existing IDs
    const empRows = await db.all("SELECT employee_id FROM users WHERE employee_id LIKE 'EMP%'");
    let maxEmpNum = 0;
    for (const r of empRows) {
      if (r.employee_id) {
        const match = r.employee_id.match(/^EMP(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (!isNaN(val) && val > maxEmpNum) {
            maxEmpNum = val;
          }
        }
      }
    }

    let nextEmpVal = maxEmpNum + 1;
    let employee_id = `EMP${String(nextEmpVal).padStart(3, '0')}`;
    while (true) {
      const candidateId = `EMP${String(nextEmpVal).padStart(3, '0')}`;
      const existingId = await db.get('SELECT id FROM users WHERE employee_id = ?', [candidateId]);
      if (!existingId) {
        employee_id = candidateId;
        break;
      }
      nextEmpVal++;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const insertRes = await db.query(`
      INSERT INTO users (employee_id, name, email, password, role, phone, previous_cl, monthly_cl)
      VALUES (?, ?, ?, ?, 'employee', ?, 0.0, 1.0)
      RETURNING id, employee_id, name, email, role, phone, status, previous_cl, monthly_cl, created_at
    `, [employee_id, fullName, cleanEmail, hashedPassword, finalPhone]);

    const newUser = insertRes.rows[0];

    const token = jwt.sign(
      {
        id: newUser.id,
        employee_id: newUser.employee_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account activated successfully! Logging in...',
      token,
      user: newUser,
    });
  } catch (err) {
    console.error('Registration/Activation error:', err);
    res.status(500).json({ error: 'Internal server error during account setup' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, employee_id, name, email, role, phone, status, created_at, previous_cl, monthly_cl FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  const formattedName = name && name.trim() ? name.trim().toUpperCase() : null;
  try {
    const fields = [];
    const params = [];
    if (formattedName) {
      fields.push('name = ?');
      params.push(formattedName);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      params.push(phone);
    }
    if (fields.length > 0) {
      params.push(req.user.id);
      await db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    const updatedUser = await db.get('SELECT id, employee_id, name, email, role, phone, status, created_at, previous_cl, monthly_cl FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    const user = await db.get('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(newPassword, salt);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// POST /api/auth/forgot-password/send-otp
router.post('/forgot-password/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await db.get('SELECT id, name, email, status FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!user) {
      return res.status(404).json({ error: `No registered account found with email: ${cleanEmail}` });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account is deactivated. Please contact administrator.' });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    resetOtpStore.set(cleanEmail, {
      otp,
      expiresAt,
      userId: user.id,
      name: user.name,
    });

    // Send real SMTP email
    const mailResult = await sendOtpEmail(cleanEmail, otp, user.name, 'reset');

    res.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${cleanEmail}`,
      email: cleanEmail,
      demoOtp: mailResult.devOtp || otp,
    });
  } catch (err) {
    console.error('Forgot password send-otp error:', err);
    res.status(500).json({ error: 'Internal server error while sending reset OTP' });
  }
});

// POST /api/auth/forgot-password/verify-reset
router.post('/forgot-password/verify-reset', async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;

  if (!email || !otp || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Email, OTP, New Password, and Confirm Password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'New Password and Re-entered Password do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const storedData = resetOtpStore.get(cleanEmail);
  if (!storedData) {
    return res.status(400).json({ error: 'No password reset request found for this email or OTP expired. Please request OTP again.' });
  }

  if (Date.now() > storedData.expiresAt) {
    resetOtpStore.delete(cleanEmail);
    return res.status(400).json({ error: 'OTP has expired. Please request a new reset code.' });
  }

  if (storedData.otp !== String(otp).trim()) {
    return res.status(400).json({ error: 'Invalid 6-digit OTP verification code.' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashed = bcrypt.hashSync(password, salt);

    await db.run('UPDATE users SET password = ? WHERE LOWER(email) = ?', [hashed, cleanEmail]);
    resetOtpStore.delete(cleanEmail);

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (err) {
    console.error('Forgot password verify-reset error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;
