import React, { useState } from 'react';

const iconStyle = {
  width: '18px',
  height: '18px',
  display: 'block'
};

const buttonStyle = {
  position: 'absolute',
  top: '50%',
  right: '10px',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  padding: '4px',
  cursor: 'pointer',
  color: 'var(--slate)'
};

const inputStyle = {
  paddingRight: '44px'
};

const PasswordField = ({ label, value, onChange, required, name, autoComplete }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="contact-form-group">
      <label className="contact-form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          className="contact-form-input"
          value={value}
          onChange={onChange}
          required={required}
          name={name}
          autoComplete={autoComplete}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={buttonStyle}
        >
          {show ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
              <path
                fill="currentColor"
                d="M12 4.5c5.05 0 9.27 3.19 11 7.5-1.73 4.31-5.95 7.5-11 7.5S2.73 16.31 1 12c1.73-4.31 5.95-7.5 11-7.5Zm0 2C8.11 6.5 4.76 8.8 3.13 12 4.76 15.2 8.11 17.5 12 17.5s7.24-2.3 8.87-5.5C19.24 8.8 15.89 6.5 12 6.5Zm0 2.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
              <path
                fill="currentColor"
                d="m3.53 2.47 18 18-1.41 1.41-3.35-3.35A11.46 11.46 0 0 1 12 19.5c-5.05 0-9.27-3.19-11-7.5a12.64 12.64 0 0 1 4.11-5.2L2.12 3.88 3.53 2.47Zm3.05 5.88A10.55 10.55 0 0 0 3.13 12C4.76 15.2 8.11 17.5 12 17.5c1.12 0 2.2-.2 3.2-.55l-1.7-1.7a3.99 3.99 0 0 1-5.42-5.42l-1.5-1.5Zm4.02.44 3.98 3.98a2 2 0 0 0-2.8-2.8Zm7.57 5.6-2.13-2.13a4.01 4.01 0 0 0-4.3-4.3L9.6 5.83c.78-.22 1.58-.33 2.4-.33 3.89 0 7.24 2.3 8.87 5.5a11.6 11.6 0 0 1-2.7 3.39Z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
