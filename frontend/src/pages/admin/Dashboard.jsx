import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomePage from '../HomePage';
import { csrfFetch } from '../../utils/csrf';
import PasswordField from '../../components/PasswordField';
import PasswordRules from '../../components/PasswordRules';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [media, setMedia] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [currentAdminEmail, setCurrentAdminEmail] = useState('');
  const [messageNotice, setMessageNotice] = useState('');
  const [messageError, setMessageError] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const [adminError, setAdminError] = useState('');
  const [mediaNotice, setMediaNotice] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAdminId, setDeletingAdminId] = useState(null);
  const [deletingMediaId, setDeletingMediaId] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [addingExternal, setAddingExternal] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalName, setExternalName] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const uploadsEnabled = String(import.meta.env?.VITE_UPLOADS_ENABLED || 'true').toLowerCase() === 'true';

  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await csrfFetch('/api/admin/verify', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setCurrentAdminEmail(data.email || '');
          setLoading(false);
          fetchMessages();
          fetchMedia();
          fetchAdmins();
        } else {
          navigate('/admin/login');
        }
      } catch (err) {
        navigate('/admin/login');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'admins') {
      fetchAdmins();
    }
    if (activeTab === 'media') {
      fetchMedia();
    }
    if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab]);

  const fetchMessages = async () => {
    try {
      const res = await csrfFetch('/api/admin/messages', { credentials: 'include' });
      if (res.ok) setMessages(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchMedia = async () => {
    try {
      const res = await csrfFetch('/api/admin/media', { credentials: 'include' });
      if (res.ok) setMedia(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchAdmins = async () => {
    try {
      const res = await csrfFetch('/api/admin/admins', { credentials: 'include' });
      if (res.ok) {
        setAdmins(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setAdminError(data.error || 'Failed to fetch admins.');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    setDeletingId(id);
    setMessageNotice('');
    setMessageError('');
    try {
      const res = await csrfFetch('/api/admin/messages/' + id, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== id));
        setMessageNotice(data.message || 'Message deleted successfully.');
      } else {
        setMessageError(data.error || 'Failed to delete message.');
      }
    } catch (err) {
      setMessageError('Failed to delete message.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApproveToggle = async (admin) => {
    setAdminNotice('');
    setAdminError('');
    try {
      const res = await csrfFetch('/api/admin/admins/' + admin.id + '/approval', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: !admin.is_approved })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_approved: !admin.is_approved } : a));
        setAdminNotice(data.message || 'Approval updated.');
      } else {
        setAdminError(data.error || 'Failed to update approval.');
      }
    } catch (err) {
      setAdminError('Failed to update approval.');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Delete this admin? This cannot be undone.')) return;
    setDeletingAdminId(id);
    setAdminNotice('');
    setAdminError('');
    try {
      const res = await csrfFetch('/api/admin/admins/' + id, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdmins(prev => prev.filter(a => a.id !== id));
        setAdminNotice(data.message || 'Admin deleted successfully.');
      } else {
        setAdminError(data.error || 'Failed to delete admin.');
      }
    } catch (err) {
      setAdminError('Failed to delete admin.');
    } finally {
      setDeletingAdminId(null);
    }
  };

  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setAdminNotice('');
    setAdminError('');
    try {
      const res = await csrfFetch('/api/admin/admins/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdminNotice(data.message || 'Invite sent.');
        setInviteEmail('');
        fetchAdmins();
      } else {
        setAdminError(data.error || 'Failed to send invite.');
      }
    } catch (err) {
      setAdminError('Failed to send invite.');
    } finally {
      setInviting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await csrfFetch('/api/admin/media', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (res.ok) {
        fetchMedia();
      } else {
        alert('Upload failed');
      }
    } catch(err) {
      alert(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id) => {
    if (!window.confirm('Delete this media asset? This cannot be undone.')) return;
    setDeletingMediaId(id);
    setMediaNotice('');
    setMediaError('');
    try {
      const res = await csrfFetch('/api/admin/media/' + id, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMedia(prev => prev.filter(asset => asset.id !== id));
        setMediaNotice(data.message || 'Media deleted successfully.');
      } else {
        setMediaError(data.error || 'Failed to delete media.');
      }
    } catch (err) {
      setMediaError('Failed to delete media.');
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleAddExternalMedia = async (e) => {
    e.preventDefault();
    if (!externalUrl) return;
    setAddingExternal(true);
    setMediaNotice('');
    setMediaError('');
    try {
      const res = await csrfFetch('/api/admin/media/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ file_url: externalUrl, file_name: externalName })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setExternalUrl('');
        setExternalName('');
        setMediaNotice(data.message || 'External media added.');
        fetchMedia();
      } else {
        setMediaError(data.error || 'Failed to add external media.');
      }
    } catch (err) {
      setMediaError('Failed to add external media.');
    } finally {
      setAddingExternal(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordNotice('');
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await csrfFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPasswordNotice(data.message || 'Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordError('Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Admin Panel...</div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--admin-bg)', color: 'var(--admin-text)', fontFamily: '"Sora", sans-serif' }}>
      <div style={{ width: '250px', background: 'var(--admin-sidebar-bg)', color: 'var(--admin-sidebar-text)', padding: '20px', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--admin-sidebar-text)', marginTop: 0 }}>Bloomway Admin</h2>
        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {['dashboard', 'pages', 'media', 'messages', 'admins', 'account'].map(tab => (
            <li 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              style={{ 
                padding: '12px 10px', 
                cursor: 'pointer', 
                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                background: activeTab === tab ? 'var(--admin-sidebar-active)' : 'transparent',
                textTransform: 'capitalize'
              }}>
              {tab === 'pages' ? 'Manage Pages' : tab === 'media' ? 'Media Assets' : tab === 'admins' ? 'Admin Users' : tab === 'account' ? 'Account' : tab} 
              {tab === 'messages' && ` (${messages.length})`}
            </li>
          ))}
          <li 
            style={{ padding: '12px 10px', cursor: 'pointer', color: '#ff6b6b', marginTop: '20px' }}
            onClick={async () => {
              let message = 'Logged out successfully.';
              try {
                const res = await csrfFetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
                const data = await res.json().catch(() => ({}));
                if (data && data.message) message = data.message;
              } catch (err) {
                message = 'Logged out successfully.';
              }
              navigate(`/admin/login?logout=1&message=${encodeURIComponent(message)}`);
            }}
          >
            Logout
          </li>
        </ul>
      </div>
      
      <div style={{ flex: 1, padding: activeTab === 'pages' ? '0' : '40px', overflowY: 'auto', color: 'var(--admin-text)' }}>
        {activeTab === 'dashboard' && (
          <div style={{ padding: '40px' }}>
            <h1 style={{ color: 'var(--admin-text)' }}>Welcome to the Admin Dashboard</h1>
            <p className="body-text" style={{ color: 'var(--admin-subtext)' }}>The CMS architecture is active. Navigate using the sidebar.</p>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div style={{ padding: '40px' }}>
            <h1 style={{ color: 'var(--admin-text)' }}>Contact Form Messages</h1>
            <p className="body-text" style={{ color: 'var(--admin-subtext)', marginBottom: '30px' }}>Viewing all submissions from the "Let's Connect" section.</p>
            {messageNotice && <div style={{ padding: '12px 15px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '15px' }}>{messageNotice}</div>}
            {messageError && <div style={{ padding: '12px 15px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '15px' }}>{messageError}</div>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {messages.length === 0 ? (
                <p>No messages yet.</p>
              ) : messages.map(msg => (
                <div key={msg.id} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: 'var(--admin-text)' }}>{msg.name}</h3>
                      <p style={{ margin: 0, color: 'var(--admin-subtext)', fontSize: '0.9rem' }}>
                        {msg.contact_method === 'email' ? `Email: ${msg.email}` : `Phone: ${msg.phone}`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-subtext)' }}>
                        {new Date(msg.created_at).toLocaleString()}
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: deletingId === msg.id ? 'not-allowed' : 'pointer',
                          background: '#ff6b6b',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}
                      >
                        {deletingId === msg.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--admin-border)', marginBottom: '15px' }} />
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMINS TAB */}
        {activeTab === 'admins' && (
          <div style={{ padding: '40px' }}>
            <h1 style={{ color: 'var(--admin-text)' }}>Admin Users</h1>
            <p className="body-text" style={{ color: 'var(--admin-subtext)', marginBottom: '30px' }}>Manage admin approvals and access.</p>
            {adminNotice && <div style={{ padding: '12px 15px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '15px' }}>{adminNotice}</div>}
            {adminError && <div style={{ padding: '12px 15px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '15px' }}>{adminError}</div>}

            {String(currentAdminEmail || '').toLowerCase() === 'info@bloomway.com' && (
              <form onSubmit={handleInviteAdmin} style={{ marginBottom: '20px', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', padding: '16px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="email"
                  placeholder="Invite admin by email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-surface-muted)', color: 'var(--admin-text)' }}
                />
                <button type="submit" disabled={inviting} style={{ padding: '10px 14px', border: 'none', borderRadius: '6px', background: 'var(--ink-900)', color: 'white', cursor: inviting ? 'not-allowed' : 'pointer' }}>
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {admins.length === 0 ? (
                <p>No admins found.</p>
              ) : admins.map(admin => {
                return (
                  <div key={admin.id} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', padding: '16px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--admin-text)' }}>
                        {admin.email}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--admin-subtext)' }}>
                        Created: {new Date(admin.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => handleApproveToggle(admin)}
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: admin.is_approved ? '#0ea5e9' : '#94a3b8',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}
                      >
                        {admin.is_approved ? 'Approved' : 'Not Approved'}
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        disabled={deletingAdminId === admin.id}
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: deletingAdminId === admin.id ? 'not-allowed' : 'pointer',
                          background: '#ff6b6b',
                          color: 'white',
                          fontSize: '0.8rem'
                        }}
                      >
                        {deletingAdminId === admin.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MEDIA ASSETS TAB */}
        {activeTab === 'media' && (
          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ color: 'var(--admin-text)', margin: 0 }}>Media Assets</h1>
                <p className="body-text" style={{ color: 'var(--admin-subtext)', margin: '5px 0 0 0' }}>Upload and manage website images.</p>
              </div>
              <div>
                {uploadsEnabled ? (
                  <label className="btn" style={{ cursor: 'pointer', background: 'var(--ink-900)', color: 'white' }}>
                    {uploading ? 'Uploading...' : 'Upload Image'}
                    <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" disabled={uploading} />
                  </label>
                ) : (
                  <div style={{ color: 'var(--admin-subtext)', fontSize: '0.9rem' }}>Uploads disabled</div>
                )}
              </div>
            </div>

            {mediaNotice && <div style={{ padding: '12px 15px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '15px' }}>{mediaNotice}</div>}
            {mediaError && <div style={{ padding: '12px 15px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '15px' }}>{mediaError}</div>}

            <form onSubmit={handleAddExternalMedia} style={{ marginBottom: '20px', background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', padding: '16px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'grid', gap: '10px' }}>
              <div style={{ fontWeight: 600, color: 'var(--admin-text)' }}>Add Image by URL (IONOS WebExplorer)</div>
              <input
                type="url"
                placeholder="https://yourdomain.com/uploads/image.webp"
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
                required
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-surface-muted)', color: 'var(--admin-text)' }}
              />
              <input
                type="text"
                placeholder="Optional display name"
                value={externalName}
                onChange={e => setExternalName(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--admin-border)', background: 'var(--admin-surface-muted)', color: 'var(--admin-text)' }}
              />
              <button type="submit" className="btn" style={{ width: 'fit-content' }} disabled={addingExternal}>
                {addingExternal ? 'Adding...' : 'Add External Image'}
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {media.map(asset => (
                <div key={asset.id} style={{ background: 'var(--admin-surface)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--admin-border)' }}>
                  <div style={{ height: '150px', background: 'var(--admin-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={asset.file_path} alt={asset.file_name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ padding: '10px' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--admin-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.file_name}</p>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: 'var(--admin-subtext)' }}>{(asset.size_bytes / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={() => handleDeleteMedia(asset.id)}
                      disabled={deletingMediaId === asset.id}
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: deletingMediaId === asset.id ? 'not-allowed' : 'pointer',
                        background: '#ff6b6b',
                        color: 'white',
                        fontSize: '0.8rem'
                      }}
                    >
                      {deletingMediaId === asset.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
              {media.length === 0 && <p>No media found.</p>}
            </div>
          </div>
        )}

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div style={{ padding: '40px', maxWidth: '600px' }}>
            <h1 style={{ color: 'var(--admin-text)' }}>Account</h1>
            <p className="body-text" style={{ color: 'var(--admin-subtext)', marginBottom: '30px' }}>Change your password.</p>
            <PasswordRules />

            {passwordNotice && <div style={{ padding: '12px 15px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', marginBottom: '15px' }}>{passwordNotice}</div>}
            {passwordError && <div style={{ padding: '12px 15px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '15px' }}>{passwordError}</div>}

            <form onSubmit={handleChangePassword}>
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                name="currentPassword"
                autoComplete="current-password"
              />
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
              <button type="submit" className="contact-form-submit" disabled={changingPassword}>
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* MANAGE PAGES TAB (WYSIWYG VISUAL EDITOR) */}
        {activeTab === 'pages' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
             <HomePage isEditing={true} />
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
