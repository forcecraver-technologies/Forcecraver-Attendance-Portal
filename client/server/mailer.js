const nodemailer = require('nodemailer');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(toEmail, otp, name, type = 'setup') {
  const recipientName = (name || 'Employee').trim();
  const isReset = type === 'reset';

  // Check SMTP configuration from environment variables
  const smtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || 'sarthak@forcecraver.com';
  const smtpPass = process.env.SMTP_PASS || '10873Fct#';
  const fromEmail = process.env.EMAIL_FROM || 'Forcecraver Attendance Portal <sarthak@forcecraver.com>';

  const subjectTitle = isReset ? 'Password Reset OTP' : 'Setup Verification Code';
  const actionDescription = isReset 
    ? 'Use the one-time verification code (OTP) below to <strong>reset your password</strong> on the Forcecraver Attendance Portal.'
    : 'Use the one-time verification code (OTP) below to complete your <strong>First-Time Login Setup</strong> and create your password on the Forcecraver Attendance Portal.';
  const logoSub = isReset ? 'Password Reset Verification' : 'Attendance Portal Setup';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06); }
          .header { background: #0f172a; padding: 28px 24px; text-align: center; }
          .logo-text { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0; }
          .logo-sub { color: #60a5fa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
          .content { padding: 32px 24px; text-align: center; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
          .message { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .otp-box { background: #f1f5f9; border: 2px dashed #2563eb; border-radius: 12px; padding: 18px 24px; margin: 20px auto; display: inline-block; min-width: 220px; }
          .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e40af; font-family: 'Courier New', Courier, monospace; }
          .expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
          .notice { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; line-height: 1.5; }
          .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo-text">Forcecraver</h1>
            <div class="logo-sub">${logoSub}</div>
          </div>
          <div class="content">
            <div class="greeting">Hello, ${recipientName} 👋</div>
            <p class="message">
              ${actionDescription}
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="expiry">⏱️ Valid for 10 minutes only</div>
            </div>
            <p class="notice">
              ⚠️ If you did not initiate this request, please ignore this email or reach out to your administrator immediately.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Forcecraver Attendance Portal. Official Internal System.
          </div>
        </div>
      </body>
    </html>
  `;

  console.log('----------------------------------------------------');
  console.log(`🔐 [ATTENDANCE ${isReset ? 'PASSWORD RESET' : 'SETUP'} OTP GENERATED]`);
  console.log(`👤 Recipient : ${recipientName} <${toEmail}>`);
  console.log(`🔢 OTP Code  : ${otp}`);
  // Safeguard: Skip SMTP sending for fake test/dummy email addresses to prevent bounce emails
  if (toEmail.startsWith('test.emp.') || toEmail.includes('.test@') || toEmail.startsWith('demo.')) {
    console.log(`ℹ️ [TEST SUITE EMAIL DETECTED] Skipped SMTP dispatch to avoid bounce: ${toEmail}`);
    return { success: true, devOtp: otp };
  }

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        subject: `Forcecraver Attendance Portal - ${subjectTitle}: ${otp}`,
        text: `Hello ${recipientName},\n\nYour Attendance Portal ${subjectTitle} is: ${otp}\n\nThis code is valid for 10 minutes.\nIf you did not request this code, please ignore this email.`,
        html: htmlContent,
      });

      console.log(`✅ [OTP EMAIL DELIVERED via SMTP] Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn('⚠️ SMTP email sending failed (OTP logged to console):', err.message);
      return { success: false, error: err.message, devOtp: otp };
    }
  }

  return { success: true };
}

module.exports = {
  generateOTP,
  sendOtpEmail,
};
