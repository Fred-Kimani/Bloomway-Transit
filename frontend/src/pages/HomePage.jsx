import React, { useState, useEffect } from 'react';
import { csrfFetch } from '../utils/csrf';

// --- CUSTOM TOGGLES ---
const ThemeToggle = ({ isDark, onToggle }) => (
  <div onClick={onToggle} style={{
    width: '80px', height: '34px', background: isDark ? '#293645' : '#e2e8f0',
    borderRadius: '17px', position: 'relative', cursor: 'pointer',
    boxShadow: isDark ? 'inset 3px 3px 6px rgba(0,0,0,0.4)' : 'inset 3px 3px 6px rgba(0,0,0,0.1)',
    display: 'flex', alignItems: 'center', transition: '0.3s', flexShrink: 0
  }}>
    <span style={{
      position: 'absolute', right: isDark ? '38px' : '12px',
      fontSize: '0.75rem', fontWeight: 'bold', color: isDark ? '#cbd5e1' : '#64748b',
      transition: '0.3s', pointerEvents: 'none', userSelect: 'none'
    }}>
      {isDark ? 'Dark' : 'Light'}
    </span>
    <div style={{
      width: '26px', height: '26px', background: isDark ? '#435667' : '#fff',
      borderRadius: '50%', position: 'absolute', top: '4px',
      left: isDark ? '50px' : '4px', transition: '0.3s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}></div>
  </div>
);

const MotionToggle = ({ reduce, onToggle }) => (
  <div onClick={onToggle} style={{
    width: '100px', height: '34px', background: reduce ? '#435667' : '#e2e8f0',
    borderRadius: '17px', position: 'relative', cursor: 'pointer',
    boxShadow: reduce ? 'inset 3px 3px 6px rgba(0,0,0,0.4)' : 'inset 3px 3px 6px rgba(0,0,0,0.1)',
    display: 'flex', alignItems: 'center', transition: '0.3s', flexShrink: 0,
    marginLeft: '12px' /* Pushed to the right from the Motion text */
  }}>
    <span style={{
      position: 'absolute', right: reduce ? '36px' : '10px',
      fontSize: '0.7rem', fontWeight: 'bold', color: reduce ? '#fff' : '#64748b',
      transition: '0.3s', pointerEvents: 'none', userSelect: 'none'
    }}>
      {reduce ? 'Reduced' : 'Full'}
    </span>
    <div style={{
      width: '26px', height: '26px', background: reduce ? '#e6b437' : '#fff',
      borderRadius: '50%', position: 'absolute', top: '4px',
      left: reduce ? '70px' : '4px', transition: '0.3s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}></div>
  </div>
);

// --- EDITABLE CMS WRAPPERS ---
const EditableText = ({ Component, className = '', block, fallback, isEditing, onEdit, ...props }) => {
  const contentValue = block ? (block.text_value || '') : fallback;
  if (!contentValue && !isEditing) return null;
  const safeContent = contentValue || '';
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(safeContent);
  const mergedStyle = { ...(props.style || {}), whiteSpace: 'pre-wrap' };

  if (!isEditing) {
    if (hasHtml) {
      return <Component className={className} {...props} dangerouslySetInnerHTML={{ __html: safeContent.replace(/\n/g, '<br/>') }}></Component>;
    }
    return <Component className={className} {...props} style={mergedStyle}>{safeContent}</Component>;
  }

  return (
    <div className={className} style={{ position: 'relative', display: 'block', paddingRight: '40px', marginBottom: '8px' }} {...props}>
      {hasHtml ? (
        <Component style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: safeContent.replace(/\n/g, '<br/>') }} />
      ) : (
        <Component style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{safeContent}</Component>
      )}
      <button onClick={() => block && onEdit(block)} title="Edit Text" style={{
        position: 'absolute', top: '50%', right: '0', transform: 'translateY(-50%)',
        background: '#e6b437', color: '#fff', border: 'none', borderRadius: '50%',
        width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', fontSize: '14px', zIndex: 10,
        visibility: block ? 'visible' : 'hidden'
      }}>✎</button>
    </div>
  );
};

const EditableImage = ({ className = '', block, fallback, alt, isEditing, onEdit, ...props }) => {
  const srcUrl = block ? (block.media_url || fallback) : fallback;
  if (!srcUrl) return null;

  if (!isEditing) {
    return <img src={srcUrl} alt={alt} className={className} {...props} />;
  }

  return (
    <div style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
      <img src={srcUrl} alt={alt} className={className} style={{ width: '100%', height: '100%' }} {...props} />
      <button onClick={() => block && onEdit(block)} title="Edit Image" style={{
        position: 'absolute', top: '15px', right: '15px',
        background: '#e6b437', color: '#fff', border: 'none', borderRadius: '50%',
        width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.3)', fontSize: '16px', zIndex: 10,
        visibility: block ? 'visible' : 'hidden'
      }}>📷</button>
    </div>
  );
};

// --- SLIDE LAYOUT WRAPPER ---
const SlideLayout = ({ id, imageBlock, fallbackImage, imagePosition, title, isEditing, onEdit, children }) => {
  const animClass = isEditing ? 'visible' : 'reveal-on-scroll';
  return (
    <section id={id} className="slide">
      <div className={`slide-content ${animClass}`}>
        <div className="image-panel">
          <EditableImage block={imageBlock} fallback={fallbackImage} alt={title} style={imagePosition ? { objectPosition: imagePosition } : {}} isEditing={isEditing} onEdit={onEdit} />
        </div>
        <div className="text-panel">
          {children}
        </div>
      </div>
    </section>
  );
};

// --- MAIN PAGE ---
function HomePage({ isEditing = false }) {
  const [content, setContent] = useState({});
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [menuOpen, setMenuOpen] = useState(false);
  const [contactMethod, setContactMethod] = useState('email');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [botHoneypot, setBotHoneypot] = useState('');
  const [contactStatus, setContactStatus] = useState(null);
  const [contactErrorMsg, setContactErrorMsg] = useState('');

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (botHoneypot) {
      setContactStatus('success');
      return;
    }
    if (contactMessage.length > 1000) return;

    setContactStatus('loading');
    try {
      const payload = {
        name: contactName,
        contactMethod,
        email: contactMethod === 'email' ? contactEmail : undefined,
        phone: contactMethod === 'phone' ? contactPhone : undefined,
        message: contactMessage
      };
      const res = await csrfFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setContactStatus('success');
        setContactName(''); setContactEmail(''); setContactPhone(''); setContactMessage('');
      } else {
        const errData = await res.json();
        setContactStatus('error');
        setContactErrorMsg(errData.error || 'Failed to send message.');
      }
    } catch (e) {
      setContactStatus('error');
      setContactErrorMsg('A network error occurred.');
    }
  };

  const fetchCMSData = async () => {
    try {
      const res = await csrfFetch('/api/pages');
      if (!res.ok) throw new Error('Failed to fetch pages');
      const data = await res.json();

      const homePage = data.find(p => p.slug === '/' || p.slug === 'home' || (p.title && p.title.toLowerCase() === 'home'));
      if (!homePage || !homePage.sections) return;

      const mapped = {};
      Object.keys(homePage.sections).forEach(sectionKey => {
        const section = homePage.sections[sectionKey];
        if (section.blocks) {
          Object.keys(section.blocks).forEach(blockKey => {
            mapped[`${sectionKey.toLowerCase()}.${blockKey}`] = section.blocks[blockKey];
          });
        }
      });
      setContent(mapped);
    } catch (e) { console.error('Failed to load CMS'); }
  };

  useEffect(() => {
    fetchCMSData();
    if (isEditing) {
      csrfFetch('/api/admin/media', { credentials: 'include' }).then(r => r.json()).then(setMediaLibrary);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            entry.target.classList.remove('visible');
          }
        });
      }, { threshold: 0.15 });
      elements.forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }
  }, [content, isEditing]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [prefersLessMotion, setPrefersLessMotion] = useState(() => {
    const saved = localStorage.getItem('reduceMotion');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (prefersLessMotion) document.body.classList.add('reduce-motion');
    else document.body.classList.remove('reduce-motion');
    localStorage.setItem('reduceMotion', JSON.stringify(prefersLessMotion));
  }, [prefersLessMotion]);

  const openEditModal = (block) => {
    setEditingBlock(block);
    setEditValue(block.content_type === 'image' ? (block.media_url || '') : (block.text_value || ''));
  };

  const handleSaveBlock = async () => {
    try {
      const bodyPayload = editingBlock.content_type === 'image'
        ? { media_asset_id: mediaLibrary.find(m => m.file_path === editValue)?.id || null }
        : { text_value: editValue };

      const res = await csrfFetch(`/api/admin/blocks/${editingBlock.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(bodyPayload)
      });
      if (res.ok) { setEditingBlock(null); fetchCMSData(); }
    } catch (e) { console.error(e); }
  };

  const hero = { heading: content['hero.heading'], lead: content['hero.lead'], body: content['hero.body'], image: content['hero.image'], eyebrow: content['hero.eyebrow'] };
  const about = { heading: content['about.heading'], body_main: content['about.body_main'], subhead_1: content['about.subhead_1'], body_1: content['about.body_1'], subhead_2: content['about.subhead_2'], body_2: content['about.body_2'], image: content['about.image'], eyebrow: content['about.eyebrow'] };
  const services = { heading: content['services.heading'], service_1_title: content['services.service_1_title'], service_1_body: content['services.service_1_body'], service_2_title: content['services.service_2_title'], service_2_body: content['services.service_2_body'], service_3_title: content['services.service_3_title'], service_3_body: content['services.service_3_body'], service_4_title: content['services.service_4_title'], service_4_body: content['services.service_4_body'], image: content['services.image'], eyebrow: content['services.eyebrow'] };

  const contactCMS = {
    wecare_image: content['contact.wecare_image'],
    wecare_heading: content['contact.wecare_heading'],
    wecare_body1: content['contact.wecare_body1'],
    wecare_body2: content['contact.wecare_body2'],
    connect_eyebrow: content['contact.connect_eyebrow'],
    connect_body: content['contact.connect_body']
  };

  const animClass = isEditing ? 'visible' : 'reveal-on-scroll';

  return (
    <>
      {/* Edit Modal Overlay */}
      {isEditing && editingBlock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#1b2633' }}>Edit Block: {editingBlock.block_key}</h3>
            {editingBlock.content_type === 'image' ? (
              <div>
                <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '6px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  {mediaLibrary.map(m => (
                    <img key={m.id} src={m.file_path} alt="Library" style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer', border: editValue === m.file_path ? '3px solid #e6b437' : '1px solid #eee' }} onClick={() => setEditValue(m.file_path)} />
                  ))}
                </div>
              </div>
            ) : <textarea value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: '100%', minHeight: '200px', padding: '15px', marginBottom: '20px', borderRadius: '6px' }} />}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingBlock(null)} style={{ padding: '10px 20px', background: '#eee', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveBlock} style={{ padding: '10px 20px', background: '#e6b437', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative Orbs */}
      <div className="bg-orb orb-one"></div>
      <div className="bg-orb orb-two"></div>

      {/* Navigation */}
      <button className={`menu-btn ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>

      <div className={`menu-overlay ${menuOpen ? 'active' : ''}`}>
        <div className="menu-header">
          <img src="/bloomwaylogo.png" alt="Bloomway Logo" style={{ width: '120px', height: '120px' }} />
        </div>
        <div className="menu-links">
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ fontFamily: 'Sora', fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink-700)' }}>Theme</span>
              <ThemeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Sora', fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink-700)' }}>Motion</span>
              <MotionToggle reduce={prefersLessMotion} onToggle={() => setPrefersLessMotion(!prefersLessMotion)} />
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <SlideLayout id="home" imageBlock={hero.image} fallbackImage="/bloomwaylogo.png" imagePosition="center" title="Home" isEditing={isEditing} onEdit={openEditModal}>
          <EditableText Component="p" className="eyebrow" block={hero.eyebrow} fallback="Bloomway Transit" isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="h1" block={hero.heading} fallback="Delivering what matters most." isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="p" className="lead" block={hero.lead} fallback="Secure deliveries and peace of mind." isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="p" className="body-text" block={hero.body} fallback="We go beyond traditional courier services by creating a seamless, dependable experience that prioritizes both patient well-being and healthcare efficiency." isEditing={isEditing} onEdit={openEditModal} />
          <a href="#services" className="btn">Explore Services</a>
        </SlideLayout>

        <SlideLayout id="about" imageBlock={about.image} fallbackImage="/shelfstocking.jpg" title="About Us" isEditing={isEditing} onEdit={openEditModal}>
          <EditableText Component="p" className="eyebrow" block={about.eyebrow} fallback="About Bloomway" isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="h2" block={about.heading} fallback="About Us" isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="p" className="body-text" block={about.body_main} fallback="Bloomway Transit is a medical courier company inspired by real experiences in healthcare and caregiving. From urgent blood deliveries that saved lives to moments when missing a prescription nearly put a patient at risk, we’ve seen how critical reliable logistics are. With a focus on precision and professionalism, we specialize in delivering lab specimens, prescriptions, medical supplies, and other essential healthcare items. Every delivery is handled with care and urgency, because in healthcare, reliability isn’t just important — it can make all the difference." isEditing={isEditing} onEdit={openEditModal} />

          {/* Stacked Content - Removing the artificial 2-column layout hallucinated earlier */}
          <EditableText Component="h3" block={about.subhead_1} fallback="Statement of Purpose" isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="p" className="body-text" block={about.body_1} fallback="At Bloomway Transit, our purpose is to build trust and deliver peace of mind through every delivery. By providing secure and reliable medical courier services, we strive to exceed expectations and ensure that every shipment supports better patient care." isEditing={isEditing} onEdit={openEditModal} />

          <EditableText Component="h3" block={about.subhead_2} fallback="Vision" isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="p" className="body-text" block={about.body_2} fallback="Guided by this purpose, our vision is to create a future where every delivery fulfills that promise — ensuring vital medical items reach their destination safely and on time. We aim to be the trusted courier partner healthcare providers and communities rely on." isEditing={isEditing} onEdit={openEditModal} />
        </SlideLayout>

        <SlideLayout id="services" imageBlock={services.image} fallbackImage="/truckloading.jpeg" imagePosition="top center" title="Services" isEditing={isEditing} onEdit={openEditModal}>
          <EditableText Component="p" className="eyebrow" block={services.eyebrow} fallback="Services" isEditing={isEditing} onEdit={openEditModal} />
          <EditableText Component="h2" block={services.heading} fallback="Flexible coverage." isEditing={isEditing} onEdit={openEditModal} />
          <ul className="services-list">
            <li>
              <EditableText Component="strong" block={services.service_1_title} fallback="Medical Courier Services" isEditing={isEditing} onEdit={openEditModal} />
              <EditableText Component="p" block={services.service_1_body} fallback="Fast, secure delivery of medical supplies, lab work, prescriptions, and equipment. We ensure every item reaches its destination safely and on time, handled with the care healthcare providers expect." isEditing={isEditing} onEdit={openEditModal} />
            </li>
            <li>
              <EditableText Component="strong" block={services.service_2_title} fallback="Logistics Coordination" isEditing={isEditing} onEdit={openEditModal} />
              <EditableText Component="p" block={services.service_2_body} fallback="With smart scheduling and optimized routes, we make sure lab specimens, prescriptions, and medical supplies are delivered on time, every time. From dispatch to delivery, we focus on efficiency so providers and patients can focus on care." isEditing={isEditing} onEdit={openEditModal} />
            </li>
            <li>
              <EditableText Component="strong" block={services.service_3_title} fallback="Specialized Transport Solutions" isEditing={isEditing} onEdit={openEditModal} />
              <EditableText Component="p" block={services.service_3_body} fallback="Custom solutions for unique needs, including temperature-sensitive deliveries and fragile medical equipment. Whatever the challenge, Bloomway Transit adapts to deliver with precision and care." isEditing={isEditing} onEdit={openEditModal} />
            </li>
            <li>
              <EditableText Component="strong" block={services.service_4_title} fallback="On-Demand Services" isEditing={isEditing} onEdit={openEditModal} />
              <EditableText Component="p" block={services.service_4_body} fallback="Flexible and responsive on-demand services for urgent medical transport needs, providing quick and reliable solutions to support healthcare providers and patients in critical situations." isEditing={isEditing} onEdit={openEditModal} />
            </li>
          </ul>
        </SlideLayout>

        {/* Let's Connect Session 1 - We Care */}
        <section id="contact-intro" className="slide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={animClass} style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px' }}>
            <EditableImage block={contactCMS.wecare_image} fallback="/wecare.jpeg" alt="We Care" style={{ maxWidth: '300px', width: '100%', height: 'auto', marginBottom: '2rem' }} isEditing={isEditing} onEdit={openEditModal} />
            <EditableText Component="h2" block={contactCMS.wecare_heading} fallback="Beyond Delivery, we care" isEditing={isEditing} onEdit={openEditModal} />
            <EditableText Component="p" className="body-text" style={{ textAlign: 'center' }} block={contactCMS.wecare_body1} fallback="At Bloomway Transit, we believe every delivery is more than just logistics — it’s a promise kept. With precision, care, and reliability at our core, we combine professionalism with compassion to serve healthcare providers and communities." isEditing={isEditing} onEdit={openEditModal} />
            <EditableText Component="p" className="body-text" style={{ textAlign: 'center' }} block={contactCMS.wecare_body2} fallback="We go beyond traditional courier services by creating a seamless, dependable experience that prioritizes both patient well-being and healthcare efficiency. Our commitment is simple: to be a trusted partner in medical logistics, delivering peace of mind one delivery at a time." isEditing={isEditing} onEdit={openEditModal} />
          </div>
        </section>

        {/* Let's Connect Session 2 - Contact Form */}
        <section id="contact" className="slide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={animClass} style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '40px 20px' }}>
            <div className="contact-grid" style={{ gap: '4rem', paddingTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <div className="contact-info-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <EditableText Component="p" className="eyebrow" style={{ marginBottom: '1.5rem', textAlign: 'left' }} block={contactCMS.connect_eyebrow} fallback="Let's Connect" isEditing={isEditing} onEdit={openEditModal} />
                <div className="contact-info" style={{ textAlign: 'left', width: '100%' }}>
                  <div>
                    <EditableText Component="p" style={{ fontSize: '1rem', color: 'var(--slate)', marginBottom: '12px' }} block={contactCMS.connect_body} fallback="We’d love to hear from you. Whether you have a question, need a quote, or want to discuss a partnership, our team is here to help. At Bloomway Transit, your convenience and peace of mind come first." isEditing={isEditing} onEdit={openEditModal} />
                  </div>
                  <div>
                    <h4>Email</h4>
                    <p>✉️ info@bloomwaytransit.com</p>
                  </div>
                  <div>
                    <p>On-Call Support: 24/7 for urgent healthcare deliveries</p>
                  </div>
                </div>
                <a href="mailto:info@bloomwaytransit.com" className="btn contact-btn" style={{ marginTop: '30px', backgroundColor: '#2F9FD9' }}>Message us</a>
              </div>

              <div className="contact-form-container">
                <h2 className="contact-form-title">Contact Us</h2>
                <hr className="contact-form-divider" />
                <form onSubmit={handleContactSubmit}>
                  {/* Invisible Honeypot Field */}
                  <input type="text" name="website_url" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" value={botHoneypot} onChange={(e) => setBotHoneypot(e.target.value)} />

                  {contactStatus === 'success' && <div style={{ padding: '15px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', marginBottom: '20px' }}>Your message has been sent successfully!</div>}
                  {contactStatus === 'error' && <div style={{ padding: '15px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '20px' }}>{contactErrorMsg}</div>}

                  <div className="contact-form-group">
                    <label htmlFor="name" className="contact-form-label">Name</label>
                    <input type="text" id="name" className="contact-form-input" placeholder="Name" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </div>
                  <div className="contact-form-group">
                    <label htmlFor="method" className="contact-form-label">Preferred Contact Method</label>
                    <select
                      id="method"
                      className="contact-form-input"
                      value={contactMethod}
                      onChange={(e) => setContactMethod(e.target.value)}
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone Number</option>
                    </select>
                  </div>
                  {contactMethod === 'email' ? (
                    <div className="contact-form-group">
                      <label htmlFor="email" className="contact-form-label">E-mail</label>
                      <input type="email" id="email" className="contact-form-input" placeholder="E-mail" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                  ) : (
                    <div className="contact-form-group">
                      <label htmlFor="phone" className="contact-form-label">Phone Number</label>
                      <input type="tel" id="phone" className="contact-form-input" placeholder="Phone Number" required pattern="[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}" title="Please enter a valid phone number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                    </div>
                  )}
                  <div className="contact-form-group">
                    <label htmlFor="message" className="contact-form-label">Message</label>
                    <textarea id="message" className="contact-form-textarea" placeholder="Message" required value={contactMessage} onChange={(e) => setContactMessage(e.target.value)}></textarea>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '5px', color: contactMessage.length > 1000 ? 'red' : '#64748b' }}>
                      {contactMessage.length} / 1000
                    </div>
                  </div>
                  <button type="submit" className="contact-form-submit" disabled={contactStatus === 'loading'}>
                    {contactStatus === 'loading' ? 'Sending...' : 'Submit'}
                  </button>
                </form>
              </div>
            </div>

            <div className="footer-text" style={{ marginTop: '50px', textAlign: 'center' }}>
              <p>© {new Date().getFullYear()} Bloomway Transit. By fkdevelopments</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default HomePage;
