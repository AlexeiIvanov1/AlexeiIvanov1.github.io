/* ═══════════════════════════════════════════════════════════════
   EFFECTS-V2.JS  —  Dynamic visual layer for index-v2.html
   Neural canvas · Text scramble · Counter animation · Ticker
   Metric bars · Nav · Reveal · Active link · Parallax
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const raf = cb => requestAnimationFrame(cb);

/* ─── NAV ──────────────────────────────────────────────────────── */
function initNav() {
  const nav        = $('#nav');
  const hamburger  = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  hamburger?.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
  });

  $$('.mobile-link').forEach(link =>
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    })
  );

  /* close mobile menu on outside click */
  document.addEventListener('click', e => {
    if (!hamburger.classList.contains('open')) return;
    if (e.target.closest('#mobileMenu') || e.target.closest('#hamburger')) return;
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
  });

  /* smooth scroll */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--nav-h')) || 68;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    });
  });
}

/* ─── SCROLL REVEAL ────────────────────────────────────────────── */
function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('visible');
      obs.unobserve(target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal').forEach(el => obs.observe(el));

  /* stagger children */
  ['.about__stats', '.timeline', '.competency-groups',
   '.achievement-grid', '.contact__cards'].forEach(sel => {
    $$(sel + ' .reveal').forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.09}s`;
    });
  });

  /* hero entry */
  setTimeout(() => $('#hero .hero__content')?.classList.add('visible'), 250);
}

/* ─── ACTIVE NAV LINK ──────────────────────────────────────────── */
function initActiveNav() {
  const links  = $$('.nav__links a');
  const offset = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--nav-h')) || 68;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.remove('active'));
      document.querySelector(`.nav__links a[href="#${e.target.id}"]`)
        ?.classList.add('active');
    });
  }, { rootMargin: `-${offset}px 0px -55% 0px` });

  $$('section[id]').forEach(s => obs.observe(s));
}

/* ─── NEURAL CANVAS ────────────────────────────────────────────── */
class NeuralCanvas {
  constructor(id) {
    this.canvas = document.getElementById(id);
    if (!this.canvas) return;
    this.ctx    = this.canvas.getContext('2d');
    this.nodes  = [];
    this.sigs   = [];           /* live signals */
    this.mouse  = { x: -9999, y: -9999 };
    this.alive  = true;
    this.nextSig = 0;
    this.sigGap  = 2000;

    this._resize();
    this._spawn();
    this._bind();
    raf(this._tick.bind(this));
  }

  /* ── setup ── */
  _resize() {
    const hero = this.canvas.closest('.hero') || this.canvas.parentElement;
    this.W = this.canvas.width  = hero.offsetWidth;
    this.H = this.canvas.height = hero.offsetHeight;
  }

  _spawn() {
    this.nodes = [];
    const LABELS = [
      'AI Adoption','Digital','ERP','Cloud','Governance',
      'Cybersecurity','Roadmap','Compliance','BCP / DR','Transformation',
      'Analytics','Budget ROI','C-Suite','ITIL','Risk Mgmt',
      'Copilot','D365','Azure','KPIs','Audit',
      'Strategy','Delivery','SLA','Innovation','Vendor Mgmt',
    ];
    /* density: 1 node per ~5 500px² capped at 160 */
    const n = Math.min(Math.round(this.W * this.H / 5500), 160);

    /* shuffle labels so gold nodes get a varied spread */
    const shuffled = [...LABELS].sort(() => Math.random() - .5);
    let labelIdx = 0;

    for (let i = 0; i < n; i++) {
      const gold = Math.random() < 0.09;
      this.nodes.push({
        x  : Math.random() * this.W,
        y  : Math.random() * this.H,
        vx : (Math.random() - .5) * .22,
        vy : (Math.random() - .5) * .22,
        bvx: (Math.random() - .5) * .22,   /* base velocity */
        bvy: (Math.random() - .5) * .22,
        r  : gold ? 2.8 + Math.random() * .8 : .7 + Math.random() * 1.3,
        gold,
        label : gold ? shuffled[labelIdx++ % shuffled.length] : null,
        alpha : gold ? .78 : .14 + Math.random() * .28,
        phi   : Math.random() * Math.PI * 2,  /* phase offset */
      });
    }
  }

  _bind() {
    window.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    }, { passive: true });

    window.addEventListener('resize', () => {
      this._resize();
      this._spawn();
    }, { passive: true });
  }

  /* ── fire a signal between two nearby nodes ── */
  _fire() {
    if (this.nodes.length < 2) return;
    const goldPool = this.nodes.filter(n => n.gold);
    const fromArr  = goldPool.length && Math.random() < .5 ? goldPool : this.nodes;
    const from     = fromArr[Math.floor(Math.random() * fromArr.length)];
    const near     = this.nodes.filter(n =>
      n !== from && Math.hypot(n.x - from.x, n.y - from.y) < 155
    );
    if (!near.length) return;
    const to = near[Math.floor(Math.random() * near.length)];
    this.sigs.push({ from, to, t: 0, spd: .008 + Math.random() * .012,
                     gold: from.gold || to.gold, trail: [] });
  }

  /* ── main animation loop ── */
  _tick(now) {
    if (!this.alive) return;
    const { ctx, W, H } = this;
    const sec = now * .001;

    ctx.clearRect(0, 0, W, H);

    /* auto-fire */
    if (now > this.nextSig) {
      this._fire();
      this.nextSig = now + this.sigGap;
      this.sigGap  = 1400 + Math.random() * 2200;
    }

    /* update nodes */
    this.nodes.forEach(nd => {
      /* mouse repulsion */
      const dx = nd.x - this.mouse.x;
      const dy = nd.y - this.mouse.y;
      const md = Math.hypot(dx, dy);
      if (md < 100 && md > 0) {
        const f = (100 - md) / 100 * .025;
        nd.vx += (dx / md) * f;
        nd.vy += (dy / md) * f;
      }
      /* drift back to base velocity */
      nd.vx += (nd.bvx - nd.vx) * .025;
      nd.vy += (nd.bvy - nd.vy) * .025;
      /* sinusoidal wiggle */
      nd.x += nd.vx + Math.sin(sec * .9 + nd.phi) * .055;
      nd.y += nd.vy + Math.cos(sec * .7 + nd.phi) * .055;
      /* wrap edges */
      if (nd.x < -35) nd.x = W + 35;
      if (nd.x > W+35) nd.x = -35;
      if (nd.y < -35) nd.y = H + 35;
      if (nd.y > H+35) nd.y = -35;
    });

    /* ── draw connections ── */
    const CONN = 145;
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b  = this.nodes[j];
        const d  = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > CONN) continue;
        const frac = 1 - d / CONN;
        const isG  = a.gold || b.gold;
        ctx.beginPath();
        ctx.strokeStyle = isG
          ? `rgba(212,175,55,${(frac * frac) * .28})`
          : `rgba(14,165,233,${(frac * frac) * .13})`;
        ctx.lineWidth = isG ? .85 : .5;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    /* ── draw nodes ── */
    this.nodes.forEach(nd => {
      const pulse = Math.sin(sec * 1.6 + nd.phi) * .1 + .9;
      const a = nd.alpha * pulse;

      if (nd.gold) {
        /* soft halo */
        const g = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, 12);
        g.addColorStop(0, 'rgba(212,175,55,.48)');
        g.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
      ctx.fillStyle = nd.gold
        ? `rgba(212,175,55,${a})`
        : `rgba(14,165,233,${a})`;
      ctx.fill();

      if (nd.label) {
        ctx.font = '9px "JetBrains Mono","Courier New",monospace';
        ctx.fillStyle = `rgba(212,175,55,${a * .65})`;
        ctx.fillText(nd.label, nd.x + nd.r + 4, nd.y + 3);
      }
    });

    /* ── draw signals ── */
    this.sigs = this.sigs.filter(sig => {
      sig.t += sig.spd;
      if (sig.t >= 1) return false;

      const x = sig.from.x + (sig.to.x - sig.from.x) * sig.t;
      const y = sig.from.y + (sig.to.y - sig.from.y) * sig.t;
      sig.trail.push({ x, y });
      if (sig.trail.length > 10) sig.trail.shift();

      /* trail */
      sig.trail.forEach((pt, i) => {
        const ta = (i / sig.trail.length) * .55;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, sig.gold ? 1.6 : 1.2, 0, Math.PI * 2);
        ctx.fillStyle = sig.gold
          ? `rgba(212,175,55,${ta})`
          : `rgba(14,165,233,${ta})`;
        ctx.fill();
      });

      /* head glow */
      const R = sig.gold ? 6 : 4.5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      const c = sig.gold ? '212,175,55' : '14,165,233';
      g.addColorStop(0,   `rgba(${c},.95)`);
      g.addColorStop(.45, `rgba(${c},.55)`);
      g.addColorStop(1,   `rgba(${c},0)`);
      ctx.beginPath();
      ctx.arc(x, y, R, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      return true;
    });

    raf(this._tick.bind(this));
  }

  destroy() {
    this.alive = false;
  }
}

/* ─── TEXT SCRAMBLE ────────────────────────────────────────────── */
class TextScramble {
  constructor(el) {
    this.el    = el;
    this.chars = '!<>_\\/[]{}—=+*?#01│▒░';
    this._raf  = null;
  }

  run(text, delay = 0) {
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      this.queue = text.split('').map((ch, i) => ({
        to   : ch,
        start: Math.floor(Math.random() * 14),
        end  : 14 + Math.floor(Math.random() * 18),
      }));
      this.frame = 0;
      cancelAnimationFrame(this._raf);
      this._step();
    }, delay);
  }

  _step() {
    let out = '', done = 0;
    for (const q of this.queue) {
      if (this.frame >= q.end)       { out += q.to === ' ' ? ' ' : q.to; done++; }
      else if (this.frame >= q.start) out += this.chars[Math.floor(Math.random() * this.chars.length)];
      else                            out += ' ';
    }
    this.el.textContent = out;
    if (done < this.queue.length) {
      this.frame++;
      this._raf = raf(() => this._step());
    }
  }
}

/* ─── COUNTER ANIMATION ────────────────────────────────────────── */
function animateCount(el) {
  const raw    = el.textContent;
  const prefix = raw.match(/^[^\d]*/)?.[0] || '';
  const num    = parseFloat(raw.replace(/[^\d.]/g, ''));
  const suffix = raw.slice((prefix + String(num)).length);
  if (isNaN(num)) return;

  let t0 = null;
  const dur = 1700;

  raf(function step(ts) {
    if (!t0) t0 = ts;
    const p  = Math.min((ts - t0) / dur, 1);
    const e  = 1 - Math.pow(1 - p, 3);           /* ease-out cubic */
    const v  = e * num;
    el.textContent = prefix + (Number.isInteger(num) ? Math.round(v) : v.toFixed(1)) + suffix;
    if (p < 1) raf(step);
    else el.textContent = raw;
  });
}

function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      animateCount(target);
      obs.unobserve(target);
    });
  }, { threshold: 0.6 });

  $$('.stat-card__number, .metrics-band__number').forEach(el => obs.observe(el));
}

/* ─── METRIC BARS ──────────────────────────────────────────────── */
function initMetricBars() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.querySelectorAll('.metric-bar__fill').forEach(fill => {
        fill.style.width = fill.dataset.w + '%';
      });
      obs.unobserve(target);
    });
  }, { threshold: 0.35 });

  $$('.achievement-card').forEach(el => obs.observe(el));
}

/* ─── TICKER ───────────────────────────────────────────────────── */
function initTicker() {
  const el = $('#heroTicker');
  if (!el) return;

  let idx = 0;
  let intervalId = null;

  const getLines = () => {
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    return (window.TRANS && window.TRANS[lang] && window.TRANS[lang].ticker)
      ? window.TRANS[lang].ticker
      : [
          'D365 F&amp;O ERP cutover — on time, Jan 1 2025',
          'H2H Bank Integration — ~97% payment automation',
          'Microsoft Copilot — 28% productivity uplift',
          'IT Operating Model — ~35% faster resolution',
          'ICFR Controls — audit-ready governance',
          'Annual IT Budget — AED 2M, CapEx/OpEx disciplined',
        ];
  };

  const swap = () => {
    const lines = getLines();
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => {
      el.innerHTML = lines[idx % lines.length];
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      idx = (idx + 1) % lines.length;
    }, 380);
  };

  swap();
  intervalId = setInterval(swap, 3800);

  /* expose restart so lang switch can reset the ticker */
  window._restartTicker = () => {
    clearInterval(intervalId);
    idx = 0;
    swap();
    intervalId = setInterval(swap, 3800);
  };
}

/* ─── HERO SCRAMBLE on LOAD ────────────────────────────────────── */
function initHeroScramble() {
  const el = $('.hero__title[data-scramble]');
  if (!el) return;
  const txt = el.textContent.trim();
  el.style.minHeight = el.offsetHeight + 'px';
  new TextScramble(el).run(txt, 550);
}

/* ─── PARALLAX ON CANVAS ───────────────────────────────────────── */
function initParallax() {
  const hero   = $('#hero');
  const canvas = hero?.querySelector('canvas');
  if (!hero || !canvas) return;

  window.addEventListener('mousemove', e => {
    if (window.scrollY > window.innerHeight) return;
    const x = (e.clientX / window.innerWidth  - .5) * 18;
    const y = (e.clientY / window.innerHeight - .5) * 12;
    canvas.style.transform = `translate(${x * .45}px, ${y * .45}px) scale(1.02)`;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    const y = window.scrollY * .12;
    canvas.style.transform = `translateY(-${y}px) scale(1.02)`;
  }, { passive: true });
}

/* ─── HOVER RIPPLE on COMPETENCY / ACHIEVEMENT CARDS ─────────── */
function initCardRipple() {
  const cards = $$('.competency-card, .achievement-card, .contact-card:not(.contact-card--static)');
  cards.forEach(card => {
    card.addEventListener('mouseenter', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dot = document.createElement('span');
      dot.className = 'ripple-dot';
      dot.style.cssText = `left:${x}px;top:${y}px`;
      card.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove());
    });
  });
}

/* ─── SCANNING LINES on SECTION HEADERS ──────────────────────── */
function initSectionScan() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.classList.add('scan-active');
    });
  }, { threshold: 0.4 });

  $$('.section__header').forEach(h => obs.observe(h));
}

/* ─── SCROLL NAV BUTTON ────────────────────────────────────────── */
function initScrollNav() {
  const btn = $('#scrollNav');
  if (!btn) return;

  /* collect all labelled sections in DOM order */
  const sections = $$('section[id], footer[id]');
  if (!sections.length) return;

  function updateState() {
    const scrollY = window.scrollY;

    /* show button once user scrolls past the fold */
    btn.classList.toggle('visible', scrollY > 100);

    /* flip to "up" arrow when the last section's midpoint is above viewport centre */
    const last    = sections[sections.length - 1];
    const lastMid = last.offsetTop + last.offsetHeight / 2;
    btn.classList.toggle('at-top', scrollY + window.innerHeight / 2 >= lastMid);
  }

  function handleClick() {
    if (btn.classList.contains('at-top')) {
      /* at bottom → scroll back to top */
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    /* find the next section whose top is below current scroll + small threshold */
    const next = sections.find(s => s.offsetTop > window.scrollY + 80);
    if (next) {
      next.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  window.addEventListener('scroll', updateState, { passive: true });
  btn.addEventListener('click', handleClick);
  updateState(); /* set initial state */
}

/* ─── SCROLL PROGRESS TIMELINE ─────────────────────────────────── */
function initScrollProgress() {
  const spFill  = document.getElementById('spFill');
  const spNodes = document.getElementById('spNodes');
  if (!spFill || !spNodes) return;

  /* sections to mark on the timeline */
  const SECTIONS = [
    { id: 'about',        label: 'About'       },
    { id: 'approach',     label: 'Approach'    },
    { id: 'experience',   label: 'Experience'  },
    { id: 'competencies', label: 'Expertise'   },
    { id: 'achievements', label: 'Impact'      },
    { id: 'contact',      label: 'Contact'     },
  ];

  let nodeRefs = []; /* { node: HTMLElement, el: HTMLElement } */

  /* build / rebuild milestone dots */
  function buildNodes() {
    spNodes.innerHTML = '';
    nodeRefs = [];
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return;

    SECTIONS.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (!el) return;

      const pct  = Math.min((el.offsetTop / docH) * 100, 98);
      const btn  = document.createElement('button');
      btn.className = 'sp__node';
      btn.style.left = pct + '%';
      btn.setAttribute('aria-label', 'Go to ' + sec.label);

      const lbl = document.createElement('span');
      lbl.className = 'sp__label';
      lbl.textContent = sec.label;
      btn.appendChild(lbl);

      /* click → smooth-scroll to section */
      btn.addEventListener('click', () => {
        el.scrollIntoView({ behavior: 'smooth' });
      });

      spNodes.appendChild(btn);
      nodeRefs.push({ node: btn, el });
    });
  }

  /* per-frame update */
  function update() {
    const scrollY = window.scrollY;
    const docH    = document.documentElement.scrollHeight - window.innerHeight;
    const pct     = docH > 0 ? Math.min(scrollY / docH, 1) : 0;

    /* — bar fill — */
    spFill.style.width = (pct * 100) + '%';

    /* — node states — */
    const threshold = scrollY + window.innerHeight * 0.38;
    nodeRefs.forEach(({ node, el }) => {
      const top = el.offsetTop;
      const bot = top + el.offsetHeight;
      node.classList.remove('sp__node--passed', 'sp__node--active');
      if (threshold >= bot) {
        node.classList.add('sp__node--passed');
      } else if (threshold >= top) {
        node.classList.add('sp__node--active');
      }
    });
  }

  buildNodes();
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => { buildNodes(); update(); }, { passive: true });
}

/* ─── LANGUAGE SWITCHER ─────────────────────────────────────────── */
function applyLang(lang) {
  if (!window.TRANS || !window.TRANS[lang]) return;
  const T = window.TRANS[lang];
  const html = document.documentElement;
  html.setAttribute('lang', lang === 'ar' ? 'ar' : lang === 'ru' ? 'ru' : 'en');
  html.setAttribute('dir',  lang === 'ar' ? 'rtl' : 'ltr');
  html.setAttribute('data-lang', lang);

  /* plain text */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (T[key] !== undefined) el.textContent = T[key];
  });

  /* HTML content (contains tags like <strong>, <br>, &amp;) */
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (T[key] !== undefined) el.innerHTML = T[key];
  });

  /* re-apply metric bar widths (they may have been re-injected) */
  document.querySelectorAll('.metric-bar__fill').forEach(fill => {
    if (fill.dataset.w) fill.style.width = fill.dataset.w + '%';
  });

  /* tag arrays */
  document.querySelectorAll('[data-i18n-tags]').forEach(el => {
    const key = el.getAttribute('data-i18n-tags');
    if (Array.isArray(T[key])) {
      el.innerHTML = T[key].map(t => `<span>${t}</span>`).join('');
    }
  });

  /* update lang-btn active state on both switchers */
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  /* re-scramble the hero title */
  const heroTitle = document.getElementById('heroTitle');
  if (heroTitle && T['hero_title']) {
    heroTitle.textContent = T['hero_title'];
    new TextScramble(heroTitle).run(T['hero_title'], 400);
  }

  /* restart ticker in new language */
  if (window._restartTicker) window._restartTicker();

  localStorage.setItem('lang', lang);
}

function initLang() {
  const saved = localStorage.getItem('lang') || 'en';
  applyLang(saved);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      applyLang(lang);
    });
  });
}

/* ─── INIT ─────────────────────────────────────────────────────── */
function initPhotoTilt() {
  const photo = document.querySelector('.hero__photo');
  if (!photo || window.matchMedia('(hover: none)').matches) return;

  const glare = document.createElement('div');
  glare.className = 'photo-glare';
  photo.appendChild(glare);

  photo.addEventListener('mouseenter', () => {
    photo.style.transition = 'transform 0.15s ease';
    glare.style.opacity = '1';
  });

  photo.addEventListener('mousemove', (e) => {
    const r  = photo.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
    const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
    photo.style.transform =
      `perspective(700px) rotateX(${dy * -12}deg) rotateY(${dx * 12}deg) scale(1.08)`;
    glare.style.background =
      `radial-gradient(circle at ${50 + dx * 30}% ${50 + dy * 30}%, rgba(255,255,255,0.22) 0%, transparent 65%)`;
  });

  photo.addEventListener('mouseleave', () => {
    photo.style.transition = 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)';
    photo.style.transform  = '';
    glare.style.opacity    = '0';
  });
}

function initPhotoModal() {
  const photo = document.querySelector('.hero__photo');
  const modal = document.getElementById('photoModal');
  if (!photo || !modal) return;

  photo.addEventListener('click', () => modal.classList.add('active'));
  modal.addEventListener('click', () => modal.classList.remove('active'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') modal.classList.remove('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initActiveNav();
  initCounters();
  initMetricBars();
  initHeroScramble();
  initParallax();
  initCardRipple();
  initSectionScan();
  initScrollNav();
  initTicker();
  initScrollProgress();
  initLang();
  initPhotoTilt();
  initPhotoModal();

  /* start the neural canvas */
  new NeuralCanvas('neuralCanvas');
});
