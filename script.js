// La URL base se configura una sola vez: data-store-base en <html> de index.html.
(() => {
  document.documentElement.classList.add('js');
  const storeBase = document.documentElement.dataset.storeBase.replace(/\/+$/, '');
  // Elegí los medios una sola vez al cargar.
  const desktopMedia = window.matchMedia('(min-width: 768px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // La galería aparece una sola vez; sin soporte o con movimiento reducido queda visible.
  const about = document.querySelector('.about');
  let aboutObserver;
  function revealAbout() {
    about.classList.add('is-revealed');
    if (aboutObserver) aboutObserver.disconnect();
  }
  if (reducedMotion.matches || !('IntersectionObserver' in window)) revealAbout();
  else {
    aboutObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) revealAbout();
    }, { rootMargin: '0px 0px -80px 0px' });
    aboutObserver.observe(about);
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) revealAbout();
  });
  // El primer scroll revela el logo, sin intervenir en el desplazamiento.
  const hero = document.querySelector('.hero');
  function revealLogo() {
    if (window.scrollY <= 8) return;
    hero.classList.add('is-logo-visible');
    window.removeEventListener('scroll', revealLogo);
  }
  window.addEventListener('scroll', revealLogo, { passive: true });
  revealLogo();

  // Rayos decorativos alrededor del nombre, con el mismo trazado del logo.
  const categories = [...document.querySelectorAll('.category-grid .category')];
  const svgNS = 'http://www.w3.org/2000/svg';
  categories.forEach((category) => {
    const rays = document.createElementNS(svgNS, 'svg');
    rays.setAttribute('class', 'category-rays');
    rays.setAttribute('viewBox', '0 0 240 90');
    rays.setAttribute('aria-hidden', 'true');
    rays.setAttribute('fill', 'none');
    rays.setAttribute('stroke', '#C9A66B');
    rays.setAttribute('stroke-width', '1');
    for (let ray = 0; ray < 24; ray++) {
      const angle = ray * Math.PI / 12;
      const length = ray % 2 ? 6 : 12;
      const x = 120 + Math.cos(angle) * 88;
      const y = 45 + Math.sin(angle) * 24;
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', `M${x} ${y}L${x + Math.cos(angle) * length} ${y + Math.sin(angle) * length}`);
      path.setAttribute('pathLength', '1');
      path.style.setProperty('--ray', ray);
      rays.appendChild(path);
    }
    category.appendChild(rays);
  });
  const touch = window.matchMedia('(hover: none)');
  let categoryObserver;
  function watchCategories() {
    if (categoryObserver) categoryObserver.disconnect();
    if (watchCategories.cleanup) watchCategories.cleanup();
    categories.forEach((category) => category.classList.remove('is-focus'));
    if (!touch.matches || reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const grid = document.querySelector('.category-grid');
    if (!grid) return;
    let frame = null;
    let active = false;
    let disposed = false;
    function updateFocus() {
      frame = null;
      if (!active) return;
      const rows = new Map();
      categories.forEach((category) => {
        const rect = category.getBoundingClientRect();
        const top = Math.round(rect.top);
        if (!rows.has(top)) rows.set(top, []);
        rows.get(top).push({ category, rect });
      });
      const height = window.innerHeight;
      const middle = height / 2;
      let nearest;
      let nearestCenter;
      rows.forEach((row) => {
        const center = (Math.min(...row.map(({ rect }) => rect.top)) +
          Math.max(...row.map(({ rect }) => rect.bottom))) / 2;
        if (!nearest || Math.abs(center - middle) < Math.abs(nearestCenter - middle)) {
          nearest = row;
          nearestCenter = center;
        }
      });
      let focused;
      if (nearest && nearestCenter >= height * 0.4 && nearestCenter <= height * 0.6) {
        nearest.sort((a, b) => a.rect.left - b.rect.left);
        const progress = (height * 0.6 - nearestCenter) / (height * 0.2);
        const index = Math.min(nearest.length - 1, Math.floor(progress * nearest.length));
        focused = nearest[index].category;
      }
      categories.forEach((category) => category.classList.toggle('is-focus', category === focused));
    }
    function scheduleFocus() {
      if (active && frame === null) frame = window.requestAnimationFrame(updateFocus);
    }
    function stop() {
      active = false;
      window.removeEventListener('scroll', scheduleFocus);
      window.removeEventListener('resize', scheduleFocus);
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      categories.forEach((category) => category.classList.remove('is-focus'));
    }
    watchCategories.cleanup = () => {
      disposed = true;
      stop();
    };
    categoryObserver = new IntersectionObserver((entries) => {
      if (disposed) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          active = true;
          window.addEventListener('scroll', scheduleFocus, { passive: true });
          window.addEventListener('resize', scheduleFocus);
          scheduleFocus();
        } else stop();
      });
    });
    categoryObserver.observe(grid);
  }
  touch.addEventListener('change', watchCategories);
  reducedMotion.addEventListener('change', watchCategories);
  watchCategories();
  let navigating = false;
  document.querySelectorAll('[data-store-path]').forEach((link) => {
    link.href = storeBase + (link.dataset.storePath || link.getAttribute('href'));
    link.addEventListener('click', (event) => {
      // Conservá los gestos del navegador, como Cmd/Ctrl + clic.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;
      event.preventDefault();
      if (navigating) return;
      navigating = true;
      document.body.classList.add('is-leaving');
      window.setTimeout(() => window.location.assign(link.href), 300);
    });
  });
  // Mostrá el poster hasta que el video pueda reproducirse, sin repetirlo.
  const video = document.querySelector('.hero-video');
  video.src = desktopMedia ? 'img/hero-recorrido.mp4' : 'img/hero-recorrido-movil.mp4';
  function showPoster() {
    video.pause();
    video.classList.remove('is-playing');
  }
  video.defaultPlaybackRate = 0.8;
  video.playbackRate = 0.8;
  function playHero() {
    if (reducedMotion.matches) {
      video.autoplay = false;
      showPoster();
      return;
    }
    video.play().catch(showPoster);
  }
  video.addEventListener('playing', () => {
    if (reducedMotion.matches) showPoster();
    else video.classList.add('is-playing');
  });
  reducedMotion.addEventListener('change', playHero);
  playHero();
  // Reiniciá el recorrido sólo al volver tras salir por completo del hero.
  if ('IntersectionObserver' in window) {
    let heroHasExited = false;
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          heroHasExited = true;
          return;
        }
        if (!heroHasExited) return;
        heroHasExited = false;
        if (reducedMotion.matches) return;
        video.currentTime = 0;
        video.defaultPlaybackRate = 0.8;
        video.playbackRate = 0.8;
        video.play().catch(() => {});
      });
    }, { threshold: 0 });
    heroObserver.observe(hero);
  }
  // Las tarjetas de Visitanos convergen alrededor del panel con el scroll.
  const visit = document.querySelector('.visit');
  const visitSticky = visit.querySelector('.visit-sticky');
  const visitPanel = visit.querySelector('.visit-panel');
  const visitCards = [...visit.querySelectorAll('.visit-card')];
  const visitAngles = [-2, 1.5, 2, -1.5, 1.5, -2, -1, 2];
  const clampUnit = (value) => Math.max(0, Math.min(1, value));
  const smoothStep = (value) => value * value * (3 - 2 * value);
  let visitCleanup;
  function watchVisit() {
    if (visitCleanup) visitCleanup();
    visit.classList.remove('is-animated');
    visitCards.forEach((card) => { card.style.transform = ''; card.style.opacity = ''; });
    if (reducedMotion.matches || !('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;
    visit.classList.add('is-animated');
    let frame = null;
    let current = 0;
    let start = 0;
    let distance = 1;
    let places = [];
    function paint() {
      visitCards.forEach((card, index) => {
        const place = places[index];
        if (!place) return;
        const eased = smoothStep(clampUnit((current - index * 0.02) / 0.8));
        const x = place.fromX + (place.x - place.fromX) * eased;
        const y = place.fromY + (place.y - place.fromY) * eased;
        const rotate = place.fromRotate + (place.rotate - place.fromRotate) * eased;
        card.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${rotate.toFixed(2)}deg)`;
        card.style.opacity = clampUnit(current / 0.15).toFixed(3);
      });
    }
    function tick() {
      frame = null;
      const target = clampUnit((window.scrollY - start) / distance);
      const gap = target - current;
      current = Math.abs(gap) > 0.001 ? current + gap * 0.12 : target;
      paint();
      if (current !== target) frame = window.requestAnimationFrame(tick);
    }
    function schedule() {
      if (frame === null) frame = window.requestAnimationFrame(tick);
    }
    function measure() {
      const width = visitSticky.clientWidth;
      const height = visitSticky.clientHeight;
      const panelRect = { width: visitPanel.offsetWidth, height: visitPanel.offsetHeight };
      // El scroll empieza a acomodarlas antes de que la sección quede fija.
      start = visit.getBoundingClientRect().top + window.scrollY - height * 0.4;
      distance = Math.max(1, visit.offsetHeight - height + height * 0.4);
      const sides = width >= 1024;
      const gap = sides ? 20 : 8;
      const toPanel = sides ? 24 : 12;
      const cardWidth = Math.max(40, Math.floor(sides
        ? Math.min((width - panelRect.width - 2 * toPanel - 32 - 2 * gap) / 4, ((height - 64 - gap) / 2) * 8 / 11)
        : Math.min((width - 32 - 3 * gap) / 4, ((height - panelRect.height - 2 * toPanel - 32) / 2) * 8 / 11)));
      const cardHeight = cardWidth * 11 / 8;
      visit.style.setProperty('--visit-card-width', `${cardWidth}px`);
      places = visitCards.map((card, index) => {
        const angle = index / visitCards.length * Math.PI * 2;
        let x;
        let y;
        if (sides) {
          const near = panelRect.width / 2 + toPanel + cardWidth / 2;
          const column = index % 2 === 0 ? near + cardWidth + gap : near;
          x = index < 4 ? -column : column;
          y = (index % 4 < 2 ? -1 : 1) * (cardHeight + gap) / 2;
          if (index >= 4) x = index % 2 === 0 ? near : near + cardWidth + gap;
        } else {
          x = ((index % 4) - 1.5) * (cardWidth + gap);
          y = (index < 4 ? -1 : 1) * (panelRect.height / 2 + toPanel + cardHeight / 2);
        }
        return {
          x,
          y,
          rotate: visitAngles[index],
          fromX: Math.cos(angle) * (width * 0.55 + (index % 3) * width * 0.08),
          fromY: Math.sin(angle) * (height * 0.5 + (index % 2) * height * 0.1),
          fromRotate: (index % 2 === 0 ? 1 : -1) * (25 + index * 5)
        };
      });
      paint();
      schedule();
    }
    // Empiezan fuera de pantalla: pedilas antes de que se acerquen.
    const loader = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      loader.disconnect();
      visitCards.forEach((card) => { card.querySelector('img').loading = 'eager'; });
    }, { rootMargin: '100%' });
    loader.observe(visit);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(visit);
    resizeObserver.observe(visitPanel);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', schedule, { passive: true });
    measure();
    visitCleanup = () => {
      loader.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', schedule);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }
  reducedMotion.addEventListener('change', watchVisit);
  watchVisit();
  // Restaurá la página al volver desde la tienda con el botón Atrás.
  window.addEventListener('pageshow', () => {
    navigating = false;
    document.body.classList.remove('is-leaving');
  });
})();
