/* ===================================================
   MOCHAN LABS — Main JavaScript
   ===================================================

   SETUP EmailJS (to receive contact form emails):
   1. Go to https://www.emailjs.com/ and create a free account
   2. Add a Gmail service (connect your mochanlabs@gmail.com)

   TEMPLATE 1 - Admin Email (receives user message):
   Variables: {{from_name}}, {{from_email}}, {{phone}},
   {{service}}, {{subject}}, {{message}}, {{to_email}}

   TEMPLATE 2 - Auto-Reply Email (sent to user):
   Variables: {{to_email}}, {{to_name}}, {{from_email}}, {{from_name}}

   3. Replace the four placeholders below with your IDs
   --------------------------------------------------- */
const EMAILJS_SERVICE_ID        = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID       = 'YOUR_ADMIN_TEMPLATE_ID';
const EMAILJS_AUTO_REPLY_ID     = 'YOUR_AUTO_REPLY_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY        = 'YOUR_PUBLIC_KEY';

// Replace this with your actual WhatsApp number (with country code, no +)
// Example: '919876543210' for India
const WA_NUMBER = '919876543210';

(function () {
  'use strict';

  /* ===== Init EmailJS ===== */
  if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  /* ===== Update WhatsApp links dynamically ===== */
  document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
    link.href = `https://wa.me/${WA_NUMBER}`;
  });

  /* ===== Navbar scroll behaviour ===== */
  const navbar     = document.getElementById('navbar');
  const backToTop  = document.getElementById('backToTop');

  function onScroll() {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 50);
    backToTop.classList.toggle('visible', y > 500);
    highlightNav();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* ===== Mobile hamburger ===== */
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  /* ===== Highlight active nav link ===== */
  function highlightNav() {
    const sections = document.querySelectorAll('section[id]');
    const links    = document.querySelectorAll('.nav-links a');
    let active = '';

    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 100) {
        active = sec.id;
      }
    });

    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${active}`);
    });
  }

  /* ===== Back to top ===== */
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ===== Counter animation ===== */
  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = 'true';
    const target   = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const start    = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }

  /* ===== Scroll reveal + counter trigger ===== */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      const delay = parseInt(entry.target.dataset.delay || '0', 10);
      setTimeout(() => entry.target.classList.add('visible'), delay);
      entry.target.querySelectorAll('.counter').forEach(runCounter);
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('[data-aos]').forEach((el, i) => {
    el.dataset.delay = (i % 3) * 90;
    revealObserver.observe(el);
  });

  /* Counters inside hero (not data-aos wrapped) */
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    const heroObs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.counter').forEach(runCounter);
      heroObs.unobserve(entry.target);
    }, { threshold: 0.5 });
    heroObs.observe(heroStats);
  }

  /* ===== Contact form ===== */
  const form      = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText   = document.getElementById('btnText');
  const alertBox  = document.getElementById('formAlert');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    /* Basic validation */
    const required = ['name', 'email', 'subject', 'message'];
    let valid = true;
    required.forEach(id => {
      const el = document.getElementById(id);
      if (!el.value.trim()) { el.style.borderColor = '#f87171'; valid = false; }
      else el.style.borderColor = '';
    });
    if (!valid) {
      showAlert('error', 'Please fill in all required fields.');
      return;
    }

    /* Loading state */
    submitBtn.disabled = true;
    btnText.textContent = 'Sending…';
    submitBtn.style.opacity = '0.75';

    const params = {
      from_name:  document.getElementById('name').value.trim(),
      from_email: document.getElementById('email').value.trim(),
      phone:      document.getElementById('phone').value.trim() || 'Not provided',
      service:    document.getElementById('service').value || 'Not specified',
      subject:    document.getElementById('subject').value.trim(),
      message:    document.getElementById('message').value.trim(),
      to_email:   'info@mochanlabs.com',
    };

    try {
      if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
        /* Demo mode — simulate sending */
        await delay(1400);
        showAlert('success', '✓ Message received! We\'ll get back to you within 24 hours.');
      } else {
        /* Send message to admin */
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);

        /* Send auto-reply to user (if auto-reply template is configured) */
        if (EMAILJS_AUTO_REPLY_ID !== 'YOUR_AUTO_REPLY_TEMPLATE_ID') {
          const autoReplyParams = {
            to_email: params.from_email,
            to_name: params.from_name,
            from_email: 'info@mochanlabs.com',
            from_name: 'Mochan Labs'
          };

          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_AUTO_REPLY_ID, autoReplyParams);
        }

        showAlert('success', '✓ Message sent! We\'ll get back to you within 24 hours.');
      }
      form.reset();
    } catch (err) {
      showAlert('error', '✗ Could not send. Please email us at mochanlabs@gmail.com or WhatsApp us.');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Send Message';
      submitBtn.style.opacity = '1';
    }
  });

  /* Clear red border on input */
  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => { el.style.borderColor = ''; });
  });

  function showAlert(type, msg) {
    alertBox.className = `form-alert ${type}`;
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => { alertBox.style.display = 'none'; }, 7000);
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

})();
