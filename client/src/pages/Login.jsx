import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound,
  Sparkles, 
  Phone, 
  RefreshCw, 
  Building2 
} from 'lucide-react';

export function Login() {
  const { login, verifyOtpRegister } = useAuth();
  
  // Tab: 'login' | 'first_time'
  const [activeTab, setActiveTab] = useState('login');

  // Sign In state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 1st Time Employee Setup state
  // Step 1: Info (First name, Last name, Email @forcecraver.com, Phone)
  // Step 2: OTP + Password + Re-enter Password
  const [setupStep, setSetupStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [otp, setOtp] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Demo OTP banner storage for quick local testing
  const [demoOtp, setDemoOtp] = useState(null);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState(null);

  // Forgot Password state
  // Step 1: Email -> Step 2: OTP + New Password + Confirm
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState(['', '', '', '', '', '']);
  const forgotOtpRefs = useRef([]);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-detect /admin or /developer in URL to automatically prefill role credentials
  React.useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('admin')) {
      setEmail('admin@portal.com');
      setPassword('admin123');
    } else if (path.includes('developer') || path.includes('dev')) {
      setEmail('developer@portal.com');
      setPassword('dev123');
    }
  }, []);

  // Helper to handle individual OTP box digit changes
  const handleOtpDigitChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length > 1) {
      // Multiple digits entered/pasted
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = cleanValue[i] || '';
      }
      setOtpDigits(newDigits);
      setOtp(newDigits.join(''));
      const nextFocus = Math.min(cleanValue.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const singleDigit = cleanValue.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = singleDigit;
    setOtpDigits(newDigits);
    setOtp(newDigits.join(''));

    if (singleDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);
    setOtp(newDigits.join(''));
    const nextFocus = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextFocus]?.focus();
  };

  const fillOtpCode = (code) => {
    const clean = String(code).replace(/\D/g, '').slice(0, 6);
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < clean.length; i++) {
      newDigits[i] = clean[i];
    }
    setOtpDigits(newDigits);
    setOtp(clean);
  };

  // Validate forcecraver.com domain
  const isForceCraverEmail = (mail) => {
    return mail && mail.trim().toLowerCase().endsWith('@forcecraver.com');
  };

  // 1. Regular Sign In Handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  // 2. Step 1: Send OTP for 1st Time Employee Setup
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setOtpSuccessMessage(null);

    if (!firstName.trim()) {
      setError('First Name is compulsory.');
      return;
    }

    if (!regEmail.trim()) {
      setError('Work Email address is required.');
      return;
    }

    if (!isForceCraverEmail(regEmail)) {
      setError('Work Email must end with @forcecraver.com (e.g. yourname@forcecraver.com)');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: phone.trim(),
      });

      setDemoOtp(res.demoOtp || '123456');
      setOtpSuccessMessage(res.message || `OTP sent to ${regEmail}`);
      setSetupStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code');
    } finally {
      setLoading(false);
    }
  };

  // 3. Step 2: Verify OTP and Set Password & Login
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP verification code.');
      return;
    }

    if (otp.trim().length !== 6) {
      setError('OTP must be a 6-digit code.');
      return;
    }

    if (!regPassword) {
      setError('Please create a password.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('Password and Re-entered Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtpRegister({
        email: regEmail.trim().toLowerCase(),
        otp: otp.trim(),
        password: regPassword,
        confirmPassword: confirmPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });

      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch (err) {}

    } catch (err) {
      setError(err.message || 'Failed to verify OTP or set password');
    } finally {
      setLoading(false);
    }
  };

  // 4. Forgot Password Handlers
  const handleForgotOtpDigitChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length > 1) {
      const newDigits = [...forgotOtpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = cleanValue[i] || '';
      }
      setForgotOtpDigits(newDigits);
      setForgotOtp(newDigits.join(''));
      const nextFocus = Math.min(cleanValue.length, 5);
      forgotOtpRefs.current[nextFocus]?.focus();
      return;
    }

    const singleDigit = cleanValue.slice(-1);
    const newDigits = [...forgotOtpDigits];
    newDigits[index] = singleDigit;
    setForgotOtpDigits(newDigits);
    setForgotOtp(newDigits.join(''));

    if (singleDigit && index < 5) {
      forgotOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotOtpDigits[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setForgotOtpDigits(newDigits);
    setForgotOtp(newDigits.join(''));
    const nextFocus = Math.min(pastedData.length, 5);
    forgotOtpRefs.current[nextFocus]?.focus();
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setResetSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPasswordSendOtp({
        email: forgotEmail.trim().toLowerCase(),
      });
      setForgotStep(2);
      setResetSuccessMessage(res.message || `Password reset code sent to ${forgotEmail}`);
    } catch (err) {
      setError(err.message || 'Failed to send password reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyAndReset = async (e) => {
    e.preventDefault();
    setError(null);

    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!forgotNewPassword) {
      setError('Please create a new password.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('New Password and Re-entered Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.forgotPasswordVerifyReset({
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        password: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });

      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch (err) {}

      setEmail(forgotEmail.trim().toLowerCase());
      setPassword('');
      setActiveTab('login');
      setResetSuccessMessage(res.message || 'Password reset successfully! You can now log in.');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white border border-slate-200/90 rounded-2xl shadow-sm mb-3">
          <img
            src="/logo.png"
            alt="Forcecraver Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">
          Forcecraver Attendance Portal
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Official Attendance & Leave Management Hub (Mon - Fri, 10 AM - 7 PM)
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 sm:px-8 rounded-2xl border border-slate-200/90 shadow-xl space-y-5">

          {/* Success / Info Message Alert */}
          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Form Tabs: Sign In vs 1st Time Employee Setup */}
          {activeTab !== 'forgot_password' ? (
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => { 
                  setActiveTab('login'); 
                  setError(null); 
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { 
                  setActiveTab('first_time'); 
                  setError(null); 
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'first_time'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Login Setup
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">Forgot Password</h2>
                  <p className="text-[10px] text-slate-400">
                    {forgotStep === 1 ? 'Enter email to receive OTP' : 'Verify OTP & set new password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          )}

          {/* Error Message Alert */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: REGULAR SIGN IN FORM                                               */}
          {/* ========================================================================= */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@forcecraver.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forgot_password');
                      setForgotEmail(email || '');
                      setForgotStep(1);
                      setError(null);
                      setResetSuccessMessage(null);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span>First time employee?</span>
                <button
                  type="button"
                  onClick={() => { setActiveTab('first_time'); setError(null); }}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Go to Login Setup
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 1ST TIME EMPLOYEE LOGIN & ACCOUNT SETUP                            */}
          {/* ========================================================================= */}
          {activeTab === 'first_time' && (
            <div className="space-y-4">
              
              {/* Stepper Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    setupStep === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {setupStep === 1 ? '1' : '✓'}
                  </span>
                  <span className={setupStep === 1 ? 'font-bold text-slate-900' : 'text-slate-500'}>
                    Employee Details
                  </span>
                </div>

                <div className="h-px w-8 bg-slate-200" />

                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    setupStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    2
                  </span>
                  <span className={setupStep === 2 ? 'font-bold text-slate-900' : 'text-slate-400'}>
                    OTP & Password
                  </span>
                </div>
              </div>

              {/* ---------------- STEP 1: First Name, Last Name, @forcecraver.com Email ---------------- */}
              {setupStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                        placeholder="SARTHAK"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Last Name <span className="text-[10px] text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value.toUpperCase())}
                        placeholder="KAUSHAL"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        Work Email <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                        @forcecraver.com only
                      </span>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="yourname@forcecraver.com"
                        required
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Must be your official organization email ending with <strong>@forcecraver.com</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Phone Number <span className="text-[10px] text-slate-400">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20"
                  >
                    {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* ---------------- STEP 2: OTP Verification & Password Setup ---------------- */}
              {setupStep === 2 && (
                <form onSubmit={handleVerifyOtpAndRegister} className="space-y-3.5">
                  
                  {/* Clean Unified Verification Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs truncate">{regEmail}</span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          OTP Sent
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSetupStep(1)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer px-1"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 pl-9 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 uppercase">{`${firstName} ${lastName}`.trim()}</span>
                      <span className="text-slate-300">•</span>
                      <span>Check your inbox or spam folder for the code</span>
                    </div>
                  </div>

                  {/* 6-Digit OTP Box Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700">
                        Enter 6-Digit OTP <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend OTP
                      </button>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={otpDigits[index]}
                          onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onFocus={(e) => e.target.select()}
                          placeholder="•"
                          className={`h-12 w-full text-center text-xl font-mono font-bold rounded-xl border transition-all outline-hidden ${
                            otpDigits[index]
                              ? 'bg-blue-50/60 border-blue-500 text-blue-900 ring-2 ring-blue-100 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Create Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Create Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Re-enter Password Verification */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Re-enter Password Verification <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type password to verify"
                        required
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {confirmPassword && (
                      <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${
                        regPassword === confirmPassword ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {regPassword === confirmPassword ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Passwords match!
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Passwords do not match
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (confirmPassword && regPassword !== confirmPassword)}
                    className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{loading ? 'Activating Account...' : 'Verify OTP & Activate Account'}</span>
                  </button>
                </form>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FORGOT PASSWORD FLOW                                               */}
          {/* ========================================================================= */}
          {activeTab === 'forgot_password' && (
            <div className="space-y-4">

              {/* Step 1: Request OTP */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotSendOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Registered Work Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="name@forcecraver.com"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      We will send a 6-digit verification code to your registered email to reset your password.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-600/20"
                  >
                    {loading ? 'Sending OTP...' : 'Send Password Reset Code'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Step 2: OTP + New Password + Confirm */}
              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerifyAndReset} className="space-y-3.5">
                  {/* Clean Unified Verification Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs truncate">{forgotEmail}</span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          OTP Sent
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setForgotStep(1)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer px-1"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 pl-9">
                      Enter the 6-digit reset code sent to your email
                    </div>
                  </div>

                  {/* 6-Digit OTP Box Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700">
                        Enter 6-Digit Reset Code <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotSendOtp}
                        className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend Code
                      </button>
                    </div>

                    <div className="grid grid-cols-6 gap-2 sm:gap-2.5" onPaste={handleForgotOtpPaste}>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          ref={(el) => (forgotOtpRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={forgotOtpDigits[index]}
                          onChange={(e) => handleForgotOtpDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleForgotOtpKeyDown(index, e)}
                          onFocus={(e) => e.target.select()}
                          placeholder="•"
                          className={`h-12 w-full text-center text-xl font-mono font-bold rounded-xl border transition-all outline-hidden ${
                            forgotOtpDigits[index]
                              ? 'bg-blue-50/60 border-blue-500 text-blue-900 ring-2 ring-blue-100 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 hover:border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Re-enter New Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Re-enter New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-type new password to verify"
                        required
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {forgotConfirmPassword && (
                      <p className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${
                        forgotNewPassword === forgotConfirmPassword ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {forgotNewPassword === forgotConfirmPassword ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Passwords match!
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" /> Passwords do not match
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword)}
                    className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{loading ? 'Resetting Password...' : 'Reset Password & Save'}</span>
                  </button>
                </form>
              )}

            </div>
          )}

          {/* Footer Info */}
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 space-y-1 text-center">
            <p>• <strong>Working Days:</strong> Monday to Friday (10:00 AM - 07:00 PM)</p>
            <p>• <strong>Shift Timings:</strong> 1st Half (10-2 PM) | 2nd Half (2-7 PM)</p>
          </div>

        </div>
      </div>

    </div>
  );
}
