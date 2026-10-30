/* Nemanjica Coaching — demo */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* ---------- hero: ulazna animacija kad se slika učita ---------- */
  const hero = document.querySelector('.hero');
  const heroImg = document.querySelector('.hero__img');
  let heroStarted = false;
  const startHero = () => {
    if (heroStarted) return;
    heroStarted = true;
    void hero.offsetWidth; // početno stanje mora biti izračunato da bi tranzicija krenula
    hero.classList.add('is-loaded');
  };
  if (heroImg && heroImg.decode) {
    heroImg.decode().then(startHero, startHero);
  }
  window.setTimeout(startHero, 900);

  /* ---------- navigacija ---------- */
  const nav = document.querySelector('[data-nav]');
  const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 720px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- pojavljivanje pri skrolu ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if (hasIO && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- proces: koraci se pale redom, šina prati ---------- */
  const stepsList = document.querySelector('[data-steps]');
  const steps = [...stepsList.querySelectorAll('.step')];
  const rowLayout = window.matchMedia('(min-width: 900px)');
  let lit = -1;

  const markCenter = (i) => {
    const step = steps[i];
    const mark = step.querySelector('.step__mark');
    return rowLayout.matches
      ? step.offsetLeft + mark.offsetLeft + mark.offsetWidth / 2
      : step.offsetTop + mark.offsetTop + mark.offsetHeight / 2;
  };

  const layoutRail = () => {
    if (rowLayout.matches) {
      stepsList.style.removeProperty('--rail-top');
      stepsList.style.removeProperty('--rail-h');
    } else {
      const top = markCenter(0);
      stepsList.style.setProperty('--rail-top', `${top}px`);
      stepsList.style.setProperty('--rail-h', `${markCenter(steps.length - 1) - top}px`);
    }
    updateFill();
  };

  const updateFill = () => {
    let fill = 0;
    if (lit >= steps.length - 1) {
      fill = 1;
    } else if (lit >= 0) {
      const start = rowLayout.matches ? 0 : markCenter(0);
      const length = rowLayout.matches ? stepsList.clientWidth : markCenter(steps.length - 1) - start;
      fill = length > 0 ? (markCenter(lit) - start) / length : 0;
    }
    stepsList.style.setProperty('--fill', fill.toFixed(4));
  };

  let target = -1;
  let ticking = false;
  const advance = () => {
    if (lit >= target) { ticking = false; return; }
    lit += 1;
    steps[lit].classList.add('is-lit');
    updateFill();
    window.setTimeout(advance, 170);
  };
  const lightUpTo = (i) => {
    target = Math.max(target, i);
    if (!ticking) { ticking = true; advance(); }
  };

  if (hasIO && !reduceMotion) {
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) lightUpTo(steps.indexOf(entry.target));
      });
    }, { rootMargin: '0px 0px -18% 0px' });
    steps.forEach((s) => stepIO.observe(s));
  } else {
    steps.forEach((s) => s.classList.add('is-lit'));
    lit = steps.length - 1;
  }
  layoutRail();
  window.addEventListener('resize', layoutRail);
  rowLayout.addEventListener('change', layoutRail);
  document.fonts && document.fonts.ready.then(layoutRail);

  /* ---------- klijenti: slika/snimak ako postoji, inače placeholder ---------- */
  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const videoIO = hasIO && !reduceMotion
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting) {
            const p = v.play();
            if (p) p.catch(() => {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.5 })
    : null;

  const attachMedia = async (reel) => {
    const base = reel.dataset.media;
    const frame = reel.querySelector('.reel__frame');
    const label = reel.querySelector('.reel__label').textContent.replace(/\s+/g, ' ').trim();
    let img;
    try {
      img = await loadImage(`${base}.jpg`);
    } catch {
      return; // nema fajla — ostaje placeholder
    }
    img.alt = `Klijent na treningu: ${label}`;
    img.width = 1080;
    img.height = 1920;
    img.decoding = 'async';
    frame.prepend(img);
    reel.classList.add('has-media');

    try {
      const res = await fetch(`${base}.mp4`, { method: 'HEAD' });
      if (!res.ok) return;
    } catch {
      return;
    }
    const video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none', poster: img.src });
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-label', img.alt);
    video.src = `${base}.mp4`;
    img.replaceWith(video);
    if (videoIO) videoIO.observe(video);
  };

  const reels = document.querySelectorAll('.reel[data-media]');
  if (hasIO) {
    const mediaIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        mediaIO.unobserve(entry.target);
        attachMedia(entry.target);
      });
    }, { rootMargin: '400px 400px' });
    reels.forEach((r) => mediaIO.observe(r));
  } else {
    reels.forEach(attachMedia);
  }

  /* ---------- „START" se ukuca kad poruka uđe u kadar ---------- */
  const dm = document.querySelector('[data-dm]');
  const dmText = document.querySelector('[data-dm-text]');
  if (dm && hasIO && !reduceMotion) {
    const word = dmText.textContent;
    dmText.textContent = '';
    const dmIO = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      dmIO.disconnect();
      let i = 0;
      const type = () => {
        i += 1;
        dmText.textContent = word.slice(0, i);
        if (i < word.length) {
          window.setTimeout(type, 120);
        } else {
          window.setTimeout(() => dm.classList.add('is-sent'), 350);
        }
      };
      window.setTimeout(type, 500);
    }, { threshold: 0.8 });
    dmIO.observe(dm);
  }

  /* ---------- mobilno sticky dugme ---------- */
  const dock = document.querySelector('[data-dock]');
  const dockLink = dock.querySelector('a');
  const heroCta = document.querySelector('[data-hero-cta]');
  const final = document.querySelector('[data-final]');
  if (hasIO) {
    const seen = new Map();
    const dockIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting));
      // vidljivo kad hero dugme nije u kadru (iznad ili ispod), osim na završnom CTA
      const show = !seen.get(heroCta) && !seen.get(final);
      dock.classList.toggle('is-visible', show);
      dock.setAttribute('aria-hidden', String(!show));
      dockLink.tabIndex = show ? 0 : -1;
    });
    dockIO.observe(heroCta);
    dockIO.observe(final);
  }
})();
