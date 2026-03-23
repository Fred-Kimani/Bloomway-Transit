import React from 'react';

const PasswordRules = ({ compact }) => {
  const containerStyle = compact
    ? { fontSize: '0.9rem', color: 'var(--admin-subtext)', marginTop: '10px' }
    : { fontSize: '0.95rem', color: 'var(--admin-subtext)', margin: '10px 0 20px' };

  const symbols = `!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`;

  return (
    <div style={containerStyle}>
      <div style={{ fontWeight: 600, color: 'var(--admin-text)', marginBottom: '6px' }}>Password requirements</div>
      <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.6' }}>
        <li>At least 12 characters</li>
        <li>At least one letter</li>
        <li>At least one number</li>
        <li>
          At least one symbol from: <code>{symbols}</code>
        </li>
      </ul>
    </div>
  );
};

export default PasswordRules;
