import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { csrfFetch } from '../../utils/csrf';
import PasswordField from '../../components/PasswordField';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const logout = searchParams.get('logout');
    if (logout) {
      const message = searchParams.get('message') || 'Logged out successfully.';
      setFormSuccess(message);
      setFormError('');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    try {
      const res = await csrfFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/admin'), 1000);
      } else {
        if (data.error && data.error.toLowerCase().includes('invalid')) {
           setFormError('Wrong email or wrong password. Please try again.');
        } else {
           setFormError(data.error || 'Login failed.');
        }
      }
    } catch (err) {
      setFormError('Login failed due to a network error. Please try again.');
    }
  };

  return (
    <div className="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)' }}>
      <div className="contact-form-container" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="contact-form-title">Admin Login</h2>
        <hr className="contact-form-divider" />
        
        {formError && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '15px' }}>{formError}</div>}
        {formSuccess && <div style={{ padding: '10px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', marginBottom: '15px' }}>{formSuccess}</div>}

        <form onSubmit={handleLogin}>
          <div className="contact-form-group">
            <label className="contact-form-label">Email</label>
            <input type="email" className="contact-form-input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <PasswordField
            label="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            name="password"
            autoComplete="current-password"
          />
          <button type="submit" className="contact-form-submit">Login</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a href="/admin/forgot-password" style={{ color: 'var(--slate)', textDecoration: 'underline', fontSize: '0.95rem' }}>Forgot Password?</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
