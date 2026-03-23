import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { csrfFetch } from '../../utils/csrf';
import PasswordField from '../../components/PasswordField';
import PasswordRules from '../../components/PasswordRules';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  if (!token) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>Invalid or missing token. Please request a new password reset link.</p>
        <a href="/admin/forgot-password" style={{ textDecoration: 'underline' }}>Go to Forgot Password</a>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return alert('Passwords do not match');
    }

    try {
      const res = await csrfFetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password successfully reset! Please login.');
        navigate('/admin/login');
      } else {
        setMessage(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setMessage('Failed to send request. Server might be down.');
    }
  };

  return (
    <div className="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)' }}>
      <div className="contact-form-container" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="contact-form-title">Enter New Password</h2>
        <hr className="contact-form-divider" />
        <PasswordRules />
        <form onSubmit={handleSubmit}>
          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            name="newPassword"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            name="confirmPassword"
            autoComplete="new-password"
          />
          {message && <p style={{ color: 'red', textAlign: 'center' }}>{message}</p>}
          <button type="submit" className="contact-form-submit">Update Password</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
