import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { csrfFetch } from '../../utils/csrf';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await csrfFetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('If an account exists, a reset link has been sent to your email.');
      } else {
        setMessage(data.error || 'Failed to send reset link.');
      }
    } catch (err) {
      setMessage('Failed to send request. Server might be down.');
    }
  };

  return (
    <div className="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)' }}>
      <div className="contact-form-container" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="contact-form-title">Reset Password</h2>
        <hr className="contact-form-divider" />
        {message ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ink-700)' }}>
            <p>{message}</p>
            <a href="/admin/login" style={{ color: 'var(--slate)', textDecoration: 'underline', marginTop: '15px', display: 'inline-block' }}>Back to Login</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--slate)' }}>Enter your email to receive a password reset link.</p>
            <div className="contact-form-group">
              <label className="contact-form-label">Email</label>
              <input type="email" className="contact-form-input" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="contact-form-submit">Send Link</button>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <a href="/admin/login" style={{ color: 'var(--slate)', textDecoration: 'underline' }}>Back to Login</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
