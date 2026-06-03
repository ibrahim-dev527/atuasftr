/* ============================================================
   script.js — Main Page JavaScript
   ATUAS Trip Registration System
   Developed by Ibrahim Mohammed Lotsu | Ibratech
   ============================================================ */

'use strict';

/* ── Page Loader ─────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('pageLoader');
  setTimeout(() => loader && loader.classList.add('gone'), 1400);
});

/* ── Particles ───────────────────────────────────────────── */
(function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const count = window.innerWidth < 768 ? 10 : 20;
  for (let i = 0; i < count; i++) {
    const pt = document.createElement('div');
    pt.className = 'pt';
    const size = Math.random() * 10 + 4;
    pt.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --dur: ${Math.random() * 10 + 8}s;
      --delay: ${Math.random() * 5}s;
    `;
    container.appendChild(pt);
  }
})();

/* ── Navbar Scroll Behaviour ─────────────────────────────── */
(function initNavbar() {
  const nav = document.getElementById('mainNav');
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navMenu');
  const navLinks  = document.querySelectorAll('.nav-link');

  // Sticky colour on scroll
  const onScroll = () => {
    nav && nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile hamburger
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });

    // Close on link click
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Active link on scroll
  const sections = ['home', 'register', 'about'];
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active',
        link.getAttribute('href') === '#' + current
      );
    });
  }, { passive: true });
})();

/* ── Scroll Reveal ───────────────────────────────────────── */
(function initReveal() {
  const els = document.querySelectorAll('.reveal-up, .reveal-fade, .reveal-left, .reveal-right');
  if (!els.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
})();

/* ── Form Validation & Submission ────────────────────────── */
(function initForm() {
  const form       = document.getElementById('regForm');
  const submitBtn  = document.getElementById('submitBtn');
  const alertBox   = document.getElementById('regAlert');

  if (!form) return;

  /* ── Helpers ── */
  const getVal  = id => document.getElementById(id).value.trim();
  const getRadio = name => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  };
  const setErr = (id, msg) => {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  };
  const clearErr = id => setErr(id, '');

  function showAlert(type, message) {
    if (!alertBox) return;
    alertBox.className = 'reg-alert ' + type;
    alertBox.innerHTML = message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (type === 'success') {
      setTimeout(() => {
        alertBox.classList.add('hidden');
      }, 8000);
    }
  }

  function hideAlert() {
    alertBox && alertBox.classList.add('hidden');
  }

  function setLoading(loading) {
    const def = submitBtn.querySelector('.s-default');
    const ldr = submitBtn.querySelector('.s-loading');
    submitBtn.disabled = loading;
    def.classList.toggle('hidden',  loading);
    ldr.classList.toggle('hidden', !loading);
  }

  /* ── Validate ── */
  function validate() {
    let valid = true;

    // Full Name
    clearErr('err_name');
    const name = getVal('f_name');
    if (!name) {
      setErr('err_name', 'Full name is required.'); valid = false;
    } else if (name.length < 3) {
      setErr('err_name', 'Please enter your full name.'); valid = false;
    }

    // Index Number
    clearErr('err_index');
    const idx = getVal('f_index');
    if (!idx) {
      setErr('err_index', 'Index number is required.'); valid = false;
    }

    // Phone
    clearErr('err_phone');
    const phone = getVal('f_phone');
    if (!phone) {
      setErr('err_phone', 'Contact number is required.'); valid = false;
    } else if (!/^[0-9+\s\-]{7,15}$/.test(phone)) {
      setErr('err_phone', 'Enter a valid phone number.'); valid = false;
    }

    // Gender
    clearErr('err_gender');
    if (!getRadio('gender')) {
      setErr('err_gender', 'Please select your gender.'); valid = false;
    }

    // Availability
    clearErr('err_avail');
    if (!getRadio('availability')) {
      setErr('err_avail', 'Please indicate your availability.'); valid = false;
    }

    return valid;
  }

  /* ── Submit ── */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert();

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        full_name:      getVal('f_name'),
        index_number:   getVal('f_index'),
        contact_number: getVal('f_phone'),
        gender:         getRadio('gender'),
        availability:   getRadio('availability'),
      };

      const { error } = await db
        .from('trip_registrations')
        .insert([payload]);

      if (error) throw error;

      showAlert('success',
        '🎉 <strong>Registration Successful!</strong> You have been registered for the ATUAS Trip to Tema Harbour. See you there!'
      );
      form.reset();

    } catch (err) {
      console.error('Supabase error:', err);
      showAlert('error',
        '⚠️ <strong>Submission Failed.</strong> ' +
        (err.message || 'Please check your connection and try again.')
      );
    } finally {
      setLoading(false);
    }
  });

  // Clear field errors on input
  ['f_name', 'f_index', 'f_phone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      const errId = 'err_' + id.split('_')[1];
      clearErr(errId);
    });
  });
})();