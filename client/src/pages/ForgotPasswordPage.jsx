// ===== src/pages/ForgotPasswordPage.jsx =====
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import './AuthPage.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const { forgotPassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Add auth-page class to body for proper styling
  useEffect(() => {
    document.body.classList.add('auth-page');
    document.getElementById('root')?.classList.add('auth-page');
    
    return () => {
      document.body.classList.remove('auth-page');
      document.getElementById('root')?.classList.remove('auth-page');
    };
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await forgotPassword(email.trim());
      
      // Check if the request was successful
      if (result && result.success) {
        setIsEmailSent(true);
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  const handleResendEmail = async () => {
    setIsSubmitting(true);
    setError('');
    setResendSuccess(false);

    try {
      const result = await forgotPassword(email.trim());
      
      // Show success message for resend
      if (result.success) {
        setResendSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch (error) {
      setError(error.message || 'Failed to resend email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="auth-page">
        <div className="auth-background">
          <div className="auth-particles"></div>
        </div>
        
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-logo">
                <div className="logo-icon">
                  <img src="/assets/Jarvislogo.png" alt="Jarvis" width="40" height="40" />
                </div>
                <h1 className="logo-text">Jarvis</h1>
              </div>
              <h2>Check Your Email</h2>
              <p>We've sent password reset instructions to your email address</p>
            </div>

            <div className="success-content">
              <div className="success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22,4 12,14.01 9,11.01"></polyline>
                </svg>
              </div>
              <div className="success-message">
                <h3>Email Sent Successfully</h3>
                <p>
                  We've sent a password reset link to{' '}
                  <strong>{email}</strong>
                </p>
                <p>
                  Please check your email and click the link to reset your password.
                  The link will expire in 1 hour.
                </p>
              </div>

              <div className="email-instructions">
                <h4>Didn't receive the email?</h4>
                <ul>
                  <li>Check your spam or junk folder</li>
                  <li>Make sure the email address is correct</li>
                  <li>Wait a few minutes and try again</li>
                  {process.env.NODE_ENV === 'development' && (
                    <li style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                      ⚠️ Development mode: Check server console for reset URL
                    </li>
                  )}
                </ul>
              </div>

              <div className="auth-actions">
                {resendSuccess && (
                  <div className="success-message" style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    color: '#22c55e',
                    textAlign: 'center',
                    fontSize: '14px'
                  }}>
                    ✅ Email resent successfully! Please check your inbox.
                  </div>
                )}
                
                <button
                  onClick={handleResendEmail}
                  disabled={isSubmitting}
                  className="auth-button secondary"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="small" />
                      Sending...
                    </>
                  ) : (
                    'Resend Email'
                  )}
                </button>
                
                <Link to="/login" className="auth-link">
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-particles"></div>
      </div>
      
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="logo-icon">
                <img src="/assets/Jarvislogo.png" alt="Jarvis" width="32" height="32" />
              </div>
              <h1 className="logo-text">Jarvis</h1>
            </div>
            <h2>Reset Password</h2>
            <p>Enter your email to receive password reset instructions</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email address"
                disabled={isSubmitting}
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && (
              <div className="error-message submit-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="small" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;