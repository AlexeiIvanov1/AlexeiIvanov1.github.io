/* ═══════════════════════════════════════════════════════════════
   ALEXEI IVANOV — script.js
   Handles: nav scroll state, mobile menu, scroll reveal,
            smooth section transitions, staggered card reveals
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── NAV SCROLL STATE ─────────────────────────────────────── */
  const nav = document.getElementById('nav');

  function updateNav() {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ── MOBILE MENU ──────────────────────────────────────────── */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-label', 'Open menu');
  }

  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  /* ── SMOOTH SCROLL FOR NAV LINKS ──────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--nav-h')) || 68;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ── INTERSECTION OBSERVER — SCROLL REVEAL ────────────────── */
  const revealEls = document.querySelectorAll('.reveal');

  // Stagger delay for sibling cards within the same parent
  const STAGGER_PARENTS = [
    '.about__stats',
    '.timeline',
    '.competency-groups',
    '.achievement-grid',
    '.contact__cards',
  ];

  STAGGER_PARENTS.forEach(function (selector) {
    const parent = document.querySelector(selector);
    if (!parent) return;
    const children = parent.querySelectorAll('.reveal');
    children.forEach(function (child, i) {
      child.style.transitionDelay = (i * 90) + 'ms';
    });
  });

  const revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealEls.forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ── ACTIVE NAV LINK HIGHLIGHTING ────────────────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav__links a[href^="#"]');

  function setActiveLink() {
    let current = '';
    const scrollY = window.scrollY + 120;

    sections.forEach(function (section) {
      if (scrollY >= section.offsetTop) {
        current = '#' + section.id;
      }
    });

    navLinks.forEach(function (link) {
      link.style.color = '';
      if (link.getAttribute('href') === current) {
        link.style.color = 'var(--text-primary)';
      }
    });
  }

  window.addEventListener('scroll', setActiveLink, { passive: true });
  setActiveLink();

  /* ── HERO REVEAL ON LOAD ──────────────────────────────────── */
  window.addEventListener('DOMContentLoaded', function () {
    const heroContent = document.querySelector('.hero__content');
    if (heroContent) {
      // Small delay to let fonts paint
      setTimeout(function () {
        heroContent.classList.add('visible');
      }, 100);
    }
  });

  /* ── SUBTLE HERO GEO PARALLAX ─────────────────────────────── */
  const heroGeo = document.querySelector('.hero__geo');

  if (heroGeo && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    let ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          const scrolled = window.scrollY;
          if (scrolled < window.innerHeight) {
            heroGeo.style.transform =
              'translate(-50%, calc(-50% + ' + (scrolled * 0.18) + 'px))';
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

})();
