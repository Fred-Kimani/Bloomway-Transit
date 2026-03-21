import React, { useState, useEffect } from "react";

const SlideLayout = ({ id, image, imagePosition, title, children }) => {
  return (
    <section id={id} className="slide">
      <div className="slide-content reveal-on-scroll">
        <div className="image-panel">
          <img src={image} alt={title} style={imagePosition ? { objectPosition: imagePosition } : {}} />
        </div>
        <div className="text-panel">
          {children}
        </div>
      </div>
    </section>
  );
};

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactMethod, setContactMethod] = useState('email');

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          } else {
            // Remove to allow fade in/out effect when scrolling back and forth
            entry.target.classList.remove('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="bg-orb orb-one"></div>
      <div className="bg-orb orb-two"></div>

      <button
        className={`menu-btn ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
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
        </div>
      </div>

      <div className="main-content">
        <SlideLayout id="home" image="/bloomwaylogo.png" imagePosition="center" title="Home">
          <p className="eyebrow">Bloomway Transit</p>
          <h1>Delivering what matters most.</h1>
          <p className="lead">Secure deliveries and peace of mind.</p>
          <p className="body-text">We go beyond traditional courier services by creating a seamless, dependable experience that prioritizes both patient well-being and healthcare efficiency.</p>
          <a href="#services" className="btn">Explore Services</a>
        </SlideLayout>

        <SlideLayout id="about" image="/shelfstocking.jpg" title="About Us">
          <p className="eyebrow">About Bloomway</p>
          <h2>About Us</h2>
          <p className="body-text">Bloomway Transit is a medical courier company inspired by real experiences in healthcare and caregiving. From urgent blood deliveries that saved lives to moments when missing a prescription nearly put a patient at risk, we’ve seen how critical reliable logistics are. With a focus on precision and professionalism, we specialize in delivering lab specimens, prescriptions, medical supplies, and other essential healthcare items. Every delivery is handled with care and urgency, because in healthcare, reliability isn’t just important — it can make all the difference.</p>
          <h3>Statement of Purpose</h3>
          <p className="body-text">At Bloomway Transit, our purpose is to build trust and deliver peace of mind through every delivery. By providing secure and reliable medical courier services, we strive to exceed expectations and ensure that every shipment supports better patient care.</p>
          <h3>Vision</h3>
          <p className="body-text">Guided by this purpose, our vision is to create a future where every delivery fulfills that promise — ensuring vital medical items reach their destination safely and on time. We aim to be the trusted courier partner healthcare providers and communities rely on.</p>
        </SlideLayout>

        <SlideLayout id="services" image="/truckloading.jpeg" imagePosition="top center" title="Services">
          <p className="eyebrow">Services</p>
          <h2>Flexible coverage.</h2>
          <ul className="services-list">
            <li>
              <strong>Medical Courier Services</strong>
              <p>Fast, secure delivery of medical supplies, lab work, prescriptions, and equipment. We ensure every item reaches its destination safely and on time, handled with the care healthcare providers expect.</p>
            </li>
            <li>
              <strong>Logistics Coordination</strong>
              <p>With smart scheduling and optimized routes, we make sure lab specimens, prescriptions, and medical supplies are delivered on time, every time. From dispatch to delivery, we focus on efficiency so providers and patients can focus on care.</p>
            </li>
            <li>
              <strong>Specialized Transport Solutions</strong>
              <p>Custom solutions for unique needs, including temperature-sensitive deliveries and fragile medical equipment. Whatever the challenge, Bloomway Transit adapts to deliver with precision and care.</p>
            </li>
            <li>
              <strong>On-Demand Services</strong>
              <p>Flexible and responsive on-demand services for urgent medical transport needs, providing quick and reliable solutions to support healthcare providers and patients in critical situations.</p>
            </li>
          </ul>
        </SlideLayout>

        <section id="contact" className="slide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="reveal-on-scroll" style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px' }}>

            <img src="/wecare.jpeg" alt="We Care" style={{ maxWidth: '300px', width: '100%', height: 'auto', marginBottom: '2rem' }} />


            <h2>Beyond Delivery, we care</h2>
            <p className="body-text" style={{ textAlign: 'center' }}>At Bloomway Transit, we believe every delivery is more than just logistics — it’s a promise kept. With precision, care, and reliability at our core, we combine professionalism with compassion to serve healthcare providers and communities.</p>
            <p className="body-text" style={{ textAlign: 'center' }}>We go beyond traditional courier services by creating a seamless, dependable experience that prioritizes both patient well-being and healthcare efficiency. Our commitment is simple: to be a trusted partner in medical logistics, delivering peace of mind one delivery at a time.</p>
          </div>
        </section>

        <section id="contact" className="slide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="reveal-on-scroll" style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '40px 20px' }}>

            <div className="contact-grid" style={{ gap: '4rem', paddingTop: '2rem' }}>
              <div className="contact-info-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p className="eyebrow" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>Let's Connect</p>
                <div className="contact-info" style={{ textAlign: 'left', width: '100%' }}>
                  <div>
                    <p style={{ fontSize: '1rem', color: 'var(--slate)', marginBottom: '12px' }}>We’d love to hear from you. Whether you have a question, need a quote, or want to discuss a partnership, our team is here to help. At Bloomway Transit, your convenience and peace of mind come first.</p>
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

                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="contact-form-group">
                    <label htmlFor="name" className="contact-form-label">Name</label>
                    <input type="text" id="name" className="contact-form-input" placeholder="Name" required />
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
                      <input type="email" id="email" className="contact-form-input" placeholder="E-mail" required />
                    </div>
                  ) : (
                    <div className="contact-form-group">
                      <label htmlFor="phone" className="contact-form-label">Phone Number</label>
                      <input type="tel" id="phone" className="contact-form-input" placeholder="Phone Number" required pattern="[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}" title="Please enter a valid phone number" />
                    </div>
                  )}

                  <div className="contact-form-group">
                    <label htmlFor="message" className="contact-form-label">Message</label>
                    <textarea id="message" className="contact-form-textarea" placeholder="Message"></textarea>
                  </div>

                  <button type="submit" className="contact-form-submit">Submit</button>
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

export default App;
