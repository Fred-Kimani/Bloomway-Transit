import React from 'react';
import PasswordRules from '../../components/PasswordRules';

const Register = () => {
  return (
    <div className="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)' }}>
      <div className="contact-form-container" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="contact-form-title">Register Admin</h2>
        <hr className="contact-form-divider" />
        <p style={{ textAlign: 'center', color: 'var(--slate)' }}>
          Registration is disabled. Please contact an administrator.
        </p>
        <PasswordRules compact />
        <div style={{ textAlign: 'center', marginTop: '15px' }}>
          <a href="/admin/login" style={{ color: 'var(--slate)', textDecoration: 'underline' }}>Back to Login</a>
        </div>
      </div>
    </div>
  );
};

export default Register;
