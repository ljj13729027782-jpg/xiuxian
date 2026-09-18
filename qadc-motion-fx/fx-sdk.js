(function (global) {
  'use strict';
  function merge(defaults, user) {
    const r = {};
    for (const k in defaults) r[k] = defaults[k];
    if (user) for (const k in user) r[k] = user[k];
    return r;
  }
  function hasAnime() {
    return typeof anime !== 'undefined' && anime.animate;
  }
  function listeners(el, evts, handler, opts) {
    evts.forEach((e) => el.addEventListener(e, handler, opts));
    return () => evts.forEach((e) => el.removeEventListener(e, handler, opts));
  }
  function getPointer(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }
  function resolveChild(root, selector) {
    if (selector && selector.nodeType === 1) return selector;
    if (selector && typeof selector === 'string') return root.querySelector(selector);
    return null;
  }
  function hexToRgbCsv(value) {
    const clean = String(value || '#ffffff').replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '255,255,255';
    return `${parseInt(clean.slice(0, 2), 16)},${parseInt(clean.slice(2, 4), 16)},${parseInt(clean.slice(4, 6), 16)}`;
  }
  function applyRipple(el, opts) {
    const o = merge({ color: '#FF4D7A', radius: 200, duration: 600, opacity: 0.4 }, opts);
    if (!el.style.position || el.style.position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    function handler(e) {
      const rect = el.getBoundingClientRect();
      const { x, y } = getPointer(e);
      const rip = document.createElement('div');
      const sz = o.radius * 2;
      rip.style.cssText = `position:absolute;border-radius:50%;pointer-events:none;width:${sz}px;height:${sz}px;left:${x - rect.left - o.radius}px;top:${y - rect.top - o.radius}px;background:${o.color};transform:scale(0);opacity:${o.opacity};will-change:transform,opacity`;
      el.appendChild(rip);
      if (hasAnime()) {
        anime.animate(rip, {
          scale: [0, 1],
          opacity: [o.opacity, 0],
          duration: o.duration,
          ease: 'out(3)',
          onComplete: () => rip.remove(),
        });
      } else {
        rip.style.transition = `transform ${o.duration}ms cubic-bezier(.2,0,0,1), opacity ${o.duration}ms ease-out`;
        requestAnimationFrame(() => {
          rip.style.transform = 'scale(1)';
          rip.style.opacity = '0';
        });
        rip.addEventListener('transitionend', () => rip.remove(), { once: true });
      }
    }
    const off = listeners(el, ['click'], handler);
    return { destroy: off };
  }
  function applyBounce(el, opts) {
    const o = merge({ scaleDown: 0.92, duration: 300 }, opts);
    let pressing = false,
      pAnim = null,
      rAnim = null;
    function press() {
      pressing = true;
      if (rAnim) {
        rAnim.cancel ? rAnim.cancel() : null;
      }
      if (hasAnime()) {
        pAnim = anime.animate(el, {
          scale: o.scaleDown,
          duration: o.duration * 0.4,
          ease: 'out(2)',
        });
      } else {
        el.style.transition = `transform ${o.duration * 0.4}ms ease-out`;
        el.style.transform = `scale(${o.scaleDown})`;
      }
    }
    function release() {
      if (!pressing) return;
      pressing = false;
      if (pAnim && pAnim.cancel) pAnim.cancel();
      if (hasAnime()) {
        rAnim = anime.animate(el, {
          scale: [o.scaleDown, 1],
          duration: o.duration,
          ease: 'out(1, .4)',
        });
      } else {
        el.style.transition = `transform ${o.duration}ms cubic-bezier(.34,1.56,.64,1)`;
        el.style.transform = 'scale(1)';
      }
    }
    const offs = [
      listeners(el, ['mousedown', 'touchstart'], press, { passive: true }),
      listeners(el, ['mouseup', 'mouseleave', 'touchend'], release, { passive: true }),
    ];
    return {
      destroy() {
        offs.forEach((f) => f());
      },
    };
  }
  function applyParticleBurst(el, opts) {
    const o = merge(
      { count: 30, velocity: 8, gravity: 0.8, size: 5, decay: 0.02, colors: null },
      opts
    );
    const defaultColors = () => `hsl(${Math.random() * 360}, 80%, 60%)`;
    const getColor = o.colors
      ? () => o.colors[Math.floor(Math.random() * o.colors.length)]
      : defaultColors;
    function handler(e) {
      const rect = el.getBoundingClientRect();
      const { x, y } = getPointer(e);
      const cx = x - rect.left,
        cy = y - rect.top;
      const particles = [];
      for (let i = 0; i < o.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = o.velocity * (0.4 + Math.random() * 0.6);
        const conf = document.createElement('div');
        conf.style.cssText = `position:absolute;width:${o.size}px;height:${o.size}px;border-radius:2px;pointer-events:none;left:${cx}px;top:${cy}px;background:${getColor()}`;
        el.appendChild(conf);
        particles.push({
          el: conf,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: o.decay * (0.5 + Math.random()),
        });
      }
      function step() {
        let alive = false;
        particles.forEach((p) => {
          if (p.life <= 0) return;
          p.vy += o.gravity * 0.3;
          p.el.style.left = parseFloat(p.el.style.left) + p.vx + 'px';
          p.el.style.top = parseFloat(p.el.style.top) + p.vy + 'px';
          p.life -= p.decay;
          p.el.style.opacity = Math.max(0, p.life);
          if (p.life <= 0) p.el.remove();
          else alive = true;
        });
        if (alive) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!el.style.position || el.style.position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    const off = listeners(el, ['click'], handler);
    return { destroy: off };
  }
  function applyMagnetic(el, opts) {
    let o = merge({ radius: 120, strength: 0.3, spring: 300 }, opts);
    const original = {
      transition: el.style.transition,
      transform: el.style.transform,
    };
    el.style.transition = `transform ${o.spring}ms cubic-bezier(.33,1,.68,1)`;
    function move(e) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2,
        cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx,
        dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < o.radius) {
        const pull = (1 - dist / o.radius) * o.strength;
        el.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
      } else {
        el.style.transform = '';
      }
    }
    function leave() {
      el.style.transform = '';
    }
    const parent = el.parentElement || document;
    const offs = [listeners(parent, ['mousemove'], move), listeners(parent, ['mouseleave'], leave)];
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        el.style.transition = `transform ${o.spring}ms cubic-bezier(.33,1,.68,1)`;
      },
      destroy() {
        offs.forEach((f) => f());
        el.style.transition = original.transition;
        el.style.transform = original.transform;
      },
    };
  }
  function ensureIdleEnhancerStyle(doc) {
    ensureFxStyle(
      'qadc-fx-idle-enhancers',
      '[data-qadc-idle-breathe="true"]{--qib-scale:1.03;--qib-duration:2600ms;--qib-ease:ease-in-out;animation:qadc-idle-breathe var(--qib-duration) var(--qib-ease) infinite alternate}' +
        '[data-qadc-idle-float="true"]{--qif-distance:10px;--qif-duration:2600ms;--qif-ease:ease-in-out;animation:qadc-idle-float var(--qif-duration) var(--qif-ease) infinite}' +
        '[data-qadc-idle-pulse-glow="true"]{--qipg-rgb:125,211,252;--qipg-alpha:.55;--qipg-blur:18px;--qipg-spread:0px;--qipg-duration:2200ms;--qipg-ease:ease-in-out;animation:qadc-idle-pulse-glow var(--qipg-duration) var(--qipg-ease) infinite}' +
        '[data-qadc-idle-shake="true"]{--qish-distance:2px;--qish-rotate:1.2deg;--qish-duration:1800ms;--qish-ease:ease-in-out;animation:qadc-idle-shake var(--qish-duration) var(--qish-ease) infinite}' +
        '[data-qadc-idle-blink="true"]{--qibl-min:.35;--qibl-duration:1200ms;--qibl-ease:ease-in-out;animation:qadc-idle-blink var(--qibl-duration) var(--qibl-ease) infinite}' +
        '[data-qadc-idle-border-flow="true"]{position:relative;overflow:hidden;isolation:isolate}' +
        '.qadc-idle-border-flow-ring{position:absolute;inset:0;pointer-events:none;border-radius:inherit;padding:var(--qibf-thickness,2px);background:conic-gradient(from 0deg,transparent 0deg,color-mix(in srgb,var(--qibf-color,#7dd3fc) 0%, transparent) 70deg,var(--qibf-color,#7dd3fc) 140deg,transparent 220deg,color-mix(in srgb,var(--qibf-color,#7dd3fc) 35%, transparent) 300deg,transparent 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:var(--qibf-opacity,.92);filter:drop-shadow(0 0 var(--qibf-blur,18px) color-mix(in srgb,var(--qibf-color,#7dd3fc) 55%, transparent));animation:qadc-idle-border-flow-spin var(--qibf-duration,2600ms) linear infinite}' +
        '[data-qadc-mp-host="true"]{--qmp-x:0px;--qmp-y:0px;--qmp-host-scale:1;--qmp-duration:260ms;transition:transform var(--qmp-duration) cubic-bezier(.33,1,.68,1);transform:translate(var(--qmp-x),var(--qmp-y)) scale(var(--qmp-host-scale));will-change:transform}' +
        '[data-qadc-mp-content="true"]{--qmp-cx:0px;--qmp-cy:0px;--qmp-scale:1;--qmp-duration:260ms;transition:transform var(--qmp-duration) cubic-bezier(.33,1,.68,1);transform:translate(var(--qmp-cx),var(--qmp-cy)) scale(var(--qmp-scale));will-change:transform}' +
        '.qadc-stagger-entry{--qse-duration:520ms;--qse-delay:0ms;--qse-ease:cubic-bezier(.22,1,.36,1);--qse-opacity:0;--qse-transform:translateY(24px);transition:opacity var(--qse-duration) var(--qse-ease) var(--qse-delay),transform var(--qse-duration) var(--qse-ease) var(--qse-delay);will-change:opacity,transform}' +
        '.qadc-stagger-entry[data-qadc-stagger-state="pending"]{opacity:var(--qse-opacity);transform:var(--qse-transform)}' +
        '.qadc-stagger-entry[data-qadc-stagger-state="revealed"]{opacity:1;transform:none}' +
        '@keyframes qadc-idle-breathe{0%{transform:scale(1)}100%{transform:scale(var(--qib-scale))}}' +
        '@keyframes qadc-idle-float{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--qif-distance) * -1))}}' +
        '@keyframes qadc-idle-pulse-glow{0%,100%{box-shadow:0 0 var(--qipg-blur) var(--qipg-spread) rgba(var(--qipg-rgb),calc(var(--qipg-alpha) * .32))}50%{box-shadow:0 0 calc(var(--qipg-blur) * 1.4) calc(var(--qipg-spread) + 8px) rgba(var(--qipg-rgb),var(--qipg-alpha))}}' +
        '@keyframes qadc-idle-shake{0%,100%{transform:translate3d(0,0,0) rotate(0deg)}20%{transform:translate3d(calc(var(--qish-distance) * -1),0,0) rotate(calc(var(--qish-rotate) * -1))}40%{transform:translate3d(var(--qish-distance),0,0) rotate(var(--qish-rotate))}60%{transform:translate3d(calc(var(--qish-distance) * -.6),0,0) rotate(calc(var(--qish-rotate) * -.6))}80%{transform:translate3d(calc(var(--qish-distance) * .6),0,0) rotate(calc(var(--qish-rotate) * .6))}}' +
        '@keyframes qadc-idle-blink{0%,100%{opacity:1}50%{opacity:var(--qibl-min)}}' +
        '@keyframes qadc-idle-border-flow-spin{to{transform:rotate(360deg)}}',
      doc
    );
  }
  function applyIdleBreathe(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge({ scale: 1.03, duration: 2600, easing: 'ease-in-out' }, opts);
    ensureIdleEnhancerStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-idle-breathe');
    const snapshot = snapshotInlineStyles([host], ['--qib-scale', '--qib-duration', '--qib-ease']);
    function apply() {
      host.setAttribute('data-qadc-idle-breathe', 'true');
      host.style.setProperty('--qib-scale', String(o.scale));
      host.style.setProperty('--qib-duration', `${Math.max(200, Number(o.duration) || 2600)}ms`);
      host.style.setProperty('--qib-ease', o.easing || 'ease-in-out');
    }
    apply();
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
      },
      destroy() {
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-idle-breathe', originalAttr);
        else host.removeAttribute('data-qadc-idle-breathe');
      },
    };
  }
  function applyIdleFloat(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge({ distance: 10, duration: 2600, easing: 'ease-in-out' }, opts);
    ensureIdleEnhancerStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-idle-float');
    const snapshot = snapshotInlineStyles(
      [host],
      ['--qif-distance', '--qif-duration', '--qif-ease']
    );
    function apply() {
      host.setAttribute('data-qadc-idle-float', 'true');
      host.style.setProperty('--qif-distance', `${Number(o.distance) || 10}px`);
      host.style.setProperty('--qif-duration', `${Math.max(200, Number(o.duration) || 2600)}ms`);
      host.style.setProperty('--qif-ease', o.easing || 'ease-in-out');
    }
    apply();
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
      },
      destroy() {
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-idle-float', originalAttr);
        else host.removeAttribute('data-qadc-idle-float');
      },
    };
  }
  function applyIdlePulseGlow(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge(
      {
        glowColor: '#7dd3fc',
        blur: 18,
        spread: 0,
        opacity: 0.55,
        duration: 2200,
        easing: 'ease-in-out',
      },
      opts
    );
    ensureIdleEnhancerStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-idle-pulse-glow');
    const snapshot = snapshotInlineStyles(
      [host],
      [
        '--qipg-rgb',
        '--qipg-alpha',
        '--qipg-blur',
        '--qipg-spread',
        '--qipg-duration',
        '--qipg-ease',
      ]
    );
    function apply() {
      host.setAttribute('data-qadc-idle-pulse-glow', 'true');
      host.style.setProperty('--qipg-rgb', hexToRgbCsv(o.glowColor || o.color || '#7dd3fc'));
      host.style.setProperty(
        '--qipg-alpha',
        `${Math.max(0, Math.min(1, Number(o.opacity) || 0.55))}`
      );
      host.style.setProperty('--qipg-blur', `${Math.max(0, Number(o.blur) || 18)}px`);
      host.style.setProperty('--qipg-spread', `${Number(o.spread) || 0}px`);
      host.style.setProperty('--qipg-duration', `${Math.max(200, Number(o.duration) || 2200)}ms`);
      host.style.setProperty('--qipg-ease', o.easing || 'ease-in-out');
    }
    apply();
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
      },
      destroy() {
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-idle-pulse-glow', originalAttr);
        else host.removeAttribute('data-qadc-idle-pulse-glow');
      },
    };
  }
  function applyIdleShake(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge({ distance: 2, rotate: 1.2, duration: 1800, easing: 'ease-in-out' }, opts);
    ensureIdleEnhancerStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-idle-shake');
    const snapshot = snapshotInlineStyles(
      [host],
      ['--qish-distance', '--qish-rotate', '--qish-duration', '--qish-ease']
    );
    function apply() {
      host.setAttribute('data-qadc-idle-shake', 'true');
      host.style.setProperty('--qish-distance', `${Number(o.distance) || 2}px`);
      host.style.setProperty('--qish-rotate', `${Number(o.rotate) || 1.2}deg`);
      host.style.setProperty('--qish-duration', `${Math.max(200, Number(o.duration) || 1800)}ms`);
      host.style.setProperty('--qish-ease', o.easing || 'ease-in-out');
    }
    apply();
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
      },
      destroy() {
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-idle-shake', originalAttr);
        else host.removeAttribute('data-qadc-idle-shake');
      },
    };
  }
  function applyIdleBlink(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge({ minOpacity: 0.35, duration: 1200, easing: 'ease-in-out' }, opts);
    ensureIdleEnhancerStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-idle-blink');
    const snapshot = snapshotInlineStyles([host], ['--qibl-min', '--qibl-duration', '--qibl-ease']);
    function apply() {
      host.setAttribute('data-qadc-idle-blink', 'true');
      host.style.setProperty(
        '--qibl-min',
        `${Math.max(0, Math.min(1, Number(o.minOpacity) || 0.35))}`
      );
      host.style.setProperty('--qibl-duration', `${Math.max(200, Number(o.duration) || 1200)}ms`);
      host.style.setProperty('--qibl-ease', o.easing || 'ease-in-out');
    }
    apply();
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
      },
      destroy() {
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-idle-blink', originalAttr);
        else host.removeAttribute('data-qadc-idle-blink');
      },
    };
  }
  function applyIdleBorderFlow(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge(
      { color: '#7dd3fc', thickness: 2, blur: 18, opacity: 0.92, duration: 2600 },
      opts
    );
    ensureIdleEnhancerStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-idle-border-flow');
    const computedRadius =
      (doc.defaultView || window).getComputedStyle(host).borderRadius || '16px';
    const snapshot = snapshotInlineStyles(
      [host],
      ['--qibf-color', '--qibf-thickness', '--qibf-blur', '--qibf-opacity', '--qibf-duration']
    );
    const ring = doc.createElement('div');
    ring.className = 'qadc-idle-border-flow-ring';
    ring.setAttribute('data-qadc-idle-border-flow-ring', 'true');
    ring.style.borderRadius = computedRadius;
    function apply() {
      host.setAttribute('data-qadc-idle-border-flow', 'true');
      host.style.setProperty('--qibf-color', o.color || '#7dd3fc');
      host.style.setProperty('--qibf-thickness', `${Math.max(1, Number(o.thickness) || 2)}px`);
      host.style.setProperty('--qibf-blur', `${Math.max(0, Number(o.blur) || 18)}px`);
      host.style.setProperty(
        '--qibf-opacity',
        `${Math.max(0, Math.min(1, Number(o.opacity) || 0.92))}`
      );
      host.style.setProperty('--qibf-duration', `${Math.max(300, Number(o.duration) || 2600)}ms`);
      ring.style.borderRadius =
        (doc.defaultView || window).getComputedStyle(host).borderRadius || computedRadius;
    }
    host.appendChild(ring);
    apply();
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
      },
      destroy() {
        ring.remove();
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-idle-border-flow', originalAttr);
        else host.removeAttribute('data-qadc-idle-border-flow');
      },
    };
  }
  function resolveMagneticParallaxContent(host, contentEl) {
    return (
      resolveChild(host, contentEl) ||
      host.querySelector('[data-motion-parallax-content]') ||
      host.firstElementChild ||
      host
    );
  }
  function applyMagneticParallax(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge(
      { radius: 140, strength: 0.28, parallax: 0.46, spring: 260, scale: 1.03, contentEl: null },
      opts
    );
    ensureIdleEnhancerStyle(doc);
    let content = resolveMagneticParallaxContent(host, o.contentEl);
    const originalHostAttr = host.getAttribute('data-qadc-mp-host');
    const originalContentAttr =
      content && content !== host ? content.getAttribute('data-qadc-mp-content') : null;
    const hostSnapshot = snapshotInlineStyles(
      [host],
      ['--qmp-x', '--qmp-y', '--qmp-host-scale', '--qmp-duration']
    );
    const contentSnapshot =
      content && content !== host
        ? snapshotInlineStyles([content], ['--qmp-cx', '--qmp-cy', '--qmp-scale', '--qmp-duration'])
        : null;
    function applyDuration() {
      const duration = `${Math.max(80, Number(o.spring) || 260)}ms`;
      host.style.setProperty('--qmp-duration', duration);
      if (content && content !== host) content.style.setProperty('--qmp-duration', duration);
    }
    function applyTransforms(pointerX, pointerY) {
      const rect = host.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = pointerX - cx;
      const dy = pointerY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist >= o.radius) {
        host.style.setProperty('--qmp-x', '0px');
        host.style.setProperty('--qmp-y', '0px');
        host.style.setProperty('--qmp-host-scale', '1');
        if (content === host) return;
        content.style.setProperty('--qmp-cx', '0px');
        content.style.setProperty('--qmp-cy', '0px');
        content.style.setProperty('--qmp-scale', '1');
        return;
      }
      const pull = (1 - dist / o.radius) * o.strength;
      const parallax = (1 - dist / o.radius) * (Number(o.parallax) || 0.46);
      host.style.setProperty('--qmp-x', `${dx * pull}px`);
      host.style.setProperty('--qmp-y', `${dy * pull}px`);
      if (content === host) {
        host.style.setProperty('--qmp-host-scale', `${Number(o.scale) || 1.03}`);
        return;
      }
      host.style.setProperty('--qmp-host-scale', '1');
      content.style.setProperty('--qmp-cx', `${dx * pull * parallax}px`);
      content.style.setProperty('--qmp-cy', `${dy * pull * parallax}px`);
      content.style.setProperty('--qmp-scale', `${Number(o.scale) || 1.03}`);
    }
    function resetTransforms() {
      host.style.setProperty('--qmp-x', '0px');
      host.style.setProperty('--qmp-y', '0px');
      host.style.setProperty('--qmp-host-scale', '1');
      if (content && content !== host) {
        content.style.setProperty('--qmp-cx', '0px');
        content.style.setProperty('--qmp-cy', '0px');
        content.style.setProperty('--qmp-scale', '1');
      }
    }
    function move(event) {
      applyTransforms(event.clientX, event.clientY);
    }
    function leave() {
      resetTransforms();
    }
    host.setAttribute('data-qadc-mp-host', 'true');
    if (content && content !== host) content.setAttribute('data-qadc-mp-content', 'true');
    applyDuration();
    const area = host.parentElement || doc;
    const offs = [
      listeners(area, ['mousemove', 'pointermove'], move),
      listeners(area, ['mouseleave'], leave),
      listeners(host, ['pointerleave', 'mouseleave'], leave),
    ];
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        const nextContent = resolveMagneticParallaxContent(host, o.contentEl);
        if (nextContent !== content) {
          if (content && content !== host) {
            if (originalContentAttr !== null)
              content.setAttribute('data-qadc-mp-content', originalContentAttr);
            else content.removeAttribute('data-qadc-mp-content');
          }
          content = nextContent;
          if (content && content !== host) content.setAttribute('data-qadc-mp-content', 'true');
        }
        applyDuration();
        resetTransforms();
      },
      destroy() {
        offs.forEach((off) => off());
        if (content && content !== host) {
          if (originalContentAttr !== null)
            content.setAttribute('data-qadc-mp-content', originalContentAttr);
          else content.removeAttribute('data-qadc-mp-content');
        }
        restoreInlineStyles(hostSnapshot);
        if (contentSnapshot) restoreInlineStyles(contentSnapshot);
        if (originalHostAttr !== null) host.setAttribute('data-qadc-mp-host', originalHostAttr);
        else host.removeAttribute('data-qadc-mp-host');
      },
    };
  }
  function resolveStaggerTargets(targets) {
    if (typeof targets === 'string') {
      if (typeof document === 'undefined') return [];
      return Array.from(document.querySelectorAll(targets));
    }
    if (targets && typeof targets.nodeType === 'number' && targets.nodeType === 1) {
      return [targets];
    }
    if (!targets) return [];
    return Array.from(targets).filter((node) => node && node.nodeType === 1);
  }
  function applyStaggerEntry(targets, opts) {
    const scope = typeof globalThis !== 'undefined' ? globalThis : window;
    const o = merge(
      {
        animation: 'fade-up',
        duration: 520,
        stagger: 90,
        distance: 24,
        opacity: 0,
        easing: 'cubic-bezier(.22,1,.36,1)',
        threshold: 0.15,
        root: null,
        rootMargin: '0px',
        once: true,
        observe: null,
      },
      opts
    );
    ensureIdleEnhancerStyle(document);
    const seen = new Set();
    const snapshots = new Map();
    const active = new Set();
    let observer = null;
    let mutationObserver = null;
    let disposed = false;
    function getTransform() {
      switch (o.animation) {
        case 'slide-left':
          return `translateX(${-Math.abs(Number(o.distance) || 24)}px)`;
        case 'scale':
          return 'scale(.92)';
        case 'rotate':
          return `perspective(800px) rotateX(10deg) translateY(${Number(o.distance) || 24}px)`;
        case 'fade-up':
        default:
          return `translateY(${Number(o.distance) || 24}px)`;
      }
    }
    function prime(el, index) {
      if (!snapshots.has(el)) {
        snapshots.set(el, {
          style: el.getAttribute('style'),
          className: el.className,
          state: el.getAttribute('data-qadc-stagger-state'),
        });
      }
      el.classList.add('qadc-stagger-entry');
      el.setAttribute('data-qadc-stagger-state', 'pending');
      el.style.setProperty('--qse-duration', `${Math.max(120, Number(o.duration) || 520)}ms`);
      el.style.setProperty('--qse-delay', `${Math.max(0, index * (Number(o.stagger) || 90))}ms`);
      el.style.setProperty('--qse-ease', o.easing || 'cubic-bezier(.22,1,.36,1)');
      el.style.setProperty('--qse-opacity', `${Math.max(0, Math.min(1, Number(o.opacity) || 0))}`);
      el.style.setProperty('--qse-transform', getTransform());
      active.add(el);
    }
    function reveal(list) {
      list.forEach((el) => {
        seen.add(el);
        el.setAttribute('data-qadc-stagger-state', 'revealed');
      });
    }
    function reset(el) {
      if (seen.has(el) && o.once) return;
      el.setAttribute('data-qadc-stagger-state', 'pending');
    }
    function queueObserve(nodes) {
      nodes.forEach((el, index) => prime(el, active.size + index));
      if (observer) nodes.forEach((el) => observer.observe(el));
      else
        scope.requestAnimationFrame
          ? scope.requestAnimationFrame(() => reveal(nodes))
          : reveal(nodes);
    }
    const initial = resolveStaggerTargets(targets);
    initial.forEach((el, index) => prime(el, index));
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        (entries) => {
          const visible = [];
          entries.forEach((entry) => {
            const target = entry.target;
            if (entry.isIntersecting) {
              visible.push(target);
              if (o.once) observer.unobserve(target);
            } else if (!o.once) {
              reset(target);
            }
          });
          if (visible.length) reveal(visible);
        },
        {
          root: o.root && o.root.nodeType === 1 ? o.root : null,
          rootMargin: o.rootMargin || '0px',
          threshold: Number(o.threshold) || 0.15,
        }
      );
      initial.forEach((el) => observer.observe(el));
    } else {
      reveal(initial);
    }
    if (o.observe && o.observe.selector && typeof MutationObserver === 'function') {
      const observeRoot =
        (o.observe.root && o.observe.root.nodeType === 1 ? o.observe.root : document.body) ||
        document.body;
      mutationObserver = new MutationObserver((mutations) => {
        if (disposed) return;
        const fresh = [];
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!node || node.nodeType !== 1) return;
            if (node.matches && node.matches(o.observe.selector) && !active.has(node))
              fresh.push(node);
            if (node.querySelectorAll) {
              node.querySelectorAll(o.observe.selector).forEach((match) => {
                if (!active.has(match)) fresh.push(match);
              });
            }
          });
        });
        if (fresh.length)
          queueObserve(fresh.filter((node, index) => fresh.indexOf(node) === index));
      });
      mutationObserver.observe(observeRoot, { childList: true, subtree: true });
    }
    return {
      update(nextOpts) {
        Object.assign(o, nextOpts || {});
        Array.from(active).forEach((el, index) => prime(el, index));
      },
      reset() {
        seen.clear();
        Array.from(active).forEach((el) => {
          reset(el);
          if (observer) observer.observe(el);
        });
      },
      destroy() {
        disposed = true;
        if (observer) observer.disconnect();
        if (mutationObserver) mutationObserver.disconnect();
        snapshots.forEach((snapshot, el) => {
          if (snapshot.style === null) el.removeAttribute('style');
          else el.setAttribute('style', snapshot.style);
          el.className = snapshot.className;
          if (snapshot.state === null) el.removeAttribute('data-qadc-stagger-state');
          else el.setAttribute('data-qadc-stagger-state', snapshot.state);
        });
        active.clear();
      },
    };
  }
  function applyTiltCard(el, opts) {
    const doc = el.ownerDocument || document;
    let o = merge(
      { maxTilt: 15, perspective: 1000, scale: 1.03, speed: 200, glare: 0.15, radius: 24 },
      opts
    );
    ensureFxStyle(
      'qadc-fx-tc',
      '[data-qadc-tc="true"]{--qtc-s:200ms;--qtc-r:24px;--qtc-g:.15;--qtc-x:50%;--qtc-y:50%;position:relative;overflow:hidden;isolation:isolate;border-radius:var(--qtc-r);transform-style:preserve-3d;transition:transform var(--qtc-s) ease-out;will-change:transform}' +
        '[data-qadc-tc="true"]>*{position:relative;z-index:1}' +
        '[data-qadc-tc="true"]::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle at var(--qtc-x) var(--qtc-y),rgba(255,255,255,var(--qtc-g)),transparent 60%);opacity:0;transition:opacity .3s ease}' +
        '[data-qadc-tcs="1"]::before{opacity:1}',
      doc
    );
    const originalAttr = el.getAttribute('data-qadc-tc');
    const originalState = el.getAttribute('data-qadc-tcs');
    const snapshot = snapshotInlineStyles(
      [el],
      ['transform', '--qtc-s', '--qtc-r', '--qtc-g', '--qtc-x', '--qtc-y']
    );
    function apply() {
      el.setAttribute('data-qadc-tc', 'true');
      el.style.setProperty('--qtc-s', `${o.speed}ms`);
      el.style.setProperty('--qtc-r', `${o.radius}px`);
      el.style.setProperty('--qtc-g', o.glare);
    }
    function move(e) {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const tiltX = (0.5 - y) * o.maxTilt * 2;
      const tiltY = (x - 0.5) * o.maxTilt * 2;
      el.style.transform = `perspective(${o.perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${o.scale})`;
      el.style.setProperty('--qtc-x', `${x * 100}%`);
      el.style.setProperty('--qtc-y', `${y * 100}%`);
      el.setAttribute('data-qadc-tcs', '1');
    }
    function leave() {
      el.style.transform = '';
      el.removeAttribute('data-qadc-tcs');
    }
    apply();
    const offs = [
      listeners(el, ['pointermove'], move),
      listeners(el, ['pointerleave'], leave),
      listeners(el, ['touchmove'], (e) => {
        e.preventDefault();
        const t = e.touches && e.touches[0];
        if (!t) return;
        move({ clientX: t.clientX, clientY: t.clientY });
      }),
      listeners(el, ['touchend', 'touchcancel'], leave),
    ];
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
      },
      destroy() {
        offs.forEach((f) => f());
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) el.setAttribute('data-qadc-tc', originalAttr);
        else el.removeAttribute('data-qadc-tc');
        if (originalState !== null) el.setAttribute('data-qadc-tcs', originalState);
        else el.removeAttribute('data-qadc-tcs');
      },
    };
  }
  function applySpotlight(el, opts) {
    const o = merge({ radius: 120, darkness: 0.92, color: '#0a0a0a' }, opts);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5';
    const rgb = hexToRgbCsv(o.color);
    overlay.style.background = `radial-gradient(circle ${o.radius}px at 50% 50%, transparent 0%, rgba(${rgb},${o.darkness}) 100%)`;
    if (!el.style.position || el.style.position === 'static') el.style.position = 'relative';
    el.appendChild(overlay);
    function move(e) {
      const r = el.getBoundingClientRect();
      const p = getPointer(e);
      const x = p.x - r.left;
      const y = p.y - r.top;
      overlay.style.background = `radial-gradient(circle ${o.radius}px at ${x}px ${y}px, transparent 0%, rgba(${rgb},${o.darkness}) 100%)`;
    }
    const offs = [
      listeners(el, ['mousemove'], move),
      listeners(el, ['touchmove'], (e) => {
        e.preventDefault();
        move(e);
      }),
    ];
    return {
      destroy() {
        offs.forEach((f) => f());
        overlay.remove();
      },
    };
  }
  function ensureCardHostEffectStyle(doc) {
    ensureFxStyle(
      'qadc-fx-che',
      '[data-qadc-gh="true"]{--qgh-o:.5;--qgh-a:-45deg;--qgh-s:250%;--qgh-d:650ms;--qgh-rgba:rgba(255,255,255,.5);--qgh-from:-100% -100%;--qgh-to:100% 100%;position:relative;overflow:hidden;isolation:isolate}' +
        '[data-qadc-gh-radius="true"]{border-radius:var(--qgh-r)}' +
        '[data-qadc-gh="true"]>*{position:relative;z-index:1}' +
        '[data-qadc-gh="true"]::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;mix-blend-mode:screen;background:linear-gradient(var(--qgh-a),rgba(0,0,0,0) 54%,var(--qgh-rgba) 66%,rgba(0,0,0,0) 78%,rgba(0,0,0,0) 100%);background-size:var(--qgh-s) var(--qgh-s);background-repeat:no-repeat;background-position:var(--qgh-from);transition:background-position var(--qgh-d) ease;will-change:background-position}' +
        '[data-qadc-ghs="playing"]::after{background-position:var(--qgh-to)}' +
        '[data-qadc-gh-reset="true"]::after{transition:none}' +
        '[data-qadc-sc="true"]{--qsc-s:280px;--qsc-o:.34;--qsc-rgb:255,255,255;--qsc-x:50%;--qsc-y:50%;position:relative;overflow:hidden;isolation:isolate}' +
        '[data-qadc-sc="true"]>*{position:relative;z-index:1}' +
        '[data-qadc-sc="true"]::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(circle var(--qsc-s) at var(--qsc-x) var(--qsc-y),rgba(var(--qsc-rgb),var(--qsc-o)),transparent 72%)}' +
        '[data-qadc-bg="true"]{border-radius:var(--qbg-r,inherit);box-shadow:var(--qbg-bs,none)}',
      doc
    );
  }
  function applyGlareHover(host, opts) {
    const doc = host.ownerDocument || document;
    const ownerWindow = doc.defaultView || global;
    let o = merge(
      {
        glareOpacity: 0.5,
        glareAngle: -45,
        glareSize: 250,
        speed: 1,
        radius: null,
        trigger: 'hover',
        direction: 'left-to-right',
        interval: 1600,
        glareColor: '#ffffff',
      },
      opts
    );
    ensureCardHostEffectStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-gh');
    const originalState = host.getAttribute('data-qadc-ghs');
    const originalReset = host.getAttribute('data-qadc-gh-reset');
    const originalRadiusAttr = host.getAttribute('data-qadc-gh-radius');
    const snapshot = snapshotInlineStyles(
      [host],
      [
        '--qgh-o',
        '--qgh-a',
        '--qgh-s',
        '--qgh-d',
        '--qgh-r',
        '--qgh-rgba',
        '--qgh-from',
        '--qgh-to',
      ]
    );
    let releaseTimer = 0;
    let autoTimer = 0;
    function getDuration() {
      return Math.round(650 / Math.max(Number(o.speed) || 1, 0.1));
    }
    function getDirection() {
      const direction = String(o.direction || 'left-to-right').toLowerCase();
      if (direction === 'right-to-left' || direction === 'rtl') return 'right-to-left';
      if (
        direction === 'left-to-right+right-to-left' ||
        direction === 'both' ||
        direction === 'alternate' ||
        direction === 'ltr-rtl'
      )
        return 'both';
      return 'left-to-right';
    }
    function getRgba() {
      const color = String(o.glareColor || '#ffffff');
      const opacity = Math.max(0, Math.min(1, Number(o.glareOpacity) || 0.5));
      const hex = color.replace('#', '');
      if (/^[0-9a-f]{6}$/i.test(hex)) {
        return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${opacity})`;
      }
      if (/^[0-9a-f]{3}$/i.test(hex)) {
        return `rgba(${parseInt(hex[0] + hex[0], 16)}, ${parseInt(hex[1] + hex[1], 16)}, ${parseInt(hex[2] + hex[2], 16)}, ${opacity})`;
      }
      return color;
    }
    function applyDirectionVars(direction) {
      const reverse = direction === 'right-to-left';
      host.style.setProperty('--qgh-from', reverse ? '100% 100%' : '-100% -100%');
      host.style.setProperty('--qgh-to', reverse ? '-100% -100%' : '100% 100%');
    }
    function apply() {
      host.setAttribute('data-qadc-gh', 'true');
      host.style.setProperty('--qgh-a', `${o.glareAngle}deg`);
      host.style.setProperty('--qgh-s', `${o.glareSize}%`);
      host.style.setProperty('--qgh-d', `${getDuration()}ms`);
      host.style.setProperty('--qgh-rgba', getRgba());
      host.style.setProperty('--qgh-o', Math.max(0, Math.min(1, Number(o.glareOpacity) || 0.5)));
      if (o.radius !== null && o.radius !== undefined && o.radius !== '') {
        host.setAttribute('data-qadc-gh-radius', 'true');
        host.style.setProperty('--qgh-r', `${Number(o.radius) || 0}px`);
      } else {
        host.removeAttribute('data-qadc-gh-radius');
        host.style.removeProperty('--qgh-r');
      }
      applyDirectionVars(getDirection() === 'right-to-left' ? 'right-to-left' : 'left-to-right');
    }
    function resetWithoutTransition() {
      host.setAttribute('data-qadc-gh-reset', 'true');
      host.removeAttribute('data-qadc-ghs');
      void host.offsetWidth;
      host.removeAttribute('data-qadc-gh-reset');
    }
    function playSweep() {
      const duration = getDuration();
      const direction = getDirection();
      ownerWindow.clearTimeout(releaseTimer);
      if (direction === 'right-to-left') applyDirectionVars('right-to-left');
      else applyDirectionVars('left-to-right');
      host.removeAttribute('data-qadc-ghs');
      void host.offsetWidth;
      host.setAttribute('data-qadc-ghs', 'playing');
      if (direction === 'both') {
        releaseTimer = ownerWindow.setTimeout(() => {
          host.removeAttribute('data-qadc-ghs');
          releaseTimer = ownerWindow.setTimeout(resetWithoutTransition, duration + 80);
        }, duration + 40);
        return;
      }
      releaseTimer = ownerWindow.setTimeout(resetWithoutTransition, duration + 80);
    }
    function stopAuto() {
      ownerWindow.clearTimeout(autoTimer);
      autoTimer = 0;
    }
    function startAuto() {
      stopAuto();
      const schedule = () => {
        playSweep();
        const direction = getDirection();
        const cycle = direction === 'both' ? getDuration() * 2 : getDuration();
        autoTimer = ownerWindow.setTimeout(schedule, cycle + Math.max(0, Number(o.interval) || 1600));
      };
      autoTimer = ownerWindow.setTimeout(schedule, 80);
    }
    function bindTrigger() {
      stopAuto();
      host.removeEventListener('mouseenter', playSweep);
      if (o.trigger === 'auto') startAuto();
      else host.addEventListener('mouseenter', playSweep);
    }
    apply();
    bindTrigger();
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
        bindTrigger();
      },
      destroy() {
        ownerWindow.clearTimeout(releaseTimer);
        stopAuto();
        host.removeEventListener('mouseenter', playSweep);
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-gh', originalAttr);
        else host.removeAttribute('data-qadc-gh');
        if (originalState !== null) host.setAttribute('data-qadc-ghs', originalState);
        else host.removeAttribute('data-qadc-ghs');
        if (originalReset !== null) host.setAttribute('data-qadc-gh-reset', originalReset);
        else host.removeAttribute('data-qadc-gh-reset');
        if (originalRadiusAttr !== null) host.setAttribute('data-qadc-gh-radius', originalRadiusAttr);
        else host.removeAttribute('data-qadc-gh-radius');
      },
    };
  }
  function applySpotlightCard(host, opts) {
    const doc = host.ownerDocument || document;
    let o = merge({ radius: 280, opacity: 0.34, color: '#FFFFFF' }, opts);
    ensureCardHostEffectStyle(doc);
    const originalAttr = host.getAttribute('data-qadc-sc');
    const snapshot = snapshotInlineStyles(
      [host],
      ['--qsc-s', '--qsc-o', '--qsc-rgb', '--qsc-x', '--qsc-y']
    );
    function apply() {
      host.setAttribute('data-qadc-sc', 'true');
      host.style.setProperty('--qsc-s', `${o.radius}px`);
      host.style.setProperty('--qsc-o', o.opacity);
      host.style.setProperty('--qsc-rgb', hexToRgbCsv(o.color));
    }
    function setPointer(x, y) {
      host.style.setProperty('--qsc-x', `${x}%`);
      host.style.setProperty('--qsc-y', `${y}%`);
    }
    function resetPointer() {
      setPointer(50, 50);
    }
    function move(event) {
      const rect = host.getBoundingClientRect();
      setPointer(
        ((event.clientX - rect.left) / rect.width) * 100,
        ((event.clientY - rect.top) / rect.height) * 100
      );
    }
    apply();
    resetPointer();
    const offs = [
      listeners(host, ['mousemove'], move),
      listeners(host, ['mouseleave'], resetPointer),
    ];
    return {
      update(nextOpts) {
        o = merge(o, nextOpts);
        apply();
        resetPointer();
      },
      destroy() {
        offs.forEach((off) => off());
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-sc', originalAttr);
        else host.removeAttribute('data-qadc-sc');
      },
    };
  }
  function applyBorderGlow(host, opts) {
    const o = merge(
        {
          color1: '#ffffff',
          color2: '#A855F7',
          color3: '#38BDF8',
          intensity: 1,
          fillOpacity: 0.46,
          radius: 28,
        },
        opts
      ),
      originalAttr = host.getAttribute('data-qadc-bg'),
      snapshot = snapshotInlineStyles([host], ['--qbg-r', '--qbg-bs']),
      spotlight = applySpotlightCard(host, {
        radius: Math.max(180, o.radius * 8),
        opacity: o.fillOpacity,
        color: o.color1,
      });
    ensureCardHostEffectStyle(host.ownerDocument || document);
    host.setAttribute('data-qadc-bg', 'true');
    host.style.setProperty('--qbg-r', `${o.radius}px`);
    function updateGlow(x, y) {
      const rect = host.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const p = Math.max(Math.abs(x - cx) / cx, Math.abs(y - cy) / cy) * o.intensity;
      host.style.setProperty(
        '--qbg-bs',
        `0 0 ${Math.round(12 + p * 16)}px ${o.color1},0 0 ${Math.round(24 + p * 24)}px ${o.color2},0 0 ${Math.round(36 + p * 32)}px ${o.color3}`
      );
    }
    function move(event) {
      const rect = host.getBoundingClientRect();
      updateGlow(event.clientX - rect.left, event.clientY - rect.top);
    }
    function leave() {
      host.style.setProperty('--qbg-bs', '');
    }
    const offs = [listeners(host, ['pointermove'], move), listeners(host, ['pointerleave'], leave)];
    return {
      update(nextOpts) {
        Object.assign(o, nextOpts || {});
        host.style.setProperty('--qbg-r', `${o.radius}px`);
        spotlight.update({
          radius: Math.max(180, o.radius * 8),
          opacity: o.fillOpacity,
          color: o.color1,
        });
        leave();
      },
      destroy() {
        offs.forEach((off) => off());
        if (spotlight && spotlight.destroy) spotlight.destroy();
        restoreInlineStyles(snapshot);
        if (originalAttr !== null) host.setAttribute('data-qadc-bg', originalAttr);
        else host.removeAttribute('data-qadc-bg');
      },
    };
  }
  function applySweepHighlight(el, opts) {
    const defaults = {
      color: 'rgba(255,255,255,0.86)',
      width: 0.32,
      angle: -20,
      duration: 650,
      delay: 0,
      trigger: 'hover',
      direction: 'left-to-right',
      travel: 'outside',
      shape: 'gradient',
      tilt: 'rotate',
      height: null,
      opacity: 1,
      glowColor: '',
      glowBlur: 0,
      glowSpread: 0,
      easing: 'cubic-bezier(.22,1,.36,1)',
      blendMode: 'screen',
      clip: true,
      interval: 1800,
      once: false,
    };
    let o = merge(defaults, opts);
    const original = {
      position: el.style.position,
      overflow: el.style.overflow,
    };
    const changed = { position: false, overflow: false };
    const ownerDocument = el.ownerDocument || document;
    const ownerWindow = ownerDocument.defaultView || global;
    const computed = ownerWindow.getComputedStyle ? ownerWindow.getComputedStyle(el) : null;
    if (!computed || computed.position === 'static') {
      el.style.position = 'relative';
      changed.position = true;
    }
    if (o.clip) {
      el.style.overflow = 'hidden';
      changed.overflow = true;
    }
    const layer = ownerDocument.createElement('span');
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText =
      'position:absolute;top:-55%;bottom:-55%;left:0;pointer-events:none;border-radius:inherit;opacity:0;display:block;z-index:auto;will-change:transform,opacity';
    layer.style.mixBlendMode = o.blendMode;
    el.insertBefore(layer, el.firstChild);
    let timer = 0;
    let fadeTimer = 0;
    let offs = [];
    let currentAnimation = null;
    let cleanupTransition = null;
    function getWidthRatio() {
      const widthValue = Number(o.width);
      return Math.max(0, Math.min(0.9, isFinite(widthValue) ? widthValue : defaults.width));
    }
    function getTravel() {
      const hostWidth = el.getBoundingClientRect().width || el.offsetWidth || 1;
      const configuredLayerWidth = hostWidth * getWidthRatio();
      const measuredLayerWidth = layer.getBoundingClientRect().width;
      const layerWidth = measuredLayerWidth || configuredLayerWidth;
      if (o.travel === 'edge') {
        if (o.direction === 'right-to-left') {
          return {
            from: `translateX(${hostWidth}px)`,
            mid: `translateX(${hostWidth / 2}px)`,
            to: 'translateX(0px)',
          };
        }
        return {
          from: 'translateX(0px)',
          mid: `translateX(${hostWidth / 2}px)`,
          to: `translateX(${hostWidth}px)`,
        };
      }
      const glowPad = Math.max(0, Number(o.glowSpread) || 0) * 2;
      const travelPad = Math.max(layerWidth, hostWidth * 0.18, glowPad);
      if (o.direction === 'right-to-left') {
        return {
          from: `translateX(${hostWidth + travelPad}px)`,
          mid: `translateX(${(hostWidth - layerWidth) / 2}px)`,
          to: `translateX(${-layerWidth - travelPad}px)`,
        };
      }
      return {
        from: `translateX(${-layerWidth - travelPad}px)`,
        mid: `translateX(${(hostWidth - layerWidth) / 2}px)`,
        to: `translateX(${hostWidth + travelPad}px)`,
      };
    }
    function getTiltTransform() {
      const angle = Number(o.angle) || 0;
      return o.tilt === 'skew' ? `skewX(${angle}deg)` : `rotate(${angle}deg)`;
    }
    function getComposedTransform(position) {
      return `${position} ${getTiltTransform()}`;
    }
    function applyLayerStyle() {
      const width = getWidthRatio();
      const height = Number(o.height);
      layer.style.width = width * 100 + '%';
      if (height > 0 && height <= 1.6) {
        layer.style.top = ((1 - height) * 50).toFixed(3) + '%';
        layer.style.bottom = 'auto';
        layer.style.height = height * 100 + '%';
      } else {
        layer.style.top = '-55%';
        layer.style.bottom = '-55%';
        layer.style.height = 'auto';
      }
      const blur = Math.max(0, Number(o.glowBlur) || 0);
      const spread = Math.max(0, Number(o.glowSpread) || 0);
      const glow = `0 0 ${blur}px ${spread}px ${o.glowColor || o.color}`;
      if (o.shape === 'beam') {
        layer.style.background = o.color;
        layer.style.boxShadow = glow;
      } else {
        layer.style.background = `linear-gradient(90deg, transparent 0%, ${o.color} 48%, ${o.color} 52%, transparent 100%)`;
        layer.style.boxShadow = o.glowBlur || o.glowSpread ? glow : 'none';
      }
      layer.style.mixBlendMode = o.blendMode || defaults.blendMode;
      const travel = getTravel();
      layer.style.transform = getComposedTransform(travel.from);
    }
    function play() {
      const travel = getTravel();
      const duration = Math.max(1, Number(o.duration) || defaults.duration);
      const delay = Math.max(0, Number(o.delay) || 0);
      const rawOpacity = Number(o.opacity);
      const opacity = Math.max(
        0,
        Math.min(1, isFinite(rawOpacity) ? rawOpacity : defaults.opacity)
      );
      const tf = getComposedTransform(travel.from);
      const tm = getComposedTransform(travel.mid);
      const tt = getComposedTransform(travel.to);
      if (currentAnimation && currentAnimation.cancel) currentAnimation.cancel();
      if (cleanupTransition) cleanupTransition();
      if (fadeTimer) ownerWindow.clearTimeout(fadeTimer);
      layer.style.transition = 'none';
      layer.style.opacity = '0';
      layer.style.transform = tf;
      if (layer.animate) {
        currentAnimation = layer.animate(
          [
            { opacity: 0, transform: tf },
            { opacity, transform: tm, offset: 0.5 },
            { opacity: 0, transform: tt },
          ],
          {
            duration,
            delay,
            easing: o.easing || defaults.easing,
            fill: 'both',
          }
        );
        currentAnimation.onfinish = function () {
          layer.style.opacity = '0';
        };
        return currentAnimation;
      }
      void layer.offsetWidth;
      layer.style.transition = `transform ${duration}ms ${o.easing || defaults.easing} ${delay}ms, opacity ${Math.max(1, duration / 2)}ms linear ${delay}ms`;
      layer.style.opacity = String(opacity);
      layer.style.transform = tt;
      fadeTimer = ownerWindow.setTimeout(
        function () {
          layer.style.opacity = '0';
        },
        delay + duration / 2
      );
      function handleEnd() {
        layer.removeEventListener('transitionend', handleEnd);
      }
      cleanupTransition = () => layer.removeEventListener('transitionend', handleEnd);
      layer.addEventListener('transitionend', handleEnd);
    }
    function update(nextOpts) {
      o = merge(o, nextOpts);
      if (changed.overflow && !o.clip) {
        el.style.overflow = original.overflow;
        changed.overflow = false;
      } else if (o.clip && !changed.overflow) {
        el.style.overflow = 'hidden';
        changed.overflow = true;
      }
      applyLayerStyle();
      bindTrigger();
    }
    function clearTrigger() {
      if (timer) {
        ownerWindow.clearInterval(timer);
        timer = 0;
      }
      if (fadeTimer) {
        ownerWindow.clearTimeout(fadeTimer);
        fadeTimer = 0;
      }
      offs.forEach((off) => off());
      offs = [];
    }
    function bindTrigger() {
      clearTrigger();
      if (o.trigger === 'hover') {
        offs.push(listeners(el, ['mouseenter', 'focus'], play));
      } else if (o.trigger === 'click') {
        offs.push(listeners(el, ['click'], play));
      } else if (o.trigger === 'auto') {
        play();
        if (!o.once)
          timer = ownerWindow.setInterval(
            play,
            Math.max(300, Number(o.interval) || defaults.interval)
          );
      }
    }
    applyLayerStyle();
    bindTrigger();
    return {
      play,
      update,
      destroy() {
        clearTrigger();
        if (currentAnimation && currentAnimation.cancel) currentAnimation.cancel();
        if (cleanupTransition) cleanupTransition();
        layer.remove();
        if (changed.position) el.style.position = original.position;
        if (changed.overflow) el.style.overflow = original.overflow;
      },
    };
  }
  function applyBlueFlameButton(el, opts) {
    const BLUE_FLAME_STYLE_ID = 'qadc-fx-blue-flame-button-style';
    const BLUE_FLAME_ATTR = 'data-qadc-blue-flame';
    const BLUE_FLAME_STATE_ATTR = 'data-qadc-blue-flame-state';
    const BLUE_FLAME_VARS = [
      '--qadc-blue-flame-base-color',
      '--qadc-blue-flame-hover-color',
      '--qadc-blue-flame-text-color',
      '--qadc-blue-flame-base-shadow',
      '--qadc-blue-flame-hover-shadow',
      '--qadc-blue-flame-active-shadow',
      '--qadc-blue-flame-transition-in',
      '--qadc-blue-flame-transition-out',
      '--qadc-blue-flame-active-transition',
    ];
    const defaults = {
      baseColor: 'var(--motion-button-default, #4610B2)',
      hoverColor: 'var(--motion-button-hover, #651BF8)',
      textColor: '#fff',
      baseShadow: '0 0 0 0 transparent',
      hoverShadow: '0 0 30px 5px rgba(var(--motion-button-hover-rgb, 101, 27, 248), 0.62)',
      activeShadow: '0 0 0 0 transparent',
      shadowEnabled: true,
      sweepColor: 'var(--gray-default-white, #ffffff)',
      transitionIn: 'all 0.2s ease-in',
      transitionOut: 'all 0.2s ease-out',
      activeTransition: 'box-shadow 0.2s ease-in',
      trigger: 'auto',
      interval: 1500,
      once: false,
      sweep: null,
    };
    let o = merge(defaults, opts);
    const ownerDocument = el.ownerDocument || document;
    const original = {
      background: el.style.background,
      color: el.style.color,
      boxShadow: el.style.boxShadow,
      transition: el.style.transition,
      vars: BLUE_FLAME_VARS.reduce((acc, prop) => {
        acc[prop] = el.style.getPropertyValue(prop);
        return acc;
      }, {}),
      attr: el.getAttribute(BLUE_FLAME_ATTR),
      stateAttr: el.getAttribute(BLUE_FLAME_STATE_ATTR),
    };

    ensureFxStyle(
      BLUE_FLAME_STYLE_ID,
      [
        '[' + BLUE_FLAME_ATTR + '="true"]{',
        'background:var(--qadc-blue-flame-base-color,var(--motion-button-default,#4610B2));',
        'color:var(--qadc-blue-flame-text-color,#fff);',
        'box-shadow:var(--qadc-blue-flame-base-shadow,0 0 0 0 transparent);',
        'transition:var(--qadc-blue-flame-transition-in,all 0.2s ease-in);',
        '}',
        '[' + BLUE_FLAME_ATTR + '="true"][' + BLUE_FLAME_STATE_ATTR + '="hover"]{',
        'background:var(--qadc-blue-flame-hover-color,var(--motion-button-hover,#651BF8));',
        'color:var(--qadc-blue-flame-text-color,#fff);',
        'box-shadow:var(--qadc-blue-flame-hover-shadow,0 0 30px 5px rgba(var(--motion-button-hover-rgb, 101, 27, 248), 0.62));',
        'transition:var(--qadc-blue-flame-transition-out,all 0.2s ease-out);',
        '}',
        '[' + BLUE_FLAME_ATTR + '="true"][' + BLUE_FLAME_STATE_ATTR + '="active"]{',
        'background:var(--qadc-blue-flame-hover-color,var(--motion-button-hover,#651BF8));',
        'color:var(--qadc-blue-flame-text-color,#fff);',
        'box-shadow:var(--qadc-blue-flame-active-shadow,0 0 0 0 transparent);',
        'transition:var(--qadc-blue-flame-active-transition,box-shadow 0.2s ease-in);',
        '}',
      ].join(''),
      ownerDocument
    );

    function getSweepOptions() {
      return merge(
        {
          color: o.sweepColor,
          width: 0,
          angle: -20,
          duration: 500,
          travel: 'edge',
          shape: 'beam',
          tilt: 'skew',
          height: 0.86,
          opacity: 1,
          glowColor: o.sweepColor,
          glowBlur: 50,
          glowSpread: 30,
          easing: 'linear',
          trigger: 'manual',
          blendMode: 'normal',
          clip: true,
        },
        o.sweep
      );
    }
    function getHold() {
      return Math.max(1, Number(getSweepOptions().duration) || 500) + 180;
    }
    function applyThemeVars() {
      el.style.setProperty('--qadc-blue-flame-base-color', o.baseColor);
      el.style.setProperty('--qadc-blue-flame-hover-color', o.hoverColor);
      el.style.setProperty('--qadc-blue-flame-text-color', o.textColor);
      el.style.setProperty('--qadc-blue-flame-base-shadow', o.baseShadow);
      el.style.setProperty(
        '--qadc-blue-flame-hover-shadow',
        o.shadowEnabled === false ? '0 0 0 0 transparent' : o.hoverShadow
      );
      el.style.setProperty(
        '--qadc-blue-flame-active-shadow',
        o.shadowEnabled === false ? '0 0 0 0 transparent' : o.activeShadow
      );
      el.style.setProperty('--qadc-blue-flame-transition-in', o.transitionIn);
      el.style.setProperty('--qadc-blue-flame-transition-out', o.transitionOut);
      el.style.setProperty('--qadc-blue-flame-active-transition', o.activeTransition);
    }
    function applyState(nextState) {
      el.setAttribute(BLUE_FLAME_ATTR, 'true');
      el.setAttribute(BLUE_FLAME_STATE_ATTR, nextState);
    }
    applyThemeVars();
    applyState('base');
    const sweep = applySweepHighlight(el, getSweepOptions());
    return createButtonStateController(el, merge(o, { activeHold: getHold() }), {
      activate() {
        applyState('hover');
        sweep.play();
      },
      deactivate() {
        applyState('base');
      },
      press() {
        applyState('active');
      },
      release(active) {
        if (active) applyState('hover');
        else applyState('base');
      },
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        applyThemeVars();
        sweep.update(getSweepOptions());
        if (active) applyState('hover');
        else applyState('base');
      },
      destroy() {
        sweep.destroy();
        el.style.background = original.background;
        el.style.color = original.color;
        el.style.boxShadow = original.boxShadow;
        el.style.transition = original.transition;
        BLUE_FLAME_VARS.forEach((prop) => {
          if (original.vars[prop]) el.style.setProperty(prop, original.vars[prop]);
          else el.style.removeProperty(prop);
        });
        if (original.attr !== null) el.setAttribute(BLUE_FLAME_ATTR, original.attr);
        else el.removeAttribute(BLUE_FLAME_ATTR);
        if (original.stateAttr !== null) el.setAttribute(BLUE_FLAME_STATE_ATTR, original.stateAttr);
        else el.removeAttribute(BLUE_FLAME_STATE_ATTR);
      },
    });
  }
  function getButtonMotionSpeed(opts) {
    const speed = Number((opts && opts.speed) || 1);
    if (!isFinite(speed) || speed <= 0) return 1;
    return Math.max(0.1, Math.min(5, speed));
  }
  function getScaledMs(baseMs, opts) {
    return Math.max(1, Math.round(Number(baseMs || 0) / getButtonMotionSpeed(opts)));
  }
  function getScaledS(baseSeconds, opts) {
    return Math.max(0.01, Number(baseSeconds || 0) / getButtonMotionSpeed(opts));
  }
  function setInlineStyles(node, styles) {
    if (!node || !styles) return;
    Object.keys(styles).forEach((key) => {
      if (styles[key] === null || styles[key] === undefined) return;
      if (key.indexOf('--') === 0) node.style.setProperty(key, styles[key]);
      else node.style[key] = styles[key];
    });
  }
  function setPressScale(node, scale) {
    setInlineStyles(node, { transform: scale ? `scale(${scale})` : '' });
  }
  function snapshotInlineStyles(nodes, props) {
    return nodes.filter(Boolean).map((node) => ({
      node,
      values: props.reduce((acc, prop) => {
        acc[prop] = prop.indexOf('--') === 0 ? node.style.getPropertyValue(prop) : node.style[prop];
        return acc;
      }, {}),
    }));
  }
  function restoreInlineStyles(snapshot) {
    snapshot.forEach((entry) => {
      Object.keys(entry.values).forEach((prop) => {
        if (prop.indexOf('--') === 0) {
          if (entry.values[prop]) entry.node.style.setProperty(prop, entry.values[prop]);
          else entry.node.style.removeProperty(prop);
        } else {
          entry.node.style[prop] = entry.values[prop];
        }
      });
    });
  }
  function ensureFxStyle(id, cssText, doc) {
    const ownerDocument = doc || document;
    if (ownerDocument.getElementById(id)) return;
    const style = ownerDocument.createElement('style');
    style.id = id;
    style.textContent = cssText;
    ownerDocument.head.appendChild(style);
  }
  function createButtonStateController(el, opts, hooks) {
    const defaults = {
      trigger: 'hover',
      interval: 1500,
      once: false,
      activeHold: 720,
      pressScale: 0.96,
    };
    let o = merge(defaults, opts);
    const ownerDocument = el.ownerDocument || document;
    const ownerWindow = ownerDocument.defaultView || global;
    let active = false;
    let timer = 0;
    let resetTimer = 0;
    let offs = [];
    function clearResetTimer() {
      if (resetTimer) {
        ownerWindow.clearTimeout(resetTimer);
        resetTimer = 0;
      }
    }
    function activate() {
      clearResetTimer();
      active = true;
      if (hooks && hooks.activate) hooks.activate(o);
    }
    function deactivate() {
      clearResetTimer();
      active = false;
      if (hooks && hooks.deactivate) hooks.deactivate(o);
    }
    function play() {
      activate();
      resetTimer = ownerWindow.setTimeout(deactivate, getScaledMs(o.activeHold, o));
    }
    function press() {
      if (hooks && hooks.press) hooks.press(o);
    }
    function release() {
      if (hooks && hooks.release) hooks.release(active, o);
    }
    function clearTrigger() {
      if (timer) {
        ownerWindow.clearInterval(timer);
        timer = 0;
      }
      clearResetTimer();
      offs.forEach((off) => off());
      offs = [];
    }
    function bind() {
      clearTrigger();
      if (o.trigger === 'hover') {
        offs.push(listeners(el, ['mouseenter', 'focus'], activate));
        offs.push(listeners(el, ['mouseleave', 'blur'], deactivate));
        offs.push(listeners(el, ['pointerdown'], press));
        offs.push(listeners(ownerDocument, ['pointerup'], release));
      } else if (o.trigger === 'click') {
        offs.push(listeners(el, ['click'], play));
      } else if (o.trigger === 'auto') {
        play();
        if (!o.once) {
          timer = ownerWindow.setInterval(play, Math.max(300, getScaledMs(o.interval, o)));
        }
      }
    }
    bind();
    return {
      play,
      update(nextOpts) {
        o = merge(o, nextOpts);
        if (hooks && hooks.update) hooks.update(o, active);
        bind();
      },
      destroy() {
        clearTrigger();
        if (hooks && hooks.destroy) hooks.destroy(o);
      },
      isActive() {
        return active;
      },
    };
  }
  function applyElementMotion(el, opts) {
    let o = merge(
      {
        triggerEl: el,
        trigger: 'hover',
        activeStyles: {},
        inactiveStyles: {},
        props: ['transform', 'opacity', 'visibility', 'left', 'top', 'width', 'height', 'fontSize'],
        transition: 'transform 300ms ease, opacity 300ms ease, visibility 300ms ease',
        transitionProp: 'transition',
      },
      opts
    );
    const triggerEl = o.triggerEl || el;
    const snapshotProps = o.props.slice();
    if (o.transitionProp && snapshotProps.indexOf(o.transitionProp) === -1) {
      snapshotProps.push(o.transitionProp);
    }
    const snapshot = snapshotInlineStyles([el], snapshotProps);

    function resolveStyles(styles) {
      return typeof styles === 'function' ? styles(o, getScaledMs) : styles;
    }

    function applyTransition() {
      setInlineStyles(el, {
        [o.transitionProp]:
          typeof o.transition === 'function' ? o.transition(o, getScaledMs) : o.transition,
      });
    }

    function activate() {
      applyTransition();
      setInlineStyles(el, resolveStyles(o.activeStyles));
    }

    function deactivate() {
      applyTransition();
      setInlineStyles(el, resolveStyles(o.inactiveStyles));
    }

    return createButtonStateController(triggerEl, o, {
      activate,
      deactivate,
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
      },
    });
  }
  function applySendFlightButton(el, opts) {
    let o = merge(
      {
        hoverColor: '',
        iconSelector: '',
        iconWrapperSelector: '',
        mediaSelector: '',
        labelSelector: '',
        iconY: -1,
        iconRotate: 45,
        iconScale: 1.1,
        labelX: '5em',
        floatDuration: 600,
      },
      opts
    );
    const icon =
      resolveChild(el, o.iconSelector || o.iconEl) ||
      el.querySelector('[data-qadc-send-icon]') ||
      el.querySelector('.send-flight-icon') ||
      el.querySelector('svg, img');
    const wrapper =
      resolveChild(el, o.iconWrapperSelector || o.iconWrapperEl) ||
      el.querySelector('[data-qadc-send-icon-wrapper]') ||
      (icon && icon.querySelector ? icon.querySelector('.svg-wrapper') : null) ||
      el.querySelector('.svg-wrapper') ||
      icon;
    const media =
      resolveChild(el, o.mediaSelector || o.mediaEl) ||
      el.querySelector('[data-qadc-send-media]') ||
      (icon && icon.matches && icon.matches('svg, img') ? icon : null) ||
      (icon && icon.querySelector ? icon.querySelector('svg, img') : null) ||
      el.querySelector('svg, img') ||
      icon;
    const label =
      resolveChild(el, o.labelSelector || o.labelEl) ||
      el.querySelector('[data-qadc-send-label]') ||
      el.querySelector('.send-flight-label');
    const snapshot = snapshotInlineStyles(
      [el, icon, wrapper, media, label],
      [
        'background',
        'left',
        'transform',
        'transition',
        'animation',
        '--send-button-duration',
        '--send-press-duration',
        '--send-motion-duration',
        '--send-float-duration',
      ]
    );
    function applyTimingVars() {
      setInlineStyles(el, {
        '--send-button-duration': `${getScaledMs(200, o)}ms`,
        '--send-press-duration': `${getScaledMs(200, o)}ms`,
        '--send-motion-duration': `${getScaledMs(300, o)}ms`,
        '--send-float-duration': `${getScaledMs(o.floatDuration || 600, o)}ms`,
      });
    }
    function applyTransitions() {
      applyTimingVars();
      const duration = getScaledMs(300, o);
      setInlineStyles(icon, {
        transition: `left ${duration}ms ease-in-out, transform ${duration}ms ease-in-out`,
      });
      setInlineStyles(media, { transition: `transform ${duration}ms ease-in-out` });
      setInlineStyles(label, { transition: `transform ${duration}ms ease-in-out` });
      setInlineStyles(el, {
        transition: `background-color ${getScaledMs(200, o)}ms ease, transform ${getScaledMs(200, o)}ms ease`,
      });
    }
    function activate() {
      applyTransitions();
      if (o.hoverColor) setInlineStyles(el, { background: o.hoverColor });
      setInlineStyles(icon, { left: '50%', transform: 'translate(-50%, -50%)' });
      setInlineStyles(wrapper, {
        animation: `qadc-send-flight ${getScaledMs(o.floatDuration || 600, o)}ms ease-in-out infinite alternate`,
      });
      setInlineStyles(media, {
        transform: `translateY(${Number(o.iconY) || 0}px) rotate(${Number(o.iconRotate) || 0}deg) scale(${Number(o.iconScale) || 1})`,
      });
      setInlineStyles(label, { transform: `translateX(${o.labelX || '5em'})` });
    }
    function deactivate() {
      applyTransitions();
      if (o.hoverColor) setInlineStyles(el, { background: '' });
      setInlineStyles(icon, { left: '', transform: '' });
      setInlineStyles(wrapper, { animation: '' });
      setInlineStyles(media, { transform: '' });
      setInlineStyles(label, { transform: '' });
    }
    ensureFxStyle(
      'qadc-send-flight-button-css',
      '@keyframes qadc-send-flight{from{transform:translateY(0.1em)}to{transform:translateY(-0.1em)}}',
      el.ownerDocument
    );
    applyTimingVars();
    const controller = createButtonStateController(el, o, {
      activate,
      deactivate,
      press() {
        setPressScale(el, 0.95);
      },
      release() {
        setPressScale(el);
      },
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
      },
    });
    return controller;
  }
  function applyDeleteConfirmButton(el, opts) {
    let o = merge(
      { hoverColor: 'var(--delete-hover, var(--motion-button-hover, #651BF8))', iconSelector: '' },
      opts
    );
    const icon =
      resolveChild(el, o.iconSelector || o.iconEl) ||
      el.querySelector('[data-qadc-delete-icon]') ||
      el.querySelector('.svgIcon, svg, img');
    let label = el.querySelector('[data-qadc-delete-label]');
    if (!label) {
      label = (el.ownerDocument || document).createElement('span');
      label.dataset.qadcDeleteLabel = '1';
      label.textContent = o.label || el.getAttribute('aria-label') || 'Delete';
      el.insertBefore(label, el.firstChild);
    }
    el.setAttribute('data-qadc-delete-confirm', '1');
    ensureFxStyle(
      'qadc-delete-confirm-button-css',
      '[data-qadc-delete-confirm]::before{display:none!important;}',
      el.ownerDocument
    );
    const snapshot = snapshotInlineStyles(
      [el, icon, label],
      [
        'width',
        'height',
        'borderRadius',
        'backgroundColor',
        'transform',
        'transition',
        'fontSize',
        'opacity',
        'position',
        'top',
        'color',
        'lineHeight',
        'fontWeight',
        '--delete-button-duration',
        '--delete-press-duration',
        '--delete-icon-duration',
      ]
    );
    function applyTimingVars() {
      setInlineStyles(el, {
        '--delete-button-duration': `${getScaledMs(300, o)}ms`,
        '--delete-press-duration': `${getScaledMs(200, o)}ms`,
        '--delete-icon-duration': `${getScaledMs(280, o)}ms`,
      });
    }
    function applyBaseLabel() {
      setInlineStyles(label, {
        position: 'absolute',
        top: '-20px',
        color: 'var(--delete-foreground, currentColor)',
        lineHeight: '1',
        fontWeight: 'inherit',
        fontSize: '2px',
        opacity: '0',
        transform: 'none',
        transition: `font-size ${getScaledMs(300, o)}ms ease, opacity ${getScaledMs(300, o)}ms ease, transform ${getScaledMs(300, o)}ms ease`,
      });
    }
    function applyTransitions() {
      applyTimingVars();
      const duration = getScaledMs(300, o);
      setInlineStyles(el, {
        transition: `width ${duration}ms ease, border-radius ${duration}ms ease, background-color ${duration}ms ease, box-shadow ${duration}ms ease, transform ${getScaledMs(200, o)}ms ease`,
      });
      setInlineStyles(icon, {
        transition: `transform ${getScaledMs(280, o)}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      });
    }
    function activate() {
      applyTransitions();
      setInlineStyles(el, {
        width: 'var(--delete-width)',
        borderRadius: 'max(var(--delete-radius), calc(var(--delete-height) / 2))',
        backgroundColor: o.hoverColor,
      });
      setInlineStyles(icon, {
        width: 'var(--delete-height)',
        height: 'var(--delete-height)',
        transform: 'translateY(60%)',
      });
      setInlineStyles(label, {
        fontSize: 'var(--delete-font-size)',
        opacity: '1',
        transform: 'translateY(30px)',
      });
    }
    function deactivate() {
      applyTransitions();
      setInlineStyles(el, { width: '', borderRadius: '', backgroundColor: '' });
      setInlineStyles(icon, { width: '', height: '', transform: '' });
      applyBaseLabel();
    }
    applyTimingVars();
    applyTransitions();
    applyBaseLabel();
    return createButtonStateController(el, o, {
      activate,
      deactivate,
      press() {
        setPressScale(el, 0.96);
      },
      release() {
        setPressScale(el);
      },
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        applyTimingVars();
        applyTransitions();
        applyBaseLabel();
        label.textContent = o.label || label.textContent;
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
        if (label && label.dataset.qadcDeleteLabel === '1') label.remove();
        el.removeAttribute('data-qadc-delete-confirm');
      },
    });
  }
  function applyLogoutRevealButton(el, opts) {
    let o = merge(
      {
        hoverColor: '',
        iconSelector: '',
        labelSelector: '',
      },
      opts
    );
    const text =
      resolveChild(el, o.labelSelector || o.labelEl) ||
      el.querySelector('[data-qadc-logout-label]') ||
      el.querySelector('.text');
    const snapshot = snapshotInlineStyles(
      [el, text],
      [
        '--logout-motion-duration',
        '--logout-opacity-duration',
        '--logout-bg-duration',
        '--logout-press-duration',
        '--logout-icon-duration',
        'width',
        'minWidth',
        'paddingLeft',
        'paddingRight',
        'borderRadius',
        'backgroundColor',
        'maxWidth',
        'marginLeft',
        'opacity',
        'transform',
        'transition',
      ]
    );
    function applyTransitions() {
      setInlineStyles(el, {
        '--logout-motion-duration': `${getScaledMs(300, o)}ms`,
        '--logout-opacity-duration': `${getScaledMs(200, o)}ms`,
        '--logout-bg-duration': `${getScaledMs(260, o)}ms`,
        '--logout-press-duration': `${getScaledMs(200, o)}ms`,
        '--logout-icon-duration': `${getScaledMs(280, o)}ms`,
      });
      const duration = getScaledMs(300, o);
      setInlineStyles(el, {
        transition: `width ${duration}ms ease, min-width ${duration}ms ease, padding ${duration}ms ease, background-color ${getScaledMs(260, o)}ms ease, transform ${getScaledMs(200, o)}ms ease`,
      });
      setInlineStyles(text, {
        transition: `max-width ${duration}ms ease, margin-left ${duration}ms ease, opacity ${getScaledMs(200, o)}ms ease, transform ${duration}ms ease`,
      });
    }
    function activate() {
      applyTransitions();
      setInlineStyles(el, {
        width:
          'calc(var(--logout-height) + var(--logout-hover-padding-x) + var(--logout-hover-padding-x) + var(--logout-icon-text-gap) + var(--logout-text-space))',
        minWidth:
          'calc(var(--logout-height) + var(--logout-hover-padding-x) + var(--logout-hover-padding-x) + var(--logout-icon-text-gap) + var(--logout-text-space))',
        paddingLeft: 'var(--logout-hover-padding-x)',
        paddingRight: 'var(--logout-hover-padding-x)',
        borderRadius: 'var(--logout-radius)',
        backgroundColor: o.hoverColor,
      });
      setInlineStyles(text, {
        maxWidth: 'var(--logout-text-space)',
        marginLeft: 'var(--logout-icon-text-gap)',
        opacity: '1',
        transform: 'translateX(0)',
      });
    }
    function deactivate() {
      applyTransitions();
      setInlineStyles(el, {
        width: '',
        minWidth: '',
        paddingLeft: '',
        paddingRight: '',
        borderRadius: '',
        backgroundColor: '',
      });
      setInlineStyles(text, { maxWidth: '', marginLeft: '', opacity: '', transform: '' });
    }
    applyTransitions();
    return createButtonStateController(el, o, {
      activate,
      deactivate,
      press() {
        setPressScale(el, 0.96);
      },
      release() {
        setPressScale(el);
      },
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
      },
    });
  }
  function applyBackToTopButton(el, opts) {
    let o = merge(
      {
        hoverColor: '',
        iconSelector: '',
        labelSelector: '',
      },
      opts
    );
    const icon =
      resolveChild(el, o.iconSelector || o.iconEl) ||
      el.querySelector('[data-qadc-back-top-icon]') ||
      el.querySelector('.arrow-reveal-icon') ||
      el.querySelector('svg, img');
    const text =
      resolveChild(el, o.labelSelector || o.labelEl) ||
      el.querySelector('[data-qadc-back-top-label]') ||
      el.querySelector('.arrow-reveal-text');
    const snapshot = snapshotInlineStyles(
      [el, icon, text],
      [
        '--arrow-motion-duration',
        '--arrow-opacity-duration',
        '--arrow-bg-duration',
        '--arrow-press-duration',
        'width',
        'minWidth',
        'borderRadius',
        'backgroundColor',
        'opacity',
        'transform',
        'transition',
      ]
    );
    function applyTransitions() {
      setInlineStyles(el, {
        '--arrow-motion-duration': `${getScaledMs(300, o)}ms`,
        '--arrow-opacity-duration': `${getScaledMs(200, o)}ms`,
        '--arrow-bg-duration': `${getScaledMs(260, o)}ms`,
        '--arrow-press-duration': `${getScaledMs(200, o)}ms`,
      });
      const duration = getScaledMs(300, o);
      setInlineStyles(el, {
        transition: `width ${duration}ms ease, min-width ${duration}ms ease, padding ${duration}ms ease, background-color ${getScaledMs(260, o)}ms ease, transform ${getScaledMs(200, o)}ms ease`,
      });
      setInlineStyles(icon, {
        transition: `opacity ${getScaledMs(200, o)}ms ease, transform ${duration}ms ease`,
      });
      setInlineStyles(text, {
        transition: `opacity ${getScaledMs(200, o)}ms ease, transform ${duration}ms ease`,
      });
    }
    function activate() {
      applyTransitions();
      setInlineStyles(el, {
        width:
          'max(var(--arrow-height), calc(var(--arrow-text-space) + var(--arrow-hover-padding-x) + var(--arrow-hover-padding-x)))',
        minWidth:
          'max(var(--arrow-height), calc(var(--arrow-text-space) + var(--arrow-hover-padding-x) + var(--arrow-hover-padding-x)))',
        borderRadius: 'var(--arrow-radius)',
        backgroundColor: o.hoverColor,
      });
      setInlineStyles(icon, { opacity: '0', transform: 'translateY(-200%)' });
      setInlineStyles(text, { opacity: '1', transform: 'translateY(0)' });
    }
    function deactivate() {
      applyTransitions();
      setInlineStyles(el, { width: '', minWidth: '', borderRadius: '', backgroundColor: '' });
      setInlineStyles(icon, { opacity: '', transform: '' });
      setInlineStyles(text, { opacity: '', transform: '' });
    }
    applyTransitions();
    return createButtonStateController(el, o, {
      activate,
      deactivate,
      press() {
        setPressScale(el, 0.96);
      },
      release() {
        setPressScale(el);
      },
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
      },
    });
  }
  function applyDownloadTooltipButton(el, opts) {
    let o = merge(
      {
        hoverColor: 'var(--download-hover, var(--motion-button-hover, #651BF8))',
        textSelector: '',
        iconSelector: '',
        tooltipSelector: '',
      },
      opts
    );
    const text =
      resolveChild(el, o.textSelector || o.textEl) ||
      el.querySelector('[data-qadc-download-label]') ||
      el.querySelector('.text');
    const icon =
      resolveChild(el, o.iconSelector || o.iconEl) ||
      el.querySelector('[data-qadc-download-icon]') ||
      el.querySelector('.icon');
    const tooltip =
      resolveChild(el, o.tooltipSelector || o.tooltipEl) ||
      el.querySelector('[data-qadc-download-tooltip]') ||
      el.querySelector('.download-tooltip');
    const snapshot = snapshotInlineStyles(
      [el, text, icon, tooltip],
      [
        'background',
        'transform',
        'opacity',
        'visibility',
        'transition',
        '--download-button-duration',
        '--download-slide-duration',
        '--download-tooltip-duration',
      ]
    );
    function applyTimingVars() {
      setInlineStyles(el, {
        '--download-button-duration': `${getScaledMs(300, o)}ms`,
        '--download-slide-duration': `${getScaledMs(500, o)}ms`,
        '--download-tooltip-duration': `${getScaledMs(320, o)}ms`,
      });
    }
    function applyTransitions() {
      applyTimingVars();
      const slideDuration = getScaledMs(500, o);
      const tooltipDuration = getScaledMs(320, o);
      setInlineStyles(el, {
        transition: `width ${getScaledMs(300, o)}ms ease, background ${getScaledMs(300, o)}ms ease, border-radius ${getScaledMs(300, o)}ms ease`,
      });
      setInlineStyles(text, { transition: `transform ${slideDuration}ms ease` });
      setInlineStyles(icon, { transition: `transform ${slideDuration}ms ease` });
      setInlineStyles(tooltip, {
        transition: `opacity ${tooltipDuration}ms ease, visibility ${tooltipDuration}ms ease, transform ${tooltipDuration}ms ease`,
      });
    }
    function activate() {
      applyTransitions();
      setInlineStyles(el, { background: o.hoverColor });
      setInlineStyles(text, { transform: 'translateY(-120%)' });
      setInlineStyles(icon, { transform: 'translateY(0)' });
      setInlineStyles(tooltip, {
        opacity: '1',
        visibility: 'visible',
        transform: 'translate(-50%, 0)',
      });
    }
    function deactivate() {
      applyTransitions();
      setInlineStyles(el, { background: '' });
      setInlineStyles(text, { transform: '' });
      setInlineStyles(icon, { transform: '' });
      setInlineStyles(tooltip, { opacity: '', visibility: '', transform: '' });
    }
    applyTimingVars();
    return createButtonStateController(el, o, {
      activate,
      deactivate,
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
      },
    });
  }
  function applyBellReminderButton(el, opts) {
    let o = merge(
      {
        hoverColor: '',
        iconSelector: '',
        speed: 1,
        degrees: 10,
        duration: 900,
        trigger: 'hover',
      },
      opts
    );
    const bell =
      resolveChild(el, o.iconSelector || o.iconEl) ||
      el.querySelector('[data-qadc-bell-icon]') ||
      el.querySelector('.bell, .bellReminderIcon, svg, img');
    const snapshot = snapshotInlineStyles(
      [el, bell],
      [
        'backgroundColor',
        'transform',
        'transition',
        'animation',
        '--bell-button-duration',
        '--bell-press-duration',
        '--bell-ring-duration',
      ]
    );
    let currentAnimation = null;
    setInlineStyles(bell, { animation: 'none' });
    function applyTimingVars() {
      setInlineStyles(el, {
        '--bell-button-duration': `${getScaledMs(300, o)}ms`,
        '--bell-press-duration': `${getScaledMs(200, o)}ms`,
        '--bell-ring-duration': `${getScaledMs(Number(o.duration) || 900, o)}ms`,
      });
    }
    function applyTransitions() {
      applyTimingVars();
      setInlineStyles(el, {
        transition: `background-color ${getScaledMs(300, o)}ms ease, border-radius ${getScaledMs(300, o)}ms ease, transform ${getScaledMs(200, o)}ms ease`,
      });
    }
    function playRing() {
      if (!bell || !bell.animate) return;
      if (currentAnimation && currentAnimation.cancel) currentAnimation.cancel();
      const degrees = Number(o.degrees) || 10;
      currentAnimation = bell.animate(
        [
          { transform: 'rotateZ(0deg)', offset: 0 },
          { transform: `rotateZ(${degrees}deg)`, offset: 0.15 },
          { transform: `rotateZ(${-degrees}deg)`, offset: 0.3 },
          { transform: `rotateZ(${degrees / 2}deg)`, offset: 0.45 },
          { transform: `rotateZ(${-degrees / 2}deg)`, offset: 0.6 },
          { transform: `rotateZ(${degrees / 5}deg)`, offset: 0.75 },
          { transform: 'rotateZ(0deg)', offset: 1 },
        ],
        { duration: getScaledMs(Number(o.duration) || 900, o), easing: 'linear', fill: 'both' }
      );
    }
    function activate() {
      applyTransitions();
      if (o.hoverColor) setInlineStyles(el, { backgroundColor: o.hoverColor });
      playRing();
    }
    function deactivate() {
      applyTransitions();
      if (o.hoverColor) setInlineStyles(el, { backgroundColor: '' });
    }
    applyTimingVars();
    return createButtonStateController(el, o, {
      activate,
      deactivate,
      press() {
        setPressScale(el, 0.8);
      },
      release() {
        setPressScale(el);
      },
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        if (active) activate();
        else deactivate();
      },
      destroy() {
        if (currentAnimation && currentAnimation.cancel) currentAnimation.cancel();
        restoreInlineStyles(snapshot);
      },
    });
  }
  function applyArrowSlideButton(el, opts) {
    let o = merge(
      {
        hoverColor: '',
        iconSelector: '',
        labelSelector: '',
        iconTranslate: 'var(--kind-icon-shift, 32px)',
        iconScale: 1.12,
        labelX: '0.25em',
      },
      opts
    );
    const icon =
      resolveChild(el, o.iconSelector || o.iconEl) ||
      el.querySelector('[data-qadc-arrow-icon]') ||
      el.querySelector('.svg-wrapper') ||
      el.querySelector('svg, img');
    const text =
      resolveChild(el, o.labelSelector || o.labelEl) ||
      el.querySelector('[data-qadc-arrow-label]') ||
      el.querySelector('.text');
    const snapshot = snapshotInlineStyles(
      [el, icon, text],
      [
        'background',
        'transform',
        'opacity',
        'transition',
        '--kind-button-duration',
        '--kind-press-duration',
        '--kind-motion-duration',
        '--kind-label-duration',
      ]
    );
    function applyTimingVars() {
      setInlineStyles(el, {
        '--kind-button-duration': `${getScaledMs(300, o)}ms`,
        '--kind-press-duration': `${getScaledMs(200, o)}ms`,
        '--kind-motion-duration': `${getScaledMs(300, o)}ms`,
        '--kind-label-duration': `${getScaledMs(350, o)}ms`,
      });
    }
    function applyTransitions() {
      applyTimingVars();
      const duration = getScaledMs(300, o);
      setInlineStyles(el, {
        transition: `background-color ${duration}ms ease, border-radius ${duration}ms ease, transform ${getScaledMs(200, o)}ms ease`,
      });
      setInlineStyles(icon, {
        transition: `transform ${duration}ms ease-in-out, color ${duration}ms ease-in-out`,
      });
      setInlineStyles(text, {
        transition: `opacity ${getScaledMs(350, o)}ms ease-in-out, transform ${getScaledMs(350, o)}ms ease-in-out`,
      });
    }
    function activate() {
      applyTransitions();
      if (o.hoverColor) setInlineStyles(el, { background: o.hoverColor });
      setInlineStyles(icon, {
        transform: `translateX(${o.iconTranslate}) scale(${Number(o.iconScale) || 1.12})`,
      });
      setInlineStyles(text, { opacity: '0', transform: `translateX(${o.labelX || '0.25em'})` });
    }
    function deactivate() {
      applyTransitions();
      if (o.hoverColor) setInlineStyles(el, { background: '' });
      setInlineStyles(icon, { transform: '' });
      setInlineStyles(text, { opacity: '', transform: '' });
    }
    applyTimingVars();
    return createButtonStateController(el, o, {
      activate,
      deactivate,
      press() {
        setPressScale(el, 0.95);
      },
      release() {
        setPressScale(el);
      },
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
      },
    });
  }
  function applyStarBorderButton(el, opts) {
    const STAR_BORDER_BUTTON_STYLE_ID = 'qadc-fx-star-border-button-style';
    const STAR_BORDER_BUTTON_ATTR = 'data-qadc-star-border-button';
    const STAR_BORDER_BUTTON_OVERLAY_ATTR = 'data-qadc-star-border-button-overlay';
    let o = merge(
      {
        color: '#ffffff',
        speed: 1,
        hoverColor: '',
        thickness: 1,
        radius: null,
      },
      opts
    );
    function createLayer(doc, className) {
      const layer = doc.createElement('span');
      layer.className = className;
      layer.setAttribute('aria-hidden', 'true');
      setInlineStyles(layer, {
        position: 'absolute',
        width: '300%',
        height: '50%',
        opacity: '0.7',
        borderRadius: '50%',
        zIndex: '0',
        pointerEvents: 'none',
        background:
          'radial-gradient(circle, var(--qadc-star-border-color, #fff), transparent 10%)',
      });
      if (className.indexOf('bottom') >= 0) {
        setInlineStyles(layer, { bottom: '-12px', right: '-250%' });
      } else {
        setInlineStyles(layer, { top: '-12px', left: '-250%' });
      }
      return layer;
    }
    function ensureShell(target) {
      const doc = target.ownerDocument || document;
      const isShell = target.classList && target.classList.contains('motion-star-shell');
      const existingShell = isShell
        ? target
        : target.closest && target.closest('.motion-star-shell');
      let shell = existingShell || null;
      let button = null;
      let createdShell = false;
      if (!shell) {
        shell = doc.createElement('span');
        shell.className = 'motion-star-shell qadc-star-border-shell';
        target.parentNode.insertBefore(shell, target);
        shell.appendChild(target);
        button = target;
        createdShell = true;
      } else {
        button =
          shell.querySelector('.motion-star-button') ||
          shell.querySelector('button, [role="button"], div') ||
          target;
      }
      let bottom = shell.querySelector('.motion-star-border-bottom');
      let top = shell.querySelector('.motion-star-border-top');
      const createdLayers = [];
      if (!bottom) {
        bottom = createLayer(doc, 'motion-star-border-bottom');
        shell.insertBefore(bottom, shell.firstChild);
        createdLayers.push(bottom);
      }
      if (!top) {
        top = createLayer(doc, 'motion-star-border-top');
        shell.insertBefore(top, shell.firstChild);
        createdLayers.push(top);
      }
      return { shell, button, bottom, top, createdShell, createdLayers };
    }
    const doc = el.ownerDocument || document;
    ensureFxStyle(
      'qadc-star-border-keyframes',
      '@keyframes motion-star-border-bottom{0%{transform:translate(0%,0%);opacity:1}100%{transform:translate(-100%,0%);opacity:0}}' +
        '@keyframes motion-star-border-top{0%{transform:translate(0%,0%);opacity:1}100%{transform:translate(100%,0%);opacity:0}}',
      doc
    );
    ensureFxStyle(
      STAR_BORDER_BUTTON_STYLE_ID,
      '[' +
        STAR_BORDER_BUTTON_ATTR +
        '="true"]{' +
        'transition:var(--qadc-star-border-button-transition, background-color 200ms ease, transform 200ms ease);' +
        '}' +
        '[' +
        STAR_BORDER_BUTTON_OVERLAY_ATTR +
        '="true"]{' +
        'position:fixed;' +
        'pointer-events:none;' +
        'overflow:hidden;' +
        'z-index:2147483646;' +
        'box-sizing:border-box;' +
        '}',
      doc
    );
    function getRadius(button) {
      if (o.radius !== null && o.radius !== undefined && o.radius !== '') {
        return Math.max(0, Number(o.radius) || 0) + 'px';
      }
      const ownerWindow = doc.defaultView || global;
      const computed = ownerWindow.getComputedStyle ? ownerWindow.getComputedStyle(button) : null;
      return (computed && computed.borderRadius) || 'inherit';
    }
    function applySiblingOverlayMode(button) {
      const ownerWindow = doc.defaultView || global;
      const parent = button.parentNode;
      if (!parent)
        throw new Error('QADC FX star-border-button overlay mode requires a mounted host.');
      const overlay = doc.createElement('span');
      overlay.setAttribute(STAR_BORDER_BUTTON_OVERLAY_ATTR, 'true');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.setProperty(
        '--qadc-star-border-thickness',
        `${Math.max(0, Number(o.thickness) || 0)}px`
      );
      setInlineStyles(overlay, {
        position: 'fixed',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: '2147483646',
        boxSizing: 'border-box',
        WebkitMask:
          'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      });
      const bottom = createLayer(doc, 'motion-star-border-bottom');
      const top = createLayer(doc, 'motion-star-border-top');
      overlay.appendChild(bottom);
      overlay.appendChild(top);
      // Portal the overlay to body so viewport coordinates are not shifted by
      // preview/detail containers that create fixed-position containing blocks.
      (doc.body || parent).appendChild(overlay);
      const originalTransition = button.style.getPropertyValue(
        '--qadc-star-border-button-transition'
      );
      const originalButtonAttr = button.getAttribute(STAR_BORDER_BUTTON_ATTR);
      function syncBounds() {
        const rect = button.getBoundingClientRect();
        const thickness = Math.max(0, Number(o.thickness) || 0);
        const visualThickness = Math.max(2, thickness);
        const radius = getRadius(button);
        setInlineStyles(overlay, {
          left: rect.left + 'px',
          top: rect.top + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          padding: visualThickness + 'px',
          borderRadius: radius,
          '--qadc-star-border-thickness': visualThickness + 'px',
        });
      }
      function startObservers() {
        ownerWindow.addEventListener('resize', syncBounds);
        ownerWindow.addEventListener('scroll', syncBounds, true);
      }
      function stopObservers() {
        ownerWindow.removeEventListener('resize', syncBounds);
        ownerWindow.removeEventListener('scroll', syncBounds, true);
      }
      function applyButtonModeStyle() {
        button.setAttribute(STAR_BORDER_BUTTON_ATTR, 'true');
        button.style.setProperty(
          '--qadc-star-border-button-transition',
          `background-color ${getScaledMs(200, o)}ms ease, transform ${getScaledMs(200, o)}ms ease`
        );
      }
      const border = {
        update(nextOpts) {
          o = merge(o, nextOpts);
          const duration = getScaledS(6, o).toFixed(2) + 's';
          const color = o.color || '#ffffff';
          setInlineStyles(bottom, {
            animation: `motion-star-border-bottom ${duration} linear infinite alternate`,
            animationDelay: '0s',
            '--qadc-star-border-color': color,
            filter: '',
          });
          setInlineStyles(top, {
            animation: `motion-star-border-top ${duration} linear infinite alternate`,
            animationDelay: '0s',
            '--qadc-star-border-color': color,
            filter: '',
          });
        },
        destroy() {
          bottom.style.animation = '';
          bottom.style.animationDelay = '';
          bottom.style.filter = '';
          top.style.animation = '';
          top.style.animationDelay = '';
          top.style.filter = '';
          [
            '--qadc-star-border-color',
            '--qadc-star-border-tail',
            '--qadc-star-border-thickness',
          ].forEach((prop) => {
            bottom.style.removeProperty(prop);
            top.style.removeProperty(prop);
          });
        },
      };
      border.update();
      syncBounds();
      applyButtonModeStyle();
      startObservers();
      const motion = applyElementMotion(button, {
        ...o,
        triggerEl: button,
        activeStyles: (current) => ({ background: current.hoverColor }),
        inactiveStyles: { background: '' },
        props: ['background'],
        transitionProp: '--qadc-star-border-button-transition',
        transition: (current) => `background-color ${getScaledMs(200, current)}ms ease`,
      });
      return {
        play() {
          if (motion.play) motion.play();
        },
        update(nextOpts) {
          o = merge(o, nextOpts);
          applyButtonModeStyle();
          syncBounds();
          border.update(nextOpts);
          motion.update(nextOpts);
        },
        destroy() {
          motion.destroy();
          border.destroy();
          stopObservers();
          if (originalTransition) {
            button.style.setProperty('--qadc-star-border-button-transition', originalTransition);
          } else {
            button.style.removeProperty('--qadc-star-border-button-transition');
          }
          if (originalButtonAttr !== null)
            button.setAttribute(STAR_BORDER_BUTTON_ATTR, originalButtonAttr);
          else button.removeAttribute(STAR_BORDER_BUTTON_ATTR);
          overlay.remove();
        },
      };
    }
    if (!opts || opts.layoutMode !== 'wrapper') {
      return applySiblingOverlayMode(el);
    }
    const parts = ensureShell(el);
    const { shell, button, bottom, top } = parts;
    const snapshot = snapshotInlineStyles(
      [shell, button, bottom, top],
      [
        'display',
        'position',
        'overflow',
        'padding',
        'borderRadius',
        'lineHeight',
        'background',
        'backgroundColor',
        'animation',
        'animationDelay',
        'filter',
        '--qadc-star-border-button-transition',
        '--qadc-star-border-color',
        '--qadc-star-border-tail',
        '--qadc-star-border-thickness',
      ]
    );
    const originalButtonAttr = button.getAttribute(STAR_BORDER_BUTTON_ATTR);
    function applyShellStyle() {
      const thickness = Math.max(0, Number(o.thickness) || 0);
      setInlineStyles(shell, {
        display: 'inline-block',
        position: 'relative',
        overflow: 'hidden',
        padding: thickness + 'px 0',
        borderRadius: getRadius(button),
        lineHeight: '0',
      });
    }
    function apply() {
      const duration = getScaledS(3, o).toFixed(2) + 's';
      const color = o.color || '#ffffff';
      const thickness = Math.max(1, Number(o.thickness) || 1) + 'px';
      const tail = o.tailColor || `color-mix(in srgb, ${color} 24%, transparent)`;
      applyShellStyle();
      setInlineStyles(bottom, {
        animation: `motion-star-border-bottom ${duration} linear infinite`,
        animationDelay: '0s',
        '--qadc-star-border-color': color,
        '--qadc-star-border-tail': tail,
        '--qadc-star-border-thickness': thickness,
        filter: '',
      });
      setInlineStyles(top, {
        animation: `motion-star-border-top ${duration} linear infinite`,
        animationDelay: '-' + (Number.parseFloat(duration) / 2 || 1.5).toFixed(2) + 's',
        '--qadc-star-border-color': color,
        '--qadc-star-border-tail': tail,
        '--qadc-star-border-thickness': thickness,
        filter: '',
      });
      button.setAttribute(STAR_BORDER_BUTTON_ATTR, 'true');
      button.style.setProperty(
        '--qadc-star-border-button-transition',
        `background-color ${getScaledMs(200, o)}ms ease, transform ${getScaledMs(200, o)}ms ease`
      );
    }
    function activate() {
      setInlineStyles(button, { background: o.hoverColor });
    }
    function deactivate() {
      setInlineStyles(button, { background: '' });
    }
    apply();
    return createButtonStateController(shell, o, {
      activate,
      deactivate,
      update(nextOpts, active) {
        o = merge(o, nextOpts);
        apply();
        if (active) activate();
        else deactivate();
      },
      destroy() {
        restoreInlineStyles(snapshot);
        if (originalButtonAttr !== null)
          button.setAttribute(STAR_BORDER_BUTTON_ATTR, originalButtonAttr);
        else button.removeAttribute(STAR_BORDER_BUTTON_ATTR);
        parts.createdLayers.forEach((layer) => layer.remove());
        if (parts.createdShell && shell.parentNode) {
          shell.parentNode.insertBefore(button, shell);
          shell.remove();
        }
      },
    });
  }
  const SPLIT_PRESETS = {
    'fade-up': { translateY: 40, opacity: 0, ease: 'out(3)' },
    wave: { translateY: 20, scaleX: 0.8, opacity: 0, ease: 'out(2)' },
    rotate: { rotateX: 90, opacity: 0, ease: 'out(4)' },
    scale: { scale: 0, opacity: 0, ease: 'out(3)' },
    elastic: { translateY: 60, scale: 0.5, opacity: 0, ease: 'out(1, .4)' },
  };
  function isTextElementLike(value) {
    return value && value.nodeType === 1;
  }
  function resolveTextTargets(target, options) {
    const opts = options || {};
    if (typeof target === 'string') return Array.from(document.querySelectorAll(target));
    if (isTextElementLike(target)) {
      if (opts.selector) return Array.from(target.querySelectorAll(opts.selector));
      return [target];
    }
    if (target && typeof target.length === 'number')
      return Array.from(target).filter(isTextElementLike);
    if (target && typeof target[Symbol.iterator] === 'function')
      return Array.from(target).filter(isTextElementLike);
    return [];
  }
  function createTextGroupHandle(handles, options) {
    const opts = options || {};
    let finished = Promise.resolve();
    function replay() {
      const sequence = opts.sequence !== false;
      const gapMs = Math.max(0, Number(opts.gapMs || opts.staggerMs || 0));
      if (!sequence) {
        finished = Promise.all(
          handles.map((handle, index) => {
            if (!handle || typeof handle.replay !== 'function') return Promise.resolve();
            if (!gapMs) return Promise.resolve(handle.replay());
            return new Promise((resolve) => {
              setTimeout(() => resolve(handle.replay()), index * gapMs);
            });
          })
        ).then(() => undefined);
        return finished;
      }
      finished = handles.reduce((chain, handle) => {
        return chain.then(() => {
          if (!handle || typeof handle.replay !== 'function') return undefined;
          return handle.replay();
        });
      }, Promise.resolve());
      return finished;
    }
    finished = replay();
    return {
      get finished() {
        return finished;
      },
      replay,
      update(nextOptions) {
        handles.forEach((handle) => handle && handle.update && handle.update(nextOptions || {}));
      },
      destroy() {
        handles.forEach((handle) => handle && handle.destroy && handle.destroy());
      },
    };
  }
  function applyTextTargets(target, options, singleApply) {
    const targets = resolveTextTargets(target, options);
    if (targets.length > 1) {
      const childOptions = merge(options || {}, { selector: '', autoStart: false });
      const handles = targets.map((node, index) =>
        singleApply(
          node,
          merge(childOptions, {
            targetText:
              Array.isArray(childOptions.targetTexts) &&
              childOptions.targetTexts[index] !== undefined
                ? childOptions.targetTexts[index]
                : childOptions.targetText,
            text:
              Array.isArray(childOptions.texts) && childOptions.texts[index] !== undefined
                ? childOptions.texts[index]
                : childOptions.text,
          })
        )
      );
      return createTextGroupHandle(handles, options || {});
    }
    if (!targets.length) throw new Error('QADC FX text effect requires a target element.');
    return singleApply(targets[0], merge(options || {}, { selector: '' }));
  }
  function restoreTextHost(el, originalHTML, originalStyle) {
    el.innerHTML = originalHTML;
    if (originalStyle === null) el.removeAttribute('style');
    else el.setAttribute('style', originalStyle);
  }
  function applySplitTextElement(el, opts) {
    const o = merge(
      { text: '', split: 'chars', animation: 'fade-up', staggerMs: 60, duration: 500 },
      opts
    );
    const originalHTML = el.innerHTML;
    const originalStyle = el.getAttribute('style');
    const text = o.text || el.textContent;
    let currentAnim = null;
    function play() {
      if (currentAnim && currentAnim.cancel) currentAnim.cancel();
      const items = o.split === 'chars' ? text.split('') : text.split(/(\s+)/);
      const cls = o.split === 'chars' ? 'char' : 'word';
      el.innerHTML = items
        .map((ch) =>
          ch === ' '
            ? ' '
            : `<span class="${cls}" style="display:inline-block;will-change:transform,opacity">${ch}</span>`
        )
        .join('');
      const targets = el.querySelectorAll('.' + cls);
      const preset = SPLIT_PRESETS[o.animation] || SPLIT_PRESETS['fade-up'];
      if (hasAnime()) {
        const props = {};
        if (preset.translateY !== undefined) props.translateY = [preset.translateY, 0];
        if (preset.scale !== undefined) props.scale = [preset.scale, 1];
        if (preset.scaleX !== undefined) props.scaleX = [preset.scaleX, 1];
        if (preset.rotateX !== undefined) props.rotateX = [preset.rotateX, 0];
        props.opacity = [0, 1];
        currentAnim = anime.animate(targets, {
          ...props,
          duration: o.duration,
          delay: anime.stagger(o.staggerMs),
          ease: preset.ease,
        });
      } else {
        targets.forEach((span, i) => {
          const parts = [];
          if (preset.translateY) parts.push(`translateY(${preset.translateY}px)`);
          if (preset.scale !== undefined) parts.push(`scale(${preset.scale})`);
          if (preset.rotateX) parts.push(`rotateX(${preset.rotateX}deg)`);
          span.style.transform = parts.join(' ');
          span.style.opacity = '0';
          span.style.transition = `all ${o.duration}ms ease-out ${i * o.staggerMs}ms`;
          requestAnimationFrame(() => {
            span.style.transform = 'none';
            span.style.opacity = '1';
          });
        });
      }
      return currentAnim;
    }
    play();
    return {
      replay: play,
      destroy() {
        if (currentAnim && currentAnim.cancel) currentAnim.cancel();
        restoreTextHost(el, originalHTML, originalStyle);
      },
    };
  }
  function applySplitText(target, opts) {
    return applyTextTargets(target, opts, applySplitTextElement);
  }
  function applySplitTextReveal(el, opts) {
    const o = merge(
      { text: '', split: 'words', animation: 'fade-up', staggerMs: 55, duration: 650 },
      opts
    );
    return applySplitText(el, o);
  }
  const CHARSETS = {
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    binary: '01',
    matrix:
      '\uff8a\uff90\uff8b\uff70\uff73\uff7c\uff85\uff93\uff86\uff7b\uff9c\uff82\uff75\uff98\uff71\uff8e\uff83\uff8f\uff79\uff92\uff74\uff76\uff77\uff91\uff95\uff97\uff7e\uff88\uff7d\uff80\uff87\uff8d',
  };

  function resolveScrambleChars(charset) {
    if (typeof charset === 'string' && charset && !CHARSETS[charset]) return charset;
    return CHARSETS[charset] || CHARSETS.letters;
  }

  function randomScrambleChar(chars) {
    return chars[Math.floor(Math.random() * chars.length)] || '';
  }

  function resolveScrambleOrder(target, direction) {
    let order = Array.from({ length: target.length }, (_, i) => i);
    if (direction === 'random') {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    } else if (direction === 'center-out') {
      const tmp = [];
      const mid = Math.floor(target.length / 2);
      for (let i = 0; i <= mid; i++) {
        if (mid + i < target.length) tmp.push(mid + i);
        if (mid - i >= 0 && mid - i !== mid + i) tmp.push(mid - i);
      }
      order = tmp;
    }
    return order.filter((i) => target[i] !== ' ');
  }

  function getScrambleRevealDelay(index, direction, speed, iterations) {
    if (direction === 'simultaneous' || direction === 'parallel') return 0;
    return index * speed * iterations;
  }

  function getScrambleTotalDuration(order, direction, speed, iterations) {
    if (!order.length) return 0;
    if (direction === 'simultaneous' || direction === 'parallel') return speed * iterations;
    return order.length * speed * iterations;
  }

  function renderScrambleInitial(el, target, chars, opts) {
    const state = opts.initialState || (opts.concealBeforeStart === false ? 'original' : 'scrambled');
    if (state === 'original') return;
    if (state === 'blank') {
      el.textContent = '';
      return;
    }
    if (state === 'hidden') {
      el.textContent = target;
      el.style.visibility = 'hidden';
      return;
    }
    el.innerHTML = target
      .split('')
      .map((ch, i) =>
        ch === ' '
          ? ' '
          : `<span data-qadc-scramble-i="${i}">${randomScrambleChar(chars)}</span>`
      )
      .join('');
  }

  function applyScrambleTextElement(el, opts) {
    const o = merge(
      {
        targetText: '',
        text: '',
        charset: 'letters',
        speed: 50,
        iterations: 8,
        direction: 'left-to-right',
        initialState: 'scrambled',
        concealBeforeStart: true,
        autoStart: true,
        textColor: '',
        decodingColor: '',
        onStart: null,
        onUpdate: null,
        onComplete: null,
        onError: null,
        respectReducedMotion: true,
      },
      opts
    );
    const target = String(o.targetText || o.text || el.textContent || '');
    const chars = resolveScrambleChars(o.charset);
    const originalHTML = el.innerHTML;
    const originalStyle = el.getAttribute('style');
    let currentAnim = null;
    let rafId = 0;
    let timerId = 0;
    let disposed = false;
    let playing = false;

    function restoreStyle() {
      if (originalStyle === null) el.removeAttribute('style');
      else el.setAttribute('style', originalStyle);
    }

    function cancel() {
      if (currentAnim && currentAnim.cancel) currentAnim.cancel();
      currentAnim = null;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      if (timerId) clearInterval(timerId);
      timerId = 0;
      playing = false;
    }

    function finalize() {
      el.style.visibility = '';
      el.textContent = target;
      playing = false;
      if (typeof o.onComplete === 'function') o.onComplete(target, el);
    }

    function tick(elapsed, resolved, iters, order) {
      el.querySelectorAll('[data-qadc-scramble-i]').forEach((s) => {
        const idx = parseInt(s.getAttribute('data-qadc-scramble-i'), 10);
        if (!resolved[idx]) {
          s.textContent = randomScrambleChar(chars);
          if (o.decodingColor) s.style.color = o.decodingColor;
        }
      });
      let changed = false;
      for (let ri = 0; ri < order.length; ri++) {
        const idx = order[ri];
        if (elapsed < getScrambleRevealDelay(ri, o.direction, o.speed, o.iterations) || resolved[idx]) continue;
        iters[idx]++;
        if (iters[idx] >= o.iterations) {
          resolved[idx] = true;
          const s = el.querySelector(`[data-qadc-scramble-i="${idx}"]`);
          if (s) {
            s.textContent = target[idx];
            if (o.textColor) s.style.color = o.textColor;
          }
          changed = true;
        }
      }
      if (typeof o.onUpdate === 'function') o.onUpdate({ target, elapsed, element: el });
      return changed;
    }

    function play() {
      try {
        cancel();
        if (disposed) return;
        playing = true;
        if (typeof o.onStart === 'function') o.onStart(target, el);
        renderScrambleInitial(el, target, chars, { initialState: 'scrambled' });
        el.style.visibility = '';
        const resolved = new Array(target.length).fill(false);
        const iters = new Array(target.length).fill(0);
        const order = resolveScrambleOrder(target, o.direction);
        const totalDur = getScrambleTotalDuration(order, o.direction, o.speed, o.iterations);
        if (
          o.respectReducedMotion !== false &&
          typeof matchMedia === 'function' &&
          matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          finalize();
          return;
        }
        if (!order.length || totalDur <= 0) {
          finalize();
          return;
        }
        if (hasAnime()) {
          const p = { t: 0 };
          currentAnim = anime.animate(p, {
            t: [0, 1],
            duration: totalDur,
            ease: 'linear',
            onUpdate: () => tick(p.t * totalDur, resolved, iters, order),
            onComplete: finalize,
          });
          return;
        }
        const start = Date.now();
        function step() {
          if (disposed || !playing) return;
          const elapsed = Date.now() - start;
          tick(elapsed, resolved, iters, order);
          if (elapsed < totalDur) rafId = requestAnimationFrame(step);
          else finalize();
        }
        rafId = requestAnimationFrame(step);
      } catch (error) {
        cancel();
        el.textContent = target;
        restoreStyle();
        if (typeof o.onError === 'function') o.onError(error, el);
      }
    }

    renderScrambleInitial(el, target, chars, o);
    if (o.autoStart !== false) play();

    return {
      replay: play,
      update(nextOptions) {
        Object.assign(o, nextOptions || {});
      },
      destroy() {
        disposed = true;
        cancel();
        el.innerHTML = originalHTML;
        restoreStyle();
      },
    };
  }

  function applyScrambleText(target, opts) {
    return applyTextTargets(target, opts, applyScrambleTextElement);
  }

  function applyScrambleTextGroup(nodes, opts) {
    const o = merge(
      { targetTexts: [], staggerMs: 70, concealAllBeforeStart: true, autoStart: true },
      opts
    );
    return applyScrambleText(
      nodes,
      merge(o, {
        concealBeforeStart: o.concealAllBeforeStart !== false,
      })
    );
  }

  function scrambleText(el, opts) {
    const o = merge(
      { text: '', charset: 'letters', speed: 50, iterations: 8, direction: 'left-to-right' },
      opts
    );
    const target = o.text || el.textContent;
    const chars = CHARSETS[o.charset] || CHARSETS.letters;
    const len = target.length;
    const resolved = new Array(len).fill(false);
    const iters = new Array(len).fill(0);
    el.innerHTML = target
      .split('')
      .map((ch, i) =>
        ch === ' '
          ? ' '
          : `<span data-i="${i}">${chars[Math.floor(Math.random() * chars.length)]}</span>`
      )
      .join('');
    let order = Array.from({ length: len }, (_, i) => i);
    if (o.direction === 'random') {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    } else if (o.direction === 'center-out') {
      const tmp = [],
        mid = Math.floor(len / 2);
      for (let i = 0; i <= mid; i++) {
        if (mid + i < len) tmp.push(mid + i);
        if (mid - i >= 0 && mid - i !== mid + i) tmp.push(mid - i);
      }
      order = tmp;
    }
    order = order.filter((i) => target[i] !== ' ');
    const totalDur = getScrambleTotalDuration(order, o.direction, o.speed, o.iterations);
    return new Promise((resolve) => {
      if (hasAnime()) {
        const p = { t: 0 };
        anime.animate(p, {
          t: [0, 1],
          duration: totalDur,
          ease: 'linear',
          onUpdate: () => tick(p.t * totalDur),
          onComplete: () => {
            finalize();
            resolve();
          },
        });
      } else {
        const start = Date.now();
        function step() {
          const elapsed = Date.now() - start;
          tick(elapsed);
          if (elapsed < totalDur) requestAnimationFrame(step);
          else {
            finalize();
            resolve();
          }
        }
        requestAnimationFrame(step);
      }
    });
    function tick(elapsed) {
      el.querySelectorAll('span[data-i]').forEach((s) => {
        const idx = parseInt(s.dataset.i);
        if (!resolved[idx]) s.textContent = chars[Math.floor(Math.random() * chars.length)];
      });
      order.forEach((idx, revealIndex) => {
        if (
          elapsed < getScrambleRevealDelay(revealIndex, o.direction, o.speed, o.iterations) ||
          resolved[idx]
        ) return;
        iters[idx]++;
        if (iters[idx] >= o.iterations) {
          resolved[idx] = true;
          const s = el.querySelector(`span[data-i="${idx}"]`);
          if (s) s.textContent = target[idx];
        }
      });
    }
    function finalize() {
      el.querySelectorAll('span[data-i]').forEach((s) => {
        s.textContent = target[parseInt(s.dataset.i)];
      });
    }
  }
  function runTextType(el, opts) {
    const o = merge(
      {
        text: '',
        strings: null,
        typeSpeed: 80,
        deleteSpeed: 40,
        pauseTime: 2000,
        loop: false,
        autoStart: true,
        cursor: true,
        cursorCharacter: '|',
        hideCursorWhileTyping: false,
        initialDelay: 0,
        textColors: [],
        variableSpeedMin: null,
        variableSpeedMax: null,
      },
      opts
    );
    const originalHTML = el.innerHTML;
    const originalStyle = el.getAttribute('style');
    const explicitStrings = Array.isArray(o.strings)
      ? o.strings
      : typeof o.strings === 'string'
        ? o.strings.split(',')
        : [];
    const strings = (explicitStrings.length ? explicitStrings : [o.text || el.textContent || ''])
      .map((item) => String(item))
      .filter((item) => item.length);
    let currentStr = 0,
      charIdx = 0,
      isDeleting = false,
      timeout = null;
    let disposed = false;
    let resolveFinished = null;
    let finished = Promise.resolve();
    let cursorEl = null;
    el.textContent = '';
    if (o.cursor) {
      cursorEl = document.createElement('span');
      cursorEl.setAttribute('data-qadc-text-type-cursor', 'true');
      cursorEl.textContent = o.cursorCharacter;
      cursorEl.style.cssText =
        'display:inline-block;animation:qadc-blink 1s step-end infinite;margin-left:2px;vertical-align:text-bottom;';
      if (!document.getElementById('qadc-blink-css')) {
        const s = document.createElement('style');
        s.id = 'qadc-blink-css';
        s.textContent = '@keyframes qadc-blink{0%,100%{opacity:1}50%{opacity:0}}';
        document.head.appendChild(s);
      }
      el.after(cursorEl);
      el._qadcCursor = cursorEl;
    }
    function getTypeDelay() {
      if (typeof o.variableSpeedMin === 'number' && typeof o.variableSpeedMax === 'number') {
        const min = Math.min(o.variableSpeedMin, o.variableSpeedMax);
        const max = Math.max(o.variableSpeedMin, o.variableSpeedMax);
        return min + Math.random() * (max - min);
      }
      return o.typeSpeed + Math.random() * 40;
    }
    function updateCursor() {
      if (!cursorEl) return;
      const shouldHide =
        o.hideCursorWhileTyping &&
        (charIdx < String(strings[currentStr] || '').length || isDeleting);
      cursorEl.style.opacity = shouldHide ? '0' : '1';
      cursorEl.style.animationPlayState = shouldHide ? 'paused' : 'running';
    }
    function updateTextColor() {
      if (o.textColors && o.textColors.length) {
        el.style.color = o.textColors[currentStr % o.textColors.length];
      }
    }
    function complete() {
      if (resolveFinished) resolveFinished();
      resolveFinished = null;
    }
    function tick() {
      if (disposed) return;
      const str = String(strings[currentStr] || '');
      updateTextColor();
      updateCursor();
      if (!isDeleting) {
        charIdx++;
        el.textContent = str.slice(0, charIdx);
        updateCursor();
        if (charIdx >= str.length) {
          if (!o.loop && currentStr === strings.length - 1) {
            timeout = setTimeout(complete, o.pauseTime);
            return;
          }
          isDeleting = true;
          timeout = setTimeout(tick, o.pauseTime);
          return;
        }
        timeout = setTimeout(tick, getTypeDelay());
      } else {
        charIdx--;
        el.textContent = str.slice(0, charIdx);
        updateCursor();
        if (charIdx <= 0) {
          isDeleting = false;
          currentStr = (currentStr + 1) % Math.max(1, strings.length);
          if (!o.loop && currentStr === 0) return;
          timeout = setTimeout(tick, 300);
          return;
        }
        timeout = setTimeout(tick, o.deleteSpeed);
      }
    }
    function replay() {
      clearTimeout(timeout);
      currentStr = 0;
      charIdx = 0;
      isDeleting = false;
      el.textContent = '';
      updateTextColor();
      updateCursor();
      finished = new Promise((resolve) => {
        resolveFinished = resolve;
      });
      if (!strings.length) {
        complete();
        return finished;
      }
      timeout = setTimeout(tick, o.initialDelay);
      return finished;
    }
    if (o.autoStart !== false) replay();
    return {
      get finished() {
        return finished;
      },
      replay,
      destroy() {
        disposed = true;
        clearTimeout(timeout);
        complete();
        if (el._qadcCursor) el._qadcCursor.remove();
        restoreTextHost(el, originalHTML, originalStyle);
      },
      restart() {
        return replay();
      },
    };
  }
  function applyTextType(el, opts) {
    const o = merge(
      {
        strings: null,
        typeSpeed: 75,
        deleteSpeed: 50,
        pauseTime: 1500,
        loop: false,
        cursor: true,
        cursorCharacter: '_',
        hideCursorWhileTyping: false,
        initialDelay: 0,
        textColors: [],
        variableSpeedMin: null,
        variableSpeedMax: null,
      },
      opts
    );
    return applyTextTargets(el, o, runTextType);
  }
  function applyBlurTextElement(el, opts) {
    const o = merge(
      {
        text: '',
        mode: 'words',
        direction: 'top',
        delayMs: 200,
        duration: 700,
        blur: 10,
        distance: 50,
        easing: 'cubic-bezier(.22,1,.36,1)',
      },
      opts
    );
    const originalHTML = el.innerHTML;
    const originalStyle = el.getAttribute('style');
    const originalText = o.text || el.textContent || '';
    let replayTimer = null;
    function getItems() {
      return o.mode === 'letters' ? Array.from(originalText) : originalText.split(' ');
    }
    function render() {
      const items = getItems();
      el.style.whiteSpace = 'pre-wrap';
      if (o.mode === 'words') {
        el.innerHTML = items
          .map(
            (item) =>
              `<span class="qadc-blur-seg" style="display:inline-block;will-change:transform,opacity,filter">${item}</span>`
          )
          .join(' ');
      } else {
        el.innerHTML = items
          .map((item) =>
            item === ' '
              ? '&nbsp;'
              : `<span class="qadc-blur-seg" style="display:inline-block;will-change:transform,opacity,filter">${item}</span>`
          )
          .join('');
      }
      return Array.from(el.querySelectorAll('.qadc-blur-seg'));
    }
    function play() {
      clearTimeout(replayTimer);
      const segments = render();
      const offset = o.direction === 'top' ? -o.distance : o.distance;
      segments.forEach((seg) => {
        seg.style.opacity = '0';
        seg.style.filter = `blur(${o.blur}px)`;
        seg.style.transform = `translateY(${offset}px)`;
        seg.style.transition = 'none';
      });
      requestAnimationFrame(() => {
        segments.forEach((seg, i) => {
          seg.style.transition = `transform ${o.duration}ms ${o.easing} ${i * o.delayMs}ms, opacity ${o.duration}ms ${o.easing} ${i * o.delayMs}ms, filter ${o.duration}ms ${o.easing} ${i * o.delayMs}ms`;
          seg.style.opacity = '1';
          seg.style.filter = 'blur(0px)';
          seg.style.transform = 'translateY(0)';
        });
      });
    }
    play();
    return {
      replay: play,
      destroy() {
        clearTimeout(replayTimer);
        restoreTextHost(el, originalHTML, originalStyle);
      },
    };
  }
  function applyBlurText(el, opts) {
    return applyTextTargets(el, opts, applyBlurTextElement);
  }
  function applyDecryptedText(el, opts) {
    const o = merge(
      {
        text: '',
        trigger: 'hover',
        speed: 60,
        iterations: 10,
        sequential: true,
        revealDirection: 'start',
        characters: CHARSETS.letters + CHARSETS.symbols,
        idleEncrypted: false,
        toggleOnLeave: true,
      },
      opts
    );
    const originalText = o.text || el.textContent || '';
    let timer = null;
    let revealed = new Set();
    let tickCount = 0;
    let running = false;
    let hasViewed = false;
    function computeOrder() {
      const base = [];
      for (let i = 0; i < originalText.length; i++) if (originalText[i] !== ' ') base.push(i);
      if (o.revealDirection === 'end') return base.reverse();
      if (o.revealDirection === 'center') {
        const order = [];
        const middle = Math.floor(base.length / 2);
        let offset = 0;
        while (order.length < base.length) {
          if (middle + offset < base.length) order.push(base[middle + offset]);
          if (offset > 0 && middle - offset >= 0) order.push(base[middle - offset]);
          offset++;
        }
        return order;
      }
      return base;
    }
    function randomChar() {
      return o.characters[Math.floor(Math.random() * o.characters.length)];
    }
    function renderFrame(forceResolved) {
      el.innerHTML = originalText
        .split('')
        .map((ch, index) => {
          if (ch === ' ') return '&nbsp;';
          const isResolved = forceResolved || revealed.has(index);
          const value = isResolved ? ch : randomChar();
          const cls = isResolved ? 'resolved' : 'scrambling';
          return `<span class="${cls}" data-i="${index}">${value}</span>`;
        })
        .join('');
    }
    function renderPlainText() {
      el.innerHTML = '';
      el.textContent = originalText;
    }
    function stop(finalize) {
      if (timer) clearInterval(timer);
      timer = null;
      running = false;
      if (finalize) {
        revealed = new Set(originalText.split('').map((_, i) => i));
        renderFrame(true);
      }
    }
    function encryptIdle() {
      revealed = new Set();
      renderFrame(false);
    }
    function play() {
      if (running) return;
      running = true;
      revealed = new Set();
      tickCount = 0;
      const order = computeOrder();
      renderPlainText();
      timer = setInterval(() => {
        tickCount++;
        if (o.sequential) {
          const revealCount = Math.min(
            order.length,
            Math.floor(tickCount / Math.max(1, o.iterations))
          );
          revealed = new Set(order.slice(0, revealCount));
        }
        renderFrame(false);
        if (
          (o.sequential && revealed.size >= order.length) ||
          (!o.sequential && tickCount >= o.iterations)
        ) {
          stop(true);
        }
      }, o.speed);
    }
    if (o.trigger === 'auto') {
      play();
    } else if (o.idleEncrypted) {
      encryptIdle();
    } else {
      renderPlainText();
    }
    const offs = [];
    if (o.trigger === 'hover') {
      offs.push(listeners(el, ['mouseenter'], play));
      if (o.toggleOnLeave)
        offs.push(
          listeners(el, ['mouseleave'], () => {
            if (timer) clearInterval(timer);
            timer = null;
            running = false;
            renderPlainText();
          })
        );
    }
    if (o.trigger === 'inViewHover') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) hasViewed = true;
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
      offs.push(() => observer.disconnect());
      offs.push(
        listeners(el, ['mouseenter'], () => {
          if (hasViewed) play();
        })
      );
      if (o.toggleOnLeave)
        offs.push(
          listeners(el, ['mouseleave'], () => {
            if (timer) clearInterval(timer);
            timer = null;
            running = false;
            renderPlainText();
          })
        );
    }
    if (o.trigger === 'view') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasViewed) {
              hasViewed = true;
              play();
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
      offs.push(() => observer.disconnect());
    }
    if (o.trigger === 'click') {
      offs.push(
        listeners(el, ['click'], () => {
          if (running) return;
          if (!revealed.size || revealed.size < originalText.length) play();
          else renderPlainText();
        })
      );
    }
    return {
      replay() {
        if (timer) clearInterval(timer);
        running = false;
        play();
      },
      encrypt: encryptIdle,
      destroy() {
        if (timer) clearInterval(timer);
        offs.forEach((off) => off());
        el.innerHTML = '';
        el.textContent = originalText;
      },
    };
  }
  function applyRotatingText(el, opts) {
    const o = merge(
      {
        label: 'loading',
        texts: ['buttons', 'forms', 'switches', 'cards', 'buttons'],
        interval: 1000,
        duration: 420,
        loop: true,
        auto: true,
        fontSize: 25,
        cardBg: '#212121',
        labelColor: 'rgb(124, 124, 124)',
        wordColor: '#956afa',
      },
      opts
    );
    const originalHTML = el.innerHTML;
    const originalStyle = el.getAttribute('style');
    const items = (o.texts || [])
      .map(function (text) {
        return String(text).trim();
      })
      .filter(Boolean);
    const words = items.length ? items : ['buttons'];
    let currentIndex = 0;
    let timer = null;
    let phaseTimer = null;
    let lineHeight = Math.round(o.fontSize * 1.6);
    const shell = document.createElement('div');
    shell.className = 'qadc-rotate-loader';
    shell.style.setProperty('--qadc-rotate-bg', o.cardBg);
    shell.style.backgroundColor = 'var(--qadc-rotate-bg)';
    shell.style.padding = '1rem 2rem';
    shell.style.borderRadius = '1.25rem';
    shell.style.display = 'inline-block';
    shell.style.maxWidth = '100%';
    const line = document.createElement('div');
    line.className = 'qadc-rotate-line';
    line.style.color = o.labelColor;
    line.style.fontFamily = '"Poppins", "Plus Jakarta Sans", system-ui, sans-serif';
    line.style.fontWeight = '500';
    line.style.fontSize = o.fontSize + 'px';
    line.style.boxSizing = 'content-box';
    line.style.height = '40px';
    line.style.padding = '10px 10px';
    line.style.display = 'flex';
    line.style.alignItems = 'center';
    line.style.borderRadius = '8px';
    line.style.whiteSpace = 'nowrap';
    const label = document.createElement('span');
    label.className = 'qadc-rotate-label';
    label.textContent = o.label;
    const viewport = document.createElement('div');
    viewport.className = 'qadc-rotate-viewport';
    viewport.style.overflow = 'hidden';
    viewport.style.position = 'relative';
    viewport.style.display = 'block';
    viewport.style.height = lineHeight + 'px';
    const track = document.createElement('div');
    track.className = 'qadc-rotate-track';
    track.style.willChange = 'transform';
    const mask = document.createElement('div');
    mask.className = 'qadc-rotate-mask';
    mask.style.position = 'absolute';
    mask.style.inset = '0';
    mask.style.pointerEvents = 'none';
    mask.style.background =
      'linear-gradient(var(--qadc-rotate-bg) 10%, transparent 30%, transparent 70%, var(--qadc-rotate-bg) 90%)';
    mask.style.zIndex = '2';
    function buildWord(text) {
      const word = document.createElement('span');
      word.className = 'qadc-rotate-word';
      word.textContent = text;
      word.style.display = 'block';
      word.style.height = '1.6em';
      word.style.lineHeight = '1.6em';
      word.style.paddingLeft = '6px';
      word.style.color = o.wordColor;
      return word;
    }
    function buildTrack() {
      track.innerHTML = '';
      const sequence = o.loop && words.length > 1 ? words.concat(words[0]) : words.slice();
      sequence.forEach(function (text) {
        track.appendChild(buildWord(text));
      });
      const firstWord = track.firstElementChild;
      lineHeight = firstWord ? firstWord.offsetHeight : lineHeight;
      viewport.style.height = lineHeight + 'px';
      track.style.transition = 'none';
      track.style.transform = 'translateY(0)';
    }
    function syncTrack(animated) {
      track.style.transition = animated
        ? 'transform ' + o.duration + 'ms cubic-bezier(.16,1,.3,1)'
        : 'none';
      track.style.transform = 'translateY(-' + currentIndex * lineHeight + 'px)';
    }
    function scheduleNext() {
      clearTimeout(timer);
      if (!o.auto || words.length < 2) return;
      timer = setTimeout(function () {
        advance();
      }, o.interval);
    }
    function advance() {
      if (words.length < 2) return;
      currentIndex += 1;
      syncTrack(true);
      if (o.loop && currentIndex === words.length) {
        clearTimeout(phaseTimer);
        phaseTimer = setTimeout(function () {
          currentIndex = 0;
          syncTrack(false);
          scheduleNext();
        }, o.duration + 30);
        return;
      }
      if (!o.loop && currentIndex >= words.length - 1) return;
      scheduleNext();
    }
    line.appendChild(label);
    line.appendChild(viewport);
    viewport.appendChild(track);
    viewport.appendChild(mask);
    shell.appendChild(line);
    el.innerHTML = '';
    el.appendChild(shell);
    buildTrack();
    scheduleNext();
    return {
      next() {
        clearTimeout(timer);
        clearTimeout(phaseTimer);
        advance();
      },
      destroy() {
        clearTimeout(timer);
        clearTimeout(phaseTimer);
        el.innerHTML = '';
        if (originalHTML) el.innerHTML = originalHTML;
        else el.textContent = '';
        if (originalStyle === null) el.removeAttribute('style');
        else el.setAttribute('style', originalStyle);
      },
    };
  }
  function applyCircularText(el, opts) {
    const o = merge(
      {
        text: '',
        radius: 80,
        size: 200,
        spinDuration: 20,
        hoverMode: 'speedUp',
      },
      opts
    );
    const originalText = o.text || el.textContent || 'HELLO*MOTION*LAB';
    let raf = null;
    let lastTime = 0;
    let angle = 0;
    let speedFactor = 1;
    let scale = 1;
    const track = document.createElement('div');
    track.style.position = 'relative';
    track.style.width = o.size + 'px';
    track.style.height = o.size + 'px';
    track.style.transformOrigin = '50% 50%';
    function renderLetters() {
      track.innerHTML = '';
      const chars = Array.from(originalText);
      chars.forEach((char, index) => {
        const letter = document.createElement('span');
        const deg = (360 / chars.length) * index;
        letter.textContent = char;
        letter.style.position = 'absolute';
        letter.style.left = '50%';
        letter.style.top = '50%';
        letter.style.transformOrigin = '0 0';
        letter.style.whiteSpace = 'pre';
        letter.style.transform = `rotate(${deg}deg) translateY(-${o.radius}px)`;
        track.appendChild(letter);
      });
    }
    function frame(ts) {
      if (!lastTime) lastTime = ts;
      const dt = (ts - lastTime) / 1000;
      lastTime = ts;
      angle += (360 / Math.max(o.spinDuration, 0.1)) * speedFactor * dt;
      track.style.transform = `rotate(${angle}deg) scale(${scale})`;
      raf = requestAnimationFrame(frame);
    }
    function applyHoverMode(mode) {
      if (mode === 'slowDown') {
        speedFactor = 0.5;
        scale = 1;
        return;
      }
      if (mode === 'pause') {
        speedFactor = 0;
        scale = 1;
        return;
      }
      if (mode === 'goBonkers') {
        speedFactor = 6;
        scale = 0.88;
        return;
      }
      speedFactor = 2.5;
      scale = 1;
    }
    renderLetters();
    el.innerHTML = '';
    el.style.display = 'inline-flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.width = o.size + 'px';
    el.style.height = o.size + 'px';
    el.appendChild(track);
    raf = requestAnimationFrame(frame);
    const onEnter = () => applyHoverMode(o.hoverMode);
    const onLeave = () => {
      speedFactor = 1;
      scale = 1;
    };
    const offs = [listeners(el, ['mouseenter'], onEnter), listeners(el, ['mouseleave'], onLeave)];
    return {
      destroy() {
        cancelAnimationFrame(raf);
        offs.forEach((off) => off());
        el.innerHTML = '';
        el.textContent = originalText;
        el.style.display = '';
        el.style.alignItems = '';
        el.style.justifyContent = '';
        el.style.width = '';
        el.style.height = '';
      },
    };
  }
  function applyNeonGlowElement(el, opts) {
    const o = merge({ color: '', intensity: 10, flicker: false, pulse: undefined, speed: 3 }, opts);
    if (opts && typeof opts.flicker === 'undefined' && typeof opts.pulse === 'boolean') {
      o.flicker = o.pulse;
    }
    const originalStyle = el.getAttribute('style');
    const computed = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
    const baseShadow = computed && computed.textShadow && computed.textShadow !== 'none' ? computed.textShadow : '';
    const glowColor = o.color || 'currentColor';
    const glowShadow = `0 0 ${o.intensity}px ${glowColor}, 0 0 ${o.intensity * 2}px ${glowColor}, 0 0 ${o.intensity * 4}px ${glowColor}`;
    let flickerAnimation = null;
    if (o.color) el.style.color = o.color;
    el.style.textShadow = baseShadow ? `${baseShadow}, ${glowShadow}` : glowShadow;
    if (o.flicker && typeof el.animate === 'function') {
      const activeShadow = baseShadow ? `${baseShadow}, ${glowShadow}` : glowShadow;
      flickerAnimation = el.animate(
        [
          { offset: 0, opacity: 1, textShadow: activeShadow },
          { offset: 0.19, opacity: 1, textShadow: activeShadow },
          { offset: 0.2, opacity: 0.6, textShadow: 'none' },
          { offset: 0.21, opacity: 1, textShadow: activeShadow },
          { offset: 0.23, opacity: 1, textShadow: activeShadow },
          { offset: 0.24, opacity: 0.6, textShadow: 'none' },
          { offset: 0.25, opacity: 1, textShadow: activeShadow },
          { offset: 0.54, opacity: 1, textShadow: activeShadow },
          { offset: 0.55, opacity: 0.6, textShadow: 'none' },
          { offset: 0.56, opacity: 1, textShadow: activeShadow },
          { offset: 1, opacity: 1, textShadow: activeShadow },
        ],
        {
          duration: Math.max(0.1, Number(o.speed) || 3) * 1000,
          easing: 'linear',
          iterations: Infinity,
        }
      );
    }
    return {
      destroy() {
        if (flickerAnimation && flickerAnimation.cancel) flickerAnimation.cancel();
        if (originalStyle === null) el.removeAttribute('style');
        else el.setAttribute('style', originalStyle);
      },
    };
  }
  function applyNeonGlow(el, opts) {
    return applyTextTargets(el, opts, applyNeonGlowElement);
  }
  function drawPath(pathEl, opts) {
    const o = merge(
      { duration: 2000, ease: 'inOut(2)', loop: false, loopDelay: 500, onComplete: null },
      opts
    );
    const len = typeof pathEl.getTotalLength === 'function' ? pathEl.getTotalLength() : 100;
    pathEl.style.strokeDasharray = len;
    pathEl.style.strokeDashoffset = len;
    if (hasAnime()) {
      return anime.animate(pathEl, {
        strokeDashoffset: [len, 0],
        duration: o.duration,
        ease: o.ease,
        loop: o.loop,
        loopDelay: o.loop ? o.loopDelay : 0,
        onComplete: o.onComplete,
      });
    } else {
      const start = Date.now();
      function step() {
        const t = Math.min(1, (Date.now() - start) / o.duration);
        pathEl.style.strokeDashoffset = len * (1 - t);
        if (t < 1) requestAnimationFrame(step);
        else if (o.onComplete) o.onComplete();
      }
      requestAnimationFrame(step);
      return null;
    }
  }
  function morphPath(pathEl, targetD, opts) {
    const o = merge({ duration: 600, ease: 'inOut(2)' }, opts);
    const currentD = pathEl.getAttribute('d');
    if (hasAnime()) {
      return anime.animate(pathEl, { d: [currentD, targetD], duration: o.duration, ease: o.ease });
    } else {
      pathEl.setAttribute('d', targetD);
      return null;
    }
  }
  function applyLiquidBlob(svgPathEl, opts) {
    const o = merge({ points: 6, speed: 0.012, size: 130, amplitude: 30, cx: 200, cy: 200 }, opts);
    let time = 0,
      raf = null;
    function noise(x, y) {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return n - Math.floor(n);
    }
    function smoothNoise(x, y) {
      const ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy;
      const tx = fx * fx * (3 - 2 * fx),
        ty = fy * fy * (3 - 2 * fy);
      const a = noise(ix, iy),
        b = noise(ix + 1, iy),
        c = noise(ix, iy + 1),
        d = noise(ix + 1, iy + 1);
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }
    function step() {
      time += o.speed;
      const pts = [];
      for (let i = 0; i < o.points; i++) {
        const angle = (i / o.points) * Math.PI * 2;
        const nv = smoothNoise(Math.cos(angle) * 2 + time * 3, Math.sin(angle) * 2 + time * 3);
        const r = o.size + (nv - 0.5) * o.amplitude * 2;
        pts.push({ x: o.cx + Math.cos(angle) * r, y: o.cy + Math.sin(angle) * r });
      }
      let d = `M${pts[0].x},${pts[0].y} `;
      for (let i = 0; i < o.points; i++) {
        const curr = pts[i],
          next = pts[(i + 1) % o.points],
          prev = pts[(i - 1 + o.points) % o.points],
          nn = pts[(i + 2) % o.points];
        d += `C${curr.x + (next.x - prev.x) / 4},${curr.y + (next.y - prev.y) / 4} ${next.x - (nn.x - curr.x) / 4},${next.y - (nn.y - curr.y) / 4} ${next.x},${next.y} `;
      }
      svgPathEl.setAttribute('d', d + 'Z');
      raf = requestAnimationFrame(step);
    }
    step();
    return {
      destroy() {
        cancelAnimationFrame(raf);
      },
    };
  }
  function applyScrollReveal(elements, opts) {
    const o = merge(
      {
        root: null,
        rootMargin: '0px',
        animation: 'fade-up',
        duration: 600,
        staggerMs: 80,
        threshold: 0.15,
        distance: 40,
        opacity: 0,
        ease: 'ease-out',
        once: true,
      },
      opts
    );
    if (opts && opts.stagger != null && opts.staggerMs == null) o.staggerMs = opts.stagger;
    if (opts && opts.easing && !opts.ease) o.ease = opts.easing;
    let els;
    if (typeof elements === 'string') els = Array.from(document.querySelectorAll(elements));
    else if (typeof NodeList !== 'undefined' && elements instanceof NodeList)
      els = Array.from(elements);
    else if (Array.isArray(elements)) els = elements;
    else els = [elements];
    const snapshots = els.map((el) => ({
      el,
      style: el.getAttribute('style'),
      state: el.getAttribute('data-qadc-scroll-reveal-state'),
    }));
    let disposed = false;
    let observer = null;
    function getFromTransform() {
      switch (o.animation) {
        case 'fade-up':
          return `translateY(${o.distance}px)`;
        case 'slide-left':
          return `translateX(${-o.distance * 1.5}px)`;
        case 'scale':
          return 'scale(0.85)';
        case 'rotate':
          return `perspective(800px) rotateX(12deg) translateY(${o.distance}px)`;
        default:
          return `translateY(${o.distance}px)`;
      }
    }
    const from = getFromTransform();
    function pending(el) {
      el.setAttribute('data-qadc-scroll-reveal-state', 'pending');
      el.style.opacity = String(o.opacity);
      el.style.willChange = 'transform, opacity';
      el.style.transform = from;
    }
    function reveal(visible) {
      visible.forEach((el, i) => {
        if (disposed) return;
        el.setAttribute('data-qadc-scroll-reveal-state', 'revealed');
        el.style.transition = `opacity ${o.duration}ms ${o.ease} ${i * o.staggerMs}ms, transform ${o.duration}ms ${o.ease} ${i * o.staggerMs}ms`;
        requestAnimationFrame(() => {
          if (disposed) return;
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
      });
    }
    els.forEach(pending);
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        (entries) => {
          const visible = [];
          entries.forEach((e) => {
            if (e.isIntersecting) {
              visible.push(e.target);
              if (o.once && observer) observer.unobserve(e.target);
            } else if (!o.once) pending(e.target);
          });
          if (visible.length) reveal(visible);
        },
        { root: o.root, rootMargin: o.rootMargin, threshold: o.threshold }
      );
      els.forEach((el) => observer.observe(el));
    } else {
      requestAnimationFrame(() => reveal(els));
    }
    return {
      destroy() {
        disposed = true;
        if (observer) observer.disconnect();
        snapshots.forEach((s) => {
          if (s.style === null) s.el.removeAttribute('style');
          else s.el.setAttribute('style', s.style);
          if (s.state === null) s.el.removeAttribute('data-qadc-scroll-reveal-state');
          else s.el.setAttribute('data-qadc-scroll-reveal-state', s.state);
        });
      },
    };
  }
  function applySnapScroll(container, opts) {
    let o = merge(
      {
        orientation: 'vertical',
        snapStop: false,
        showDots: true,
        startIndex: 0,
        index: null,
        pageSelector: '.snap-page',
        dotsEl: null,
        activeClass: 'active',
        onChange: null,
        onIndexChange: null,
        onTransitionStart: null,
        onTransitionEnd: null,
      },
      opts
    );
    let axis = o.orientation === 'horizontal' ? 'x' : 'y';
    let prop = axis === 'x' ? 'scrollLeft' : 'scrollTop';
    let sizeKey = axis === 'x' ? 'clientWidth' : 'clientHeight';
    const containerStyle = container.style.cssText;
    const parent = container.parentElement || container;
    const originalDotsHtml = o.dotsEl ? o.dotsEl.innerHTML : '';
    const originalDotsStyle = o.dotsEl ? o.dotsEl.style.cssText : '';
    const originalPages = [];
    let dotsEl = o.dotsEl;
    let currentIndex = -1;
    let isTransitioning = false;
    let settleTimer = 0;
    let transitionToken = 0;
    let pages = Array.from(container.querySelectorAll(o.pageSelector));
    if (!pages.length) pages = Array.from(container.children);
    pages.forEach((page) => {
      originalPages.push({ el: page, style: page.style.cssText });
    });
    function applyAxisState() {
      axis = o.orientation === 'horizontal' ? 'x' : 'y';
      prop = axis === 'x' ? 'scrollLeft' : 'scrollTop';
      sizeKey = axis === 'x' ? 'clientWidth' : 'clientHeight';
      container.style.scrollSnapType = axis + ' mandatory';
      container.style.webkitOverflowScrolling = 'touch';
      container.style.overflowY = axis === 'y' ? 'auto' : 'hidden';
      container.style.overflowX = axis === 'x' ? 'auto' : 'hidden';
      container.style.display = axis === 'x' ? 'flex' : 'block';
      pages.forEach((page) => {
        page.style.scrollSnapAlign = 'start';
        page.style.scrollSnapStop = o.snapStop ? 'always' : '';
        page.style.flexShrink = '0';
        if (axis === 'x') {
          page.style.width = '100%';
          page.style.minHeight = '100%';
        } else {
          page.style.minHeight = '100%';
          page.style.width = '100%';
        }
      });
    }
    function ensureDots() {
      if (!o.showDots) {
        if (dotsEl) dotsEl.style.display = 'none';
        return;
      }
      if (!dotsEl) {
        dotsEl = document.createElement('div');
        parent.appendChild(dotsEl);
      }
      dotsEl.innerHTML = '';
      dotsEl.style.cssText =
        axis === 'x'
          ? 'display:flex;position:absolute;gap:8px;z-index:20;flex-direction:row;left:50%;bottom:12px;top:auto;right:auto;transform:translateX(-50%)'
          : 'display:flex;position:absolute;gap:8px;z-index:20;flex-direction:column;right:12px;top:50%;left:auto;bottom:auto;transform:translateY(-50%)';
      pages.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'P' + (index + 1));
        dot.style.cssText =
          'width:8px;height:8px;border-radius:50%;border:none;padding:0;cursor:pointer;background:rgba(255,255,255,.4);transition:transform .2s ease,background .2s ease';
        dot.addEventListener('click', () => goTo(index, true));
        dotsEl.appendChild(dot);
      });
    }
    function updateDots(index) {
      if (!dotsEl || !o.showDots) return;
      Array.from(dotsEl.children).forEach((dot, i) => {
        const active = i === index;
        if (dot.classList) dot.classList.toggle(o.activeClass, active);
        dot.style.background = active ? '#ffffff' : 'rgba(255,255,255,0.4)';
        dot.style.transform = active ? 'scale(1.5)' : 'scale(1)';
      });
    }
    function detectIndex() {
      const size = container[sizeKey];
      if (!size) return 0;
      return Math.max(0, Math.min(pages.length - 1, Math.round(container[prop] / size)));
    }
    function emitChange(index, meta) {
      if (index === currentIndex) return;
      currentIndex = index;
      updateDots(index);
      if (typeof o.onChange === 'function') o.onChange(index);
      if (typeof o.onIndexChange === 'function') o.onIndexChange(index, meta || {});
    }
    function finishTransition(token, index, meta) {
      if (token !== transitionToken) return;
      isTransitioning = false;
      emitChange(index, meta);
      if (typeof o.onTransitionEnd === 'function') {
        o.onTransitionEnd(
          Object.assign(
            {
              index: currentIndex,
              pageCount: pages.length,
              orientation: o.orientation,
            },
            meta || {}
          )
        );
      }
    }
    function scheduleTransitionEnd(index, meta) {
      const token = transitionToken;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        finishTransition(token, index, meta);
      }, 360);
    }
    function onScroll() {
      const detected = detectIndex();
      if (isTransitioning) {
        scheduleTransitionEnd(detected, { source: 'scroll' });
        return;
      }
      emitChange(detected, { source: 'scroll' });
    }
    function goTo(index, smoothOrOptions) {
      const clamped = Math.max(0, Math.min(pages.length - 1, index));
      const meta =
        typeof smoothOrOptions === 'object' && smoothOrOptions
          ? smoothOrOptions
          : { animated: Boolean(smoothOrOptions) };
      const animated = meta.animated !== false;
      const offset = container[sizeKey] * clamped;
      const payload =
        axis === 'x'
          ? { left: offset, behavior: animated ? 'smooth' : 'auto' }
          : { top: offset, behavior: animated ? 'smooth' : 'auto' };
      const source = meta.source || 'programmatic';
      transitionToken += 1;
      isTransitioning = animated;
      if (typeof o.onTransitionStart === 'function') {
        o.onTransitionStart({
          index: clamped,
          previousIndex: currentIndex < 0 ? detectIndex() : currentIndex,
          pageCount: pages.length,
          orientation: o.orientation,
          source,
        });
      }
      container.scrollTo(payload);
      if (animated) {
        scheduleTransitionEnd(clamped, { source });
      } else {
        finishTransition(transitionToken, clamped, { source });
      }
    }
    applyAxisState();
    ensureDots();
    container.addEventListener('scroll', onScroll, { passive: true });
    requestAnimationFrame(() => {
      const initialIndex = typeof o.index === 'number' ? o.index : o.startIndex;
      goTo(initialIndex, { animated: false, source: 'initial' });
    });
    return {
      update(nextOpts) {
        const prevAxis = axis;
        const next = merge(o, nextOpts || {});
        const requestedIndex =
          typeof next.index === 'number'
            ? next.index
            : typeof next.startIndex === 'number'
              ? next.startIndex
              : currentIndex < 0
                ? 0
                : currentIndex;
        o = next;
        dotsEl = o.dotsEl || dotsEl;
        applyAxisState();
        ensureDots();
        if (
          prevAxis !== axis ||
          typeof nextOpts.snapStop !== 'undefined' ||
          typeof nextOpts.showDots !== 'undefined'
        ) {
          goTo(requestedIndex, { animated: false, source: 'update' });
        } else if (typeof nextOpts.index === 'number' || typeof nextOpts.startIndex === 'number') {
          goTo(requestedIndex, { animated: true, source: 'update' });
        } else {
          emitChange(detectIndex(), { source: 'update' });
        }
      },
      destroy() {
        window.clearTimeout(settleTimer);
        container.removeEventListener('scroll', onScroll);
        container.style.cssText = containerStyle;
        originalPages.forEach((entry) => {
          entry.el.style.cssText = entry.style;
        });
        if (dotsEl) {
          if (o.dotsEl) {
            dotsEl.innerHTML = originalDotsHtml;
            dotsEl.style.cssText = originalDotsStyle;
          } else {
            dotsEl.remove();
          }
        }
      },
      goTo,
      getIndex() {
        return currentIndex < 0 ? detectIndex() : currentIndex;
      },
      getState() {
        return {
          index: currentIndex < 0 ? detectIndex() : currentIndex,
          pageCount: pages.length,
          isTransitioning,
          orientation: o.orientation,
        };
      },
    };
  }
  function applyPullRefresh(container, opts) {
    let o = merge(
      {
        threshold: 80,
        resistance: 0.4,
        bounceBack: 300,
        disabled: false,
        refreshing: false,
        contentEl: null,
        indicatorEl: null,
        autoCompleteDuration: 1200,
        onPull: null,
        onRefreshRequest: null,
        onRefreshStart: null,
        onRefreshEnd: null,
        onRefreshStateChange: null,
      },
      opts
    );
    const contentEl = o.contentEl || container.firstElementChild || container;
    const original = {
      position: container.style.position,
      overflowY: container.style.overflowY,
      webkitOverflowScrolling: container.style.webkitOverflowScrolling,
      touchAction: container.style.touchAction,
      contentTransform: contentEl.style.transform,
      contentTransition: contentEl.style.transition,
    };
    let indicatorEl = o.indicatorEl;
    let indicatorOwned = false;
    let startY = 0;
    let pulling = false;
    let pullDistance = 0;
    let refreshing = Boolean(o.refreshing);
    let refreshTimer = 0;
    if (!indicatorEl) {
      indicatorEl = document.createElement('div');
      indicatorEl.setAttribute('data-qpr', '');
      indicatorOwned = true;
      container.appendChild(indicatorEl);
    }
    if (!container.style.position || container.style.position === 'static') {
      container.style.position = 'relative';
    }
    container.style.overflowY = 'auto';
    container.style.webkitOverflowScrolling = 'touch';
    container.style.touchAction = 'pan-y';
    indicatorEl.style.cssText =
      'position:absolute;top:-48px;left:50%;transform:translateX(-50%);transform-origin:50% 50%;color:#fff;font-size:18px;opacity:0;pointer-events:none;transition:top 180ms ease,opacity 180ms ease;z-index:5';
    function emitRefreshState(meta) {
      if (typeof o.onRefreshStateChange === 'function') {
        o.onRefreshStateChange(refreshing, meta || {});
      }
    }
    function setIndicatorState(text, top, opacity) {
      indicatorEl.textContent = text;
      indicatorEl.style.top = top;
      indicatorEl.style.opacity = opacity;
    }
    function resetPosition() {
      pullDistance = 0;
      contentEl.style.transition = `transform ${o.bounceBack}ms ease`;
      contentEl.style.transform = '';
      setIndicatorState('↓', '-48px', '0');
    }
    function finishRefresh(meta) {
      if (!refreshing) return;
      refreshing = false;
      window.clearTimeout(refreshTimer);
      emitRefreshState(Object.assign({ source: 'complete' }, meta || {}));
      if (typeof o.onRefreshEnd === 'function') {
        o.onRefreshEnd(Object.assign({ source: 'complete' }, meta || {}));
      }
      resetPosition();
    }
    function beginRefresh(meta) {
      if (refreshing) return;
      refreshing = true;
      contentEl.style.transition = `transform ${o.bounceBack}ms ease`;
      contentEl.style.transform = 'translateY(50px)';
      setIndicatorState('⟳', '10px', '1');
      emitRefreshState(Object.assign({ source: 'refresh-start' }, meta || {}));
      if (typeof o.onRefreshStart === 'function') {
        o.onRefreshStart(Object.assign({ source: 'refresh-start' }, meta || {}));
      }
      if (typeof o.onRefreshRequest === 'function') {
        o.onRefreshRequest({
          complete: finishRefresh,
          cancel: finishRefresh,
          getState,
        });
      } else if (typeof o.autoCompleteDuration === 'number' && o.autoCompleteDuration >= 0) {
        refreshTimer = window.setTimeout(() => {
          finishRefresh({ source: 'auto-complete' });
        }, o.autoCompleteDuration);
      }
    }
    function updatePullVisual() {
      contentEl.style.transition = 'none';
      contentEl.style.transform = `translateY(${pullDistance}px)`;
      setIndicatorState(
        pullDistance >= o.threshold ? '⟳' : '↓',
        `${Math.min(-48 + pullDistance, 10)}px`,
        '1'
      );
      if (typeof o.onPull === 'function') {
        o.onPull({
          distance: pullDistance,
          progress: Math.min(1, pullDistance / o.threshold),
          threshold: o.threshold,
        });
      }
    }
    function onStart(event) {
      if (o.disabled || refreshing || container.scrollTop > 0) return;
      startY = getPointer(event).y;
      pulling = true;
      contentEl.style.transition = 'none';
    }
    function onMove(event) {
      if (!pulling || o.disabled || refreshing) return;
      const currentY = getPointer(event).y;
      const raw = currentY - startY;
      if (raw <= 0) {
        pullDistance = 0;
        updatePullVisual();
        return;
      }
      pullDistance = raw * o.resistance;
      updatePullVisual();
      if (event.cancelable) event.preventDefault();
    }
    function onEnd() {
      if (!pulling) return;
      pulling = false;
      if (pullDistance >= o.threshold) beginRefresh({ source: 'gesture' });
      else resetPosition();
    }
    const offMouse = listeners(container, ['mousedown'], onStart);
    const offTouchStart = listeners(container, ['touchstart'], onStart, { passive: true });
    const offTouchMove = listeners(container, ['touchmove'], onMove, { passive: false });
    const offMouseMove = listeners(window, ['mousemove'], onMove);
    const offTouchEnd = listeners(window, ['touchend', 'touchcancel'], onEnd);
    const offMouseUp = listeners(window, ['mouseup'], onEnd);
    function update(nextOpts) {
      const next = merge(o, nextOpts || {});
      const shouldRefresh = typeof next.refreshing === 'boolean' ? next.refreshing : refreshing;
      o = next;
      if (shouldRefresh && !refreshing) beginRefresh({ source: 'update' });
      else if (!shouldRefresh && refreshing) finishRefresh({ source: 'update' });
      else if (!refreshing) resetPosition();
    }
    function complete(meta) {
      finishRefresh(Object.assign({ source: 'external-complete' }, meta || {}));
    }
    function getState() {
      return {
        refreshing,
        pullDistance,
        threshold: o.threshold,
        progress: Math.min(1, pullDistance / o.threshold),
      };
    }
    if (refreshing) beginRefresh({ source: 'initial' });
    else resetPosition();
    return {
      update,
      complete,
      cancel(meta) {
        finishRefresh(Object.assign({ source: 'external-cancel' }, meta || {}));
      },
      getState,
      destroy() {
        window.clearTimeout(refreshTimer);
        offMouse();
        offTouchStart();
        offTouchMove();
        offMouseMove();
        offTouchEnd();
        offMouseUp();
        container.style.position = original.position;
        container.style.overflowY = original.overflowY;
        container.style.webkitOverflowScrolling = original.webkitOverflowScrolling;
        container.style.touchAction = original.touchAction;
        contentEl.style.transform = original.contentTransform;
        contentEl.style.transition = original.contentTransition;
        if (indicatorOwned && indicatorEl.parentNode)
          indicatorEl.parentNode.removeChild(indicatorEl);
      },
    };
  }
  function applyCursorTrail(el, opts) {
    const o = merge({ length: 30, size: 6, fade: 0.05, color: '#0071e3' }, opts);
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    if (!el.style.position || el.style.position === 'static') el.style.position = 'relative';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let trail = [],
      mouse = { x: -100, y: -100 },
      raf = null;
    function resize() {
      const r = el.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    const resizeOff = listeners(window, ['resize'], resize);
    const moveOff = listeners(
      el,
      ['mousemove', 'touchmove'],
      (e) => {
        const r = el.getBoundingClientRect();
        const p = getPointer(e);
        mouse.x = p.x - r.left;
        mouse.y = p.y - r.top;
      },
      { passive: true }
    );
    function step() {
      const r = el.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      trail.unshift({ x: mouse.x, y: mouse.y, life: 1 });
      if (trail.length > o.length) trail.pop();
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.life -= o.fade;
        if (p.life <= 0) {
          trail.splice(i, 1);
          continue;
        }
        const t = i / trail.length;
        ctx.globalAlpha = p.life * (1 - t * 0.7);
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, o.size * p.life * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    }
    step();
    return {
      destroy() {
        cancelAnimationFrame(raf);
        resizeOff();
        moveOff();
        canvas.remove();
      },
    };
  }
  function applyCustomCursor(host, opts) {
    const o = merge(
      { dotSize: 6, ringSize: 40, ringBw: 2, speed: 0.15, expand: 2, color: '#FFFFFF' },
      opts
    );
    ensureFxStyle(
      'qcc',
      '.qch{cursor:none;overflow:hidden}.qch,.qch *{cursor:none!important}.qcd,.qcr{position:absolute;left:0;top:0;pointer-events:none;transform:translate(-50%,-50%);border-radius:999px}.qcd{z-index:2;background:var(--qcc,#fff)}.qcr{z-index:1;border:var(--qcb,2px) solid var(--qcc,#fff);opacity:.5;transition:width .2s ease,height .2s ease,opacity .2s ease}.qcr.expand{opacity:.3}',
      host.ownerDocument
    );
    const original = {
      position: host.style.position,
      overflow: host.style.overflow,
      cls: host.className,
    };
    if (!host.style.position || host.style.position === 'static') host.style.position = 'relative';
    host.style.overflow = 'hidden';
    if (!host.classList.contains('qch')) host.classList.add('qch');
    const dot = document.createElement('div');
    dot.className = 'qcd';
    const ring = document.createElement('div');
    ring.className = 'qcr';
    host.appendChild(dot);
    host.appendChild(ring);
    let targetX = 0;
    let targetY = 0;
    let followerX = 0;
    let followerY = 0;
    let raf = 0;
    function center() {
      const rect = host.getBoundingClientRect();
      targetX = rect.width / 2;
      targetY = rect.height / 2;
      followerX = targetX;
      followerY = targetY;
    }
    function apply() {
      host.style.setProperty('--qcc', o.color);
      host.style.setProperty('--qcb', `${o.ringBw}px`);
      dot.style.width = `${o.dotSize}px`;
      dot.style.height = `${o.dotSize}px`;
      ring.style.width = `${o.ringSize}px`;
      ring.style.height = `${o.ringSize}px`;
    }
    function move(event) {
      const rect = host.getBoundingClientRect();
      const point = getPointer(event);
      targetX = point.x - rect.left;
      targetY = point.y - rect.top;
    }
    function leave() {
      ring.classList.remove('expand');
      center();
    }
    function toggleExpand(value) {
      ring.classList.toggle('expand', value);
      const scale = value ? o.expand : 1;
      ring.style.width = `${o.ringSize * scale}px`;
      ring.style.height = `${o.ringSize * scale}px`;
    }
    function tick() {
      followerX += (targetX - followerX) * o.speed;
      followerY += (targetY - followerY) * o.speed;
      dot.style.left = `${targetX}px`;
      dot.style.top = `${targetY}px`;
      ring.style.left = `${followerX}px`;
      ring.style.top = `${followerY}px`;
      raf = requestAnimationFrame(tick);
    }
    center();
    apply();
    const hoverSelector = '[data-hover],a,button,[role="button"],[data-motion-cursor-expand]';
    const hoverTargets = Array.from(host.querySelectorAll(hoverSelector));
    const offs = [
      listeners(host, ['mousemove', 'touchmove', 'pointermove'], move, { passive: true }),
      listeners(host, ['pointerleave', 'mouseleave'], leave),
    ];
    hoverTargets.forEach((node) => {
      offs.push(listeners(node, ['pointerenter', 'mouseenter'], () => toggleExpand(true)));
      offs.push(listeners(node, ['pointerleave', 'mouseleave'], () => toggleExpand(false)));
    });
    tick();
    return {
      update(nextOpts) {
        Object.assign(o, nextOpts || {});
        apply();
      },
      destroy() {
        cancelAnimationFrame(raf);
        offs.forEach((off) => off());
        dot.remove();
        ring.remove();
        host.style.position = original.position;
        host.style.overflow = original.overflow;
        host.className = original.cls;
        host.style.removeProperty('--qcc');
        host.style.removeProperty('--qcb');
      },
    };
  }
  function applyElasticFollow(host, opts) {
    const o = merge({ stiffness: 0.06, damping: 0.2, mass: 3, size: 32, color: '#FFFFFF' }, opts);
    ensureFxStyle(
      'qec',
      '.qadc-elastic-follow-canvas,.qadc-elastic-follow-follower,.qadc-elastic-follow-crosshair{position:absolute;left:0;top:0;pointer-events:none}.qadc-elastic-follow-canvas{inset:0;width:100%;height:100%}.qadc-elastic-follow-follower{border-radius:999px;background:var(--qadc-elastic-follow-color,#fff);box-shadow:0 0 20px var(--qadc-elastic-follow-color,#fff);will-change:transform}.qadc-elastic-follow-crosshair{width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-radius:999px;transform:translate(-50%,-50%)}',
      host.ownerDocument
    );
    const original = { position: host.style.position, overflow: host.style.overflow };
    if (!host.style.position || host.style.position === 'static') host.style.position = 'relative';
    host.style.overflow = 'hidden';
    const canvas = document.createElement('canvas');
    canvas.className = 'qadc-elastic-follow-canvas';
    const follower = document.createElement('div');
    follower.className = 'qadc-elastic-follow-follower';
    const crosshair = document.createElement('div');
    crosshair.className = 'qadc-elastic-follow-crosshair';
    host.appendChild(canvas);
    host.appendChild(follower);
    host.appendChild(crosshair);
    const ctx = canvas.getContext('2d');
    let mouseX;
    let mouseY;
    let followerX;
    let followerY;
    let velocityX = 0;
    let velocityY = 0;
    let raf = 0;
    let resizeObserver = null;
    let trail = [];
    let rect = null;
    function resize() {
      rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mouseX === undefined) {
        mouseX = rect.width / 2;
        mouseY = rect.height / 2;
        followerX = mouseX;
        followerY = mouseY;
      }
    }
    function apply() {
      host.style.setProperty('--qadc-elastic-follow-color', o.color);
      follower.style.width = `${o.size}px`;
      follower.style.height = `${o.size}px`;
    }
    function hexToRgba(value, alpha) {
      const clean = String(value || '#FFFFFF').replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(255,255,255,${alpha})`;
      return `rgba(${parseInt(clean.slice(0, 2), 16)},${parseInt(clean.slice(2, 4), 16)},${parseInt(clean.slice(4, 6), 16)},${alpha})`;
    }
    function move(event) {
      rect = host.getBoundingClientRect();
      const point = getPointer(event);
      mouseX = point.x - rect.left;
      mouseY = point.y - rect.top;
    }
    function tick() {
      const ax = ((mouseX - followerX) * o.stiffness) / o.mass;
      const ay = ((mouseY - followerY) * o.stiffness) / o.mass;
      velocityX = (velocityX + ax) * (1 - o.damping);
      velocityY = (velocityY + ay) * (1 - o.damping);
      followerX += velocityX;
      followerY += velocityY;
      follower.style.transform = `translate(${followerX - o.size / 2}px, ${followerY - o.size / 2}px)`;
      crosshair.style.left = `${mouseX}px`;
      crosshair.style.top = `${mouseY}px`;
      trail.push({ x: followerX, y: followerY });
      if (trail.length > 40) trail.shift();
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let index = 1; index < trail.length; index += 1)
          ctx.lineTo(trail[index].x, trail[index].y);
        ctx.strokeStyle = hexToRgba(o.color, 0.25);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    }
    resize();
    apply();
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    }
    const offs = [
      listeners(host, ['mousemove', 'touchmove', 'pointermove'], move, { passive: true }),
      listeners(window, ['resize'], resize),
    ];
    tick();
    return {
      update(nextOpts) {
        Object.assign(o, nextOpts || {});
        apply();
      },
      destroy() {
        cancelAnimationFrame(raf);
        offs.forEach((off) => off());
        if (resizeObserver) resizeObserver.disconnect();
        canvas.remove();
        follower.remove();
        crosshair.remove();
        host.style.position = original.position;
        host.style.overflow = original.overflow;
        host.style.removeProperty('--qadc-elastic-follow-color');
      },
    };
  }
  function applyDistortion(host, opts) {
    const o = merge(
      {
        density: 16,
        radius: 120,
        strength: 10,
        recovery: 0.06,
        dotSize: 2,
        force: 'push',
        color: '#FFFFFF',
      },
      opts
    );
    ensureFxStyle(
      'qdc',
      '.qadc-distortion-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}',
      host.ownerDocument
    );
    const original = { position: host.style.position, overflow: host.style.overflow };
    if (!host.style.position || host.style.position === 'static') host.style.position = 'relative';
    host.style.overflow = 'hidden';
    const canvas = document.createElement('canvas');
    canvas.className = 'qadc-distortion-canvas';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const mouse = { x: -9999, y: -9999 };
    let points = [];
    let resizeObserver = null;
    let raf = 0;
    let disposed = false;
    const requestFrame =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : function (cb) {
            return setTimeout(cb, 16);
          };
    const cancelFrame =
      typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : function (id) {
            clearTimeout(id);
          };
    function hexToRgb(color) {
      const clean = String(color || '#FFFFFF').replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '255,255,255';
      return `${parseInt(clean.slice(0, 2), 16)},${parseInt(clean.slice(2, 4), 16)},${parseInt(clean.slice(4, 6), 16)}`;
    }
    function initGrid() {
      points = [];
      const rect = host.getBoundingClientRect();
      const gap = rect.width / o.density;
      const cols = Math.ceil(rect.width / gap) + 1;
      const rows = Math.ceil(rect.height / gap) + 1;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * gap;
          const y = row * gap;
          points.push({ ox: x, oy: y, x, y, vx: 0, vy: 0 });
        }
      }
    }
    function resize() {
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initGrid();
    }
    function move(event) {
      const rect = host.getBoundingClientRect();
      const point = getPointer(event);
      mouse.x = point.x - rect.left;
      mouse.y = point.y - rect.top;
    }
    function reset() {
      mouse.x = -9999;
      mouse.y = -9999;
    }
    function tick() {
      if (disposed) return;
      const rect = host.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const rgb = hexToRgb(o.color);
      for (const point of points) {
        const dx = point.x - mouse.x;
        const dy = point.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < o.radius && distance > 0) {
          const force = (1 - distance / o.radius) * o.strength;
          if (o.force === 'push') {
            point.vx += (dx / distance) * force;
            point.vy += (dy / distance) * force;
          } else if (o.force === 'pull') {
            point.vx -= (dx / distance) * force;
            point.vy -= (dy / distance) * force;
          } else {
            point.vx += (-dy / distance) * force;
            point.vy += (dx / distance) * force;
          }
        }
        point.vx += (point.ox - point.x) * o.recovery;
        point.vy += (point.oy - point.y) * o.recovery;
        point.vx *= 0.85;
        point.vy *= 0.85;
        point.x += point.vx;
        point.y += point.vy;
        const displacement = Math.sqrt((point.x - point.ox) ** 2 + (point.y - point.oy) ** 2);
        ctx.fillStyle = `rgba(${rgb}, ${Math.min(0.3 + displacement * 0.05, 1)})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, o.dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!disposed) raf = requestFrame(tick);
    }
    resize();
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    }
    const offs = [
      listeners(host, ['mousemove', 'touchmove', 'pointermove'], move, { passive: true }),
      listeners(host, ['pointerleave', 'mouseleave', 'touchend'], reset),
      listeners(window, ['resize'], resize),
    ];
    tick();
    return {
      update(nextOpts) {
        const prevDensity = o.density;
        Object.assign(o, nextOpts || {});
        if (o.density !== prevDensity) initGrid();
      },
      destroy() {
        disposed = true;
        cancelFrame(raf);
        offs.forEach((off) => off());
        if (resizeObserver) resizeObserver.disconnect();
        canvas.remove();
        host.style.position = original.position;
        host.style.overflow = original.overflow;
      },
    };
  }
  function applyAccordion(container, opts) {
    const o = merge(
      { duration: 300, multiple: false, selector: '.acc-item', headerSelector: '.acc-header' },
      opts
    );
    container.style.setProperty('--dur', o.duration + 'ms');
    function handler(e) {
      const header = e.target.closest(o.headerSelector);
      if (!header) return;
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');
      if (!o.multiple)
        container.querySelectorAll(o.selector + '.open').forEach((i) => i.classList.remove('open'));
      item.classList.toggle('open', !isOpen);
    }
    const off = listeners(container, ['click'], handler);
    return { destroy: off };
  }

  const EXPAND_ITEM_SELECTOR =
    '[data-fx-expand-item], [data-qadc-expand-item], [data-expand-item], .master-item, .expand-item, .accordion-item';
  const EXPAND_CONTENT_SELECTOR =
    '[data-fx-expand-content], [data-qadc-expand-content], [data-expand-content], .master-rec-text, .expand-content, .accordion-content';
  const EXPAND_TRIGGER_SELECTOR =
    '[data-fx-expand-trigger], [data-qadc-expand-trigger], [data-expand-trigger], .master-rec-toggle, .expand-trigger, .accordion-trigger, [aria-controls]';

  function applyExpandCollapse(contentEl, opts) {
    const o = merge(
      {
        expanded: null,
        duration: 300,
        easing: 'ease-out',
        trigger: null,
        bindTrigger: true,
        itemSelector: EXPAND_ITEM_SELECTOR,
        triggerSelector: EXPAND_TRIGGER_SELECTOR,
        contentSelector: EXPAND_CONTENT_SELECTOR,
        display: '',
        collapsedOpacity: 0,
        collapsedTransform: '',
        expandedTransform: '',
        expandedClass: 'expanded',
        contentExpandedClass: 'expanded',
        triggerExpandedClass: 'expanded',
        labels: null,
        onBeforeExpand: null,
        onExpandEnd: null,
        onBeforeCollapse: null,
        onCollapseEnd: null,
      },
      opts
    );
    const content = resolveChild(document, contentEl) || contentEl;
    if (!content || !content.style) {
      throw new Error('QADC_FX.applyExpandCollapse requires a valid content element.');
    }
    const trigger = resolveExpandCollapseTrigger(content, o);
    const originalStyle = content.getAttribute('style');
    const originalInline = snapshotExpandInlineStyles(content);
    const originalContentClass = content.className;
    const originalAriaHidden = content.getAttribute('aria-hidden');
    const originalContentHidden = content.hidden;
    const originalTriggerExpanded = trigger ? trigger.getAttribute('aria-expanded') : null;
    const originalTriggerClass = trigger ? trigger.className : '';
    const originalTriggerLabel = trigger ? getDirectText(getTriggerLabelTarget(trigger)) : '';
    const computedDisplay =
      typeof getComputedStyle === 'function' ? getComputedStyle(content).display : '';
    const expandedDisplay = o.display || (computedDisplay && computedDisplay !== 'none' ? computedDisplay : 'block');
    let expanded =
      o.expanded == null
        ? inferExpandCollapseExpanded(content, trigger, o)
        : !!o.expanded;
    let timer = 0;
    let rafId = 0;
    let disposed = false;

    function clearTimer() {
      if (timer) clearTimeout(timer);
      timer = 0;
    }

    function clearFrame() {
      if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function syncA11y() {
      content.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      if (trigger) trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function syncClassAndLabel() {
      toggleClass(content, o.contentExpandedClass || o.expandedClass, expanded);
      if (trigger) {
        toggleClass(trigger, o.triggerExpandedClass || o.expandedClass, expanded);
        syncTriggerLabel(trigger, expanded, resolveExpandCollapseLabels(trigger, o.labels));
      }
    }

    function applyTransition() {
      content.style.transition =
        `height ${o.duration}ms ${o.easing}, opacity ${o.duration}ms ${o.easing}` +
        (o.collapsedTransform || o.expandedTransform ? `, transform ${o.duration}ms ${o.easing}` : '');
      content.style.overflow = 'hidden';
    }

    function applyImmediateState() {
      content.style.transition = 'none';
      content.style.overflow = 'hidden';
      if (expanded) {
        content.style.display = expandedDisplay;
        content.style.height = 'auto';
        content.style.opacity = '1';
        if (o.expandedTransform) content.style.transform = o.expandedTransform;
      } else {
        content.style.display = 'none';
        content.style.height = '0px';
        content.style.opacity = String(o.collapsedOpacity);
        if (o.collapsedTransform) content.style.transform = o.collapsedTransform;
      }
      syncA11y();
      syncClassAndLabel();
      cleanupTemporaryStyles();
    }

    function scheduleFrame(callback) {
      clearFrame();
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          if (!disposed) callback();
        });
        return;
      }
      callback();
    }

    function cleanupTemporaryStyles() {
      restoreExpandInlineStyle(content, 'height', originalInline.height);
      restoreExpandInlineStyle(content, 'transition', originalInline.transition);
      restoreExpandInlineStyle(content, 'overflow', originalInline.overflow);
      restoreExpandInlineStyle(content, 'opacity', originalInline.opacity);
      if (!o.collapsedTransform && !o.expandedTransform) {
        restoreExpandInlineStyle(content, 'transform', originalInline.transform);
      }
    }

    function getContentHeight() {
      if (content.scrollHeight) return content.scrollHeight;
      if (content.offsetHeight) return content.offsetHeight;
      if (content.getBoundingClientRect) return content.getBoundingClientRect().height || 0;
      return 0;
    }

    function emitChange(meta) {
      if (!content || typeof content.dispatchEvent !== 'function') return;
      const detail = { expanded, element: content, trigger, meta: meta || {} };
      let event = null;
      if (typeof CustomEvent === 'function') {
        event = new CustomEvent('fx-expand-change', { detail, bubbles: true });
      } else if (typeof Event === 'function') {
        event = new Event('fx-expand-change', { bubbles: true });
        event.detail = detail;
      }
      if (event) content.dispatchEvent(event);
    }

    function setExpanded(nextExpanded, meta) {
      if (disposed) return;
      const target = !!nextExpanded;
      clearTimer();
      clearFrame();
      expanded = target;
      applyTransition();
      syncA11y();
      syncClassAndLabel();
      if (target) {
        if (typeof o.onBeforeExpand === 'function') o.onBeforeExpand({ element: content, trigger, meta });
        content.style.display = expandedDisplay;
        content.style.height = '0px';
        content.style.opacity = String(o.collapsedOpacity);
        if (o.collapsedTransform) content.style.transform = o.collapsedTransform;
        const targetHeight = getContentHeight();
        scheduleFrame(() => {
          content.style.height = targetHeight + 'px';
          content.style.opacity = '1';
          if (o.expandedTransform) content.style.transform = o.expandedTransform;
          timer = setTimeout(() => {
            content.style.height = 'auto';
            cleanupTemporaryStyles();
            if (typeof o.onExpandEnd === 'function') o.onExpandEnd({ element: content, trigger, meta });
            emitChange(meta);
          }, Math.max(0, o.duration));
        });
        return;
      }
      if (typeof o.onBeforeCollapse === 'function') o.onBeforeCollapse({ element: content, trigger, meta });
      content.style.display = expandedDisplay;
      content.style.height = getContentHeight() + 'px';
      content.style.opacity = '1';
      if (o.expandedTransform) content.style.transform = o.expandedTransform;
      scheduleFrame(() => {
        content.style.height = '0px';
        content.style.opacity = String(o.collapsedOpacity);
        if (o.collapsedTransform) content.style.transform = o.collapsedTransform;
        timer = setTimeout(() => {
          content.style.display = 'none';
          cleanupTemporaryStyles();
          if (typeof o.onCollapseEnd === 'function') o.onCollapseEnd({ element: content, trigger, meta });
          emitChange(meta);
        }, Math.max(0, o.duration));
      });
    }

    function toggle(meta) {
      setExpanded(!expanded, meta);
    }

    const off =
      trigger && o.bindTrigger !== false
        ? listeners(trigger, ['click'], () => toggle({ source: 'trigger' }))
        : null;
    applyImmediateState();

    return {
      setExpanded,
      toggle,
      update(nextOptions) {
        Object.assign(o, nextOptions || {});
        if (nextOptions && Object.prototype.hasOwnProperty.call(nextOptions, 'expanded')) {
          setExpanded(!!nextOptions.expanded, { source: 'update' });
        }
      },
      destroy() {
        disposed = true;
        clearTimer();
        clearFrame();
        if (off) off();
        if (originalStyle === null) content.removeAttribute('style');
        else content.setAttribute('style', originalStyle);
        content.className = originalContentClass;
        content.hidden = originalContentHidden;
        if (originalAriaHidden === null) content.removeAttribute('aria-hidden');
        else content.setAttribute('aria-hidden', originalAriaHidden);
        if (trigger) {
          trigger.className = originalTriggerClass;
          if (originalTriggerExpanded === null) trigger.removeAttribute('aria-expanded');
          else trigger.setAttribute('aria-expanded', originalTriggerExpanded);
          syncTriggerLabel(trigger, false, { collapsed: originalTriggerLabel, expanded: originalTriggerLabel });
        }
      },
    };
  }

  function getDirectText(el) {
    if (!el || !el.childNodes) return '';
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node && node.nodeType === 3 && String(node.textContent || '').trim()) {
        return node.textContent;
      }
    }
    return String(el.textContent || '').trim();
  }

  function snapshotExpandInlineStyles(el) {
    return {
      display: el.style.display,
      height: el.style.height,
      opacity: el.style.opacity,
      overflow: el.style.overflow,
      transition: el.style.transition,
      transform: el.style.transform,
    };
  }

  function restoreExpandInlineStyle(el, prop, value) {
    if (!el || !el.style) return;
    if (value) el.style[prop] = value;
    else if (typeof el.style.removeProperty === 'function') {
      el.style.removeProperty(prop.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase()));
    } else {
      el.style[prop] = '';
    }
  }

  function getTriggerLabelTarget(trigger) {
    if (!trigger || !trigger.querySelector) return trigger;
    return (
      trigger.querySelector('[data-expanded-label], [data-collapsed-label]') ||
      trigger
    );
  }

  function syncTriggerLabel(trigger, expanded, labels) {
    if (!trigger || !labels) return;
    const nextLabel = expanded ? labels.expanded : labels.collapsed;
    if (nextLabel == null) return;
    const target = getTriggerLabelTarget(trigger);
    if (target && target.childNodes) {
      for (let i = 0; i < target.childNodes.length; i++) {
        const node = target.childNodes[i];
        if (node && node.nodeType === 3 && String(node.textContent || '').trim()) {
          node.textContent = String(nextLabel);
          return;
        }
      }
    }
    if (typeof document !== 'undefined' && document.createTextNode) {
      target.insertBefore(document.createTextNode(String(nextLabel)), target.firstChild || null);
      return;
    }
    target.textContent = String(nextLabel);
  }

  function toggleClass(el, className, enabled) {
    if (!el || !className || !el.classList) return;
    String(className)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((name) => el.classList.toggle(name, !!enabled));
  }

  function inferExpandCollapseExpanded(content, trigger, options) {
    const contentClass = options.contentExpandedClass || options.expandedClass;
    const triggerClass = options.triggerExpandedClass || options.expandedClass;
    if (content && contentClass && content.classList && content.classList.contains(contentClass)) return true;
    if (trigger && triggerClass && trigger.classList && trigger.classList.contains(triggerClass)) return true;
    if (trigger && trigger.getAttribute('aria-expanded') === 'true') return true;
    if (content && content.getAttribute('aria-hidden') === 'false') return true;
    return false;
  }

  function resolveExpandCollapseLabels(trigger, labels) {
    if (labels) return labels;
    const labelTarget = getTriggerLabelTarget(trigger);
    const collapsedAttr =
      labelTarget && labelTarget.getAttribute && labelTarget.getAttribute('data-collapsed-label');
    const expandedAttr =
      labelTarget && labelTarget.getAttribute && labelTarget.getAttribute('data-expanded-label');
    if (collapsedAttr != null || expandedAttr != null) {
      const text = getDirectText(labelTarget).trim();
      return {
        collapsed: collapsedAttr != null ? collapsedAttr : text,
        expanded: expandedAttr != null ? expandedAttr : text,
      };
    }
    const text = getDirectText(labelTarget || trigger).trim();
    if (text === '查看分析' || text === '收起分析') {
      return { collapsed: '查看分析', expanded: '收起分析' };
    }
    return null;
  }

  function matchesExpandSelector(el, selector) {
    if (!el || !selector || !el.matches) return false;
    try {
      return el.matches(selector);
    } catch (_error) {
      return false;
    }
  }

  function isExpandTriggerCandidate(el, options) {
    if (!el || el.nodeType !== 1) return false;
    if (matchesExpandSelector(el, options.triggerSelector || EXPAND_TRIGGER_SELECTOR)) return true;
    const tag = String(el.tagName || '').toLowerCase();
    const role = el.getAttribute && el.getAttribute('role');
    return tag === 'button' || tag === 'summary' || role === 'button';
  }

  function findAriaTriggerForContent(content) {
    if (!content || !content.id || typeof document === 'undefined' || !document.querySelectorAll) {
      return null;
    }
    const triggers = Array.from(document.querySelectorAll('[aria-controls]'));
    return (
      triggers.find(
        (candidate) => candidate.getAttribute && candidate.getAttribute('aria-controls') === content.id
      ) || null
    );
  }

  function resolveExpandCollapseTrigger(content, options) {
    const explicit = resolveChild(document, options.trigger);
    if (explicit) return explicit;
    const ariaTrigger = findAriaTriggerForContent(content);
    if (ariaTrigger) return ariaTrigger;
    const prev = content.previousElementSibling;
    if (isExpandTriggerCandidate(prev, options)) return prev;
    const next = content.nextElementSibling;
    if (isExpandTriggerCandidate(next, options)) return next;
    const item =
      content.closest && content.closest(options.itemSelector || EXPAND_ITEM_SELECTOR);
    if (item) {
      return (
        resolveChild(item, options.triggerSelector || EXPAND_TRIGGER_SELECTOR) ||
        resolveChild(item, options.trigger) ||
        null
      );
    }
    return null;
  }

  function resolveExpandCollapseContent(item, trigger, options) {
    const ariaControls = trigger && trigger.getAttribute && trigger.getAttribute('aria-controls');
    if (ariaControls && typeof document !== 'undefined') {
      const controlled = document.getElementById ? document.getElementById(ariaControls) : null;
      if (controlled) return controlled;
    }
    return (
      resolveChild(item, options.contentSelector || EXPAND_CONTENT_SELECTOR) ||
      resolveChild(item, options.content) ||
      null
    );
  }

  function applyExpandCollapseGroup(containerEl, opts) {
    const o = merge(
      {
        itemSelector: EXPAND_ITEM_SELECTOR,
        contentSelector: EXPAND_CONTENT_SELECTOR,
        triggerSelector: EXPAND_TRIGGER_SELECTOR,
        multiple: true,
        expanded: null,
        expandedClass: 'expanded',
        contentExpandedClass: 'expanded',
        triggerExpandedClass: 'expanded',
        labels: null,
      },
      opts
    );
    const container = resolveChild(document, containerEl) || containerEl;
    if (!container || !container.querySelectorAll) {
      throw new Error('QADC_FX.applyExpandCollapseGroup requires a valid container element.');
    }
    let handles = [];
    let disposed = false;

    function refresh() {
      handles.forEach((entry) => entry.handle.destroy());
      handles = [];
      Array.from(container.querySelectorAll(o.itemSelector)).forEach((item) => {
        const trigger = resolveChild(item, o.triggerSelector) || resolveChild(item, o.trigger);
        const content = resolveExpandCollapseContent(item, trigger, o);
        if (!content) return;
        const handle = applyExpandCollapse(
          content,
          merge(o, {
            trigger,
            bindTrigger: false,
            labels: resolveExpandCollapseLabels(trigger, o.labels),
            expanded:
              o.expanded == null
                ? inferExpandCollapseExpanded(content, trigger, o)
                : !!o.expanded,
          })
        );
        handles.push({ item, trigger, content, handle });
      });
    }

    function findEntryFromEvent(event) {
      const trigger = event.target && event.target.closest ? event.target.closest(o.triggerSelector) : null;
      if (!trigger || (container.contains && !container.contains(trigger))) return null;
      const item = trigger.closest ? trigger.closest(o.itemSelector) : null;
      return handles.find((entry) => entry.trigger === trigger || entry.item === item) || null;
    }

    function handleClick(event) {
      const entry = findEntryFromEvent(event);
      if (!entry) return;
      if (!o.multiple) {
        handles.forEach((candidate) => {
          if (candidate !== entry) candidate.handle.setExpanded(false, { source: 'group' });
        });
      }
      entry.handle.toggle({ source: 'group-trigger' });
    }

    const off = listeners(container, ['click'], handleClick);
    refresh();

    return {
      refresh,
      update(nextOptions) {
        Object.assign(o, nextOptions || {});
        refresh();
      },
      destroy() {
        if (disposed) return;
        disposed = true;
        off();
        handles.forEach((entry) => entry.handle.destroy());
        handles = [];
      },
    };
  }
  function applyDragSort(container, opts) {
    const o = merge({ itemSelector: '.sort-item', gap: 8, duration: 200, onSort: null }, opts);
    let dragEl = null,
      startY = 0,
      startIdx = 0;
    const getItems = () => Array.from(container.querySelectorAll(o.itemSelector));
    function getItemH() {
      const el = container.querySelector(o.itemSelector);
      return el ? el.offsetHeight + o.gap : 50;
    }
    function down(e) {
      const item = e.target.closest(o.itemSelector);
      if (!item) return;
      e.preventDefault();
      dragEl = item;
      dragEl.classList.add('dragging');
      startY = (e.touches ? e.touches[0] : e).clientY;
      startIdx = getItems().indexOf(item);
    }
    function move(e) {
      if (!dragEl) return;
      e.preventDefault();
      const cy = (e.touches ? e.touches[0] : e).clientY;
      const dy = cy - startY;
      dragEl.style.transform = `translateY(${dy}px)`;
      const itemH = getItemH();
      const offset = Math.round(dy / itemH);
      const items = getItems();
      const curIdx = items.indexOf(dragEl);
      const newIdx = Math.max(0, Math.min(items.length - 1, startIdx + offset));
      if (newIdx !== curIdx) {
        if (newIdx > curIdx) container.insertBefore(dragEl, items[newIdx + 1] || null);
        else container.insertBefore(dragEl, items[newIdx]);
        startY += (newIdx - startIdx) * itemH - dy;
        startIdx = newIdx;
      }
    }
    function up() {
      if (!dragEl) return;
      dragEl.classList.remove('dragging');
      dragEl.style.transform = '';
      if (o.onSort) o.onSort(getItems());
      dragEl = null;
    }
    const offs = [
      listeners(container, ['pointerdown'], down),
      listeners(document, ['pointermove'], move),
      listeners(document, ['pointerup'], up),
    ];
    return {
      destroy() {
        offs.forEach((f) => f());
      },
    };
  }
  function applyPageSlide(pages, opts) {
    let o = merge(
      {
        duration: 400,
        ease: 'ease-in-out',
        easing: null,
        direction: 'horizontal',
        animation: 'slide', // 'slide' | 'zoom' | 'fade' | 'flip'
        zoomDirection: 'in', // 'in' 从小放大进入 / 'out' 从大缩小进入
        index: 0,
        disableDuringTransition: true,
        onIndexChange: null,
        onTransitionStart: null,
        onTransitionEnd: null,
      },
      opts
    );
    let current = typeof o.index === 'number' ? o.index : 0;
    let isTransitioning = false;
    let transitionTimer = 0;
    let transitionToken = 0;
    const originalPages = pages.map((page) => ({
      el: page,
      transition: page.style.transition,
      willChange: page.style.willChange,
      transform: page.style.transform,
      opacity: page.style.opacity,
      zIndex: page.style.zIndex,
      visibility: page.style.visibility,
      pointerEvents: page.style.pointerEvents,
    }));
    const clampedIndex = (value) => Math.max(0, Math.min(pages.length - 1, value));
    function getProp() {
      return o.direction === 'vertical' ? 'translateY' : 'translateX';
    }
    function getEase() {
      return o.easing || o.ease || 'ease-in-out';
    }
    // 根据当前 animation 计算某一页在目标 index 下的 transform/opacity。
    // offset = i - nextIndex：-1 = 已离场（0 在左/上），0 = 当前，1 = 未到场（0 在右/下）。
    function pageStyleFor(i, nextIndex) {
      const offset = i - nextIndex;
      // |offset| > 1 的远端页：本次切换不参与，直接隐藏（避免「传送带」观感）。
      // 只有当前页与相邻页（offset = -1/0/1）参与动画，体现「两页互切」。
      if (Math.abs(offset) > 1) {
        // 远端页隐藏位置：slide 模式靠 prop 方向隐藏，其他模式同当前页但 opacity:0 + visibility:hidden。
        const prop = getProp();
        const farTransform =
          o.animation === 'slide' ? `${prop}(${offset > 0 ? 200 : -200}%)` : 'none';
        return { transform: farTransform, opacity: '0', zIndex: '0', visibility: 'hidden' };
      }
      switch (o.animation) {
        case 'fade':
          // 纯 opacity 在连续两页内容接近时不够明显，补一个微弱 translateY(6px) 让进场页从下方渐现。
          return {
            transform: offset === 0 ? 'translateY(0)' : 'translateY(6px)',
            opacity: offset === 0 ? '1' : '0',
            zIndex: offset === 0 ? '2' : '1',
            visibility: 'visible',
          };
        case 'zoom': {
          // zoomDirection: 'in' 默认 — 进场页从小放大（scale 0.85→1），离场页继续放大淡出（1→1.15）
          // zoomDirection: 'out'      — 进场页从大缩小（scale 1.15→1），离场页继续缩小淡出（1→0.85）
          const isOut = o.zoomDirection === 'out';
          let scale;
          if (offset === 0) scale = 1;
          else if (offset < 0) scale = isOut ? 0.85 : 1.15;
          else scale = isOut ? 1.15 : 0.85;
          return {
            transform: `scale(${scale})`,
            opacity: offset === 0 ? '1' : '0',
            zIndex: offset === 0 ? '2' : '1',
            visibility: 'visible',
          };
        }
        case 'flip':
          return {
            transform: `perspective(1200px) rotateY(${offset * 90}deg)`,
            opacity: offset === 0 ? '1' : '0',
            zIndex: offset === 0 ? '2' : '1',
            visibility: 'visible',
          };
        case 'slide':
        default: {
          const prop = getProp();
          return {
            transform: `${prop}(${offset * 100}%)`,
            opacity: '1',
            zIndex: offset === 0 ? '2' : '1',
            visibility: 'visible',
          };
        }
      }
    }
    function applyStyles() {
      pages.forEach((page) => {
        page.style.transition = `transform ${o.duration}ms ${getEase()}, opacity ${o.duration}ms ${getEase()}`;
        page.style.willChange = 'transform, opacity';
      });
    }
    function updateInteractivity() {
      if (!o.disableDuringTransition) return;
      pages.forEach((page) => {
        page.style.pointerEvents = isTransitioning ? 'none' : '';
      });
    }
    function finishTransition(token, nextIndex, meta) {
      if (token !== transitionToken) return;
      isTransitioning = false;
      updateInteractivity();
      if (typeof o.onTransitionEnd === 'function') {
        o.onTransitionEnd(
          Object.assign(
            {
              index: current,
              pageCount: pages.length,
              direction: o.direction,
              animation: o.animation,
            },
            meta || {}
          )
        );
      }
      if (typeof o.onIndexChange === 'function') o.onIndexChange(nextIndex, meta || {});
    }
    function goTo(idx, options) {
      const nextIndex = clampedIndex(idx);
      const meta = Object.assign({ animated: true, source: 'programmatic' }, options || {});
      const previousIndex = current;
      const token = ++transitionToken;
      current = nextIndex;
      isTransitioning = Boolean(meta.animated);
      updateInteractivity();
      if (typeof o.onTransitionStart === 'function') {
        o.onTransitionStart({
          index: nextIndex,
          previousIndex,
          pageCount: pages.length,
          direction: o.direction,
          animation: o.animation,
          source: meta.source,
        });
      }
      pages.forEach((page, i) => {
        const offset = i - nextIndex;
        const styles = pageStyleFor(i, nextIndex);
        // 只有相邻页（|offset| <= 1）才走 transition；远端页直接到位不参与过渡。
        const inAnimRange = Math.abs(offset) <= 1;
        if (meta.animated === false || !inAnimRange) page.style.transition = 'none';
        else
          page.style.transition = `transform ${o.duration}ms ${getEase()}, opacity ${o.duration}ms ${getEase()}`;
        page.style.transform = styles.transform;
        page.style.opacity = styles.opacity;
        if (styles.zIndex !== undefined) page.style.zIndex = styles.zIndex;
        if (styles.visibility !== undefined) page.style.visibility = styles.visibility;
      });
      window.clearTimeout(transitionTimer);
      if (meta.animated === false) {
        requestAnimationFrame(() => {
          applyStyles();
          finishTransition(token, nextIndex, meta);
        });
      } else {
        transitionTimer = window.setTimeout(() => {
          finishTransition(token, nextIndex, meta);
        }, o.duration);
      }
    }
    applyStyles();
    goTo(current, { animated: false, source: 'initial' });
    return {
      update(nextOpts) {
        const next = merge(o, nextOpts || {});
        const nextIndex = typeof next.index === 'number' ? next.index : current;
        o = next;
        applyStyles();
        if (typeof nextOpts.index === 'number') {
          goTo(nextIndex, { animated: true, source: 'update' });
        } else {
          goTo(current, { animated: false, source: 'update' });
        }
      },
      goTo,
      current: () => current,
      getState() {
        return {
          index: current,
          pageCount: pages.length,
          isTransitioning,
          direction: o.direction,
          animation: o.animation,
        };
      },
      destroy() {
        window.clearTimeout(transitionTimer);
        originalPages.forEach((entry) => {
          entry.el.style.transition = entry.transition;
          entry.el.style.willChange = entry.willChange;
          entry.el.style.transform = entry.transform;
          entry.el.style.opacity = entry.opacity;
          entry.el.style.zIndex = entry.zIndex;
          entry.el.style.visibility = entry.visibility;
          entry.el.style.pointerEvents = entry.pointerEvents;
        });
      },
    };
  }
  // applyPageSlide 的 3 个薄封装：让「缩放进入」「淡入淡出」「3D 翻转」作为独立 API 出现在合成器/导出代码里，
  // 而不是藏在 applyPageSlide 的 animation 参数里。底层实现复用同一套状态机。
  function applyPageZoom(pages, opts) {
    return applyPageSlide(pages, Object.assign({}, opts || {}, { animation: 'zoom' }));
  }
  function applyPageFade(pages, opts) {
    return applyPageSlide(pages, Object.assign({}, opts || {}, { animation: 'fade' }));
  }
  function applyPageFlip(pages, opts) {
    return applyPageSlide(pages, Object.assign({}, opts || {}, { animation: 'flip' }));
  }
  function applyFadeMorph(card, opts) {
    let o = merge(
      {
        expanded: false,
        duration: 400,
        radius: 16,
        accentColor: '#FFFFFF',
        ease: 'cubic-bezier(0.4,0,0.2,1)',
        easing: null,
        expandedClass: 'expanded',
        interactive: true,
        toggleSelector: null,
        onExpandedChange: null,
        onTransitionStart: null,
        onTransitionEnd: null,
      },
      opts
    );
    const original = {
      dur: card.style.getPropertyValue('--dur'),
      br: card.style.getPropertyValue('--br'),
      accent: card.style.getPropertyValue('--accent-color'),
      ease: card.style.getPropertyValue('--ease'),
    };
    let expanded = Boolean(o.expanded);
    let transitionTimer = 0;
    let transitionToken = 0;
    const toggles = o.toggleSelector
      ? Array.from(card.querySelectorAll(o.toggleSelector))
      : o.interactive !== false
        ? [card]
        : [];
    function applyVars() {
      card.style.setProperty('--dur', `${o.duration}ms`);
      card.style.setProperty('--br', `${o.radius}px`);
      card.style.setProperty('--accent-color', o.accentColor);
      card.style.setProperty('--ease', o.easing || o.ease || 'cubic-bezier(0.4,0,0.2,1)');
    }
    function setExpanded(nextExpanded, meta) {
      const next = Boolean(nextExpanded);
      const previous = expanded;
      const token = ++transitionToken;
      expanded = next;
      if (typeof o.onTransitionStart === 'function') {
        o.onTransitionStart({
          expanded: next,
          previousExpanded: previous,
          source: (meta && meta.source) || 'programmatic',
        });
      }
      card.classList.toggle(o.expandedClass, next);
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        if (token !== transitionToken) return;
        if (typeof o.onExpandedChange === 'function') o.onExpandedChange(expanded, meta || {});
        if (typeof o.onTransitionEnd === 'function') {
          o.onTransitionEnd({
            expanded,
            previousExpanded: previous,
            source: (meta && meta.source) || 'programmatic',
          });
        }
      }, o.duration);
    }
    function handleToggle(event) {
      if (event && event.currentTarget !== card && card.contains(event.currentTarget)) {
        event.stopPropagation();
      }
      setExpanded(!expanded, { source: 'toggle' });
    }
    toggles.forEach((toggleEl) => toggleEl.addEventListener('click', handleToggle));
    applyVars();
    setExpanded(expanded, { source: 'initial' });
    return {
      update(nextOpts) {
        const next = merge(o, nextOpts || {});
        const nextExpanded = typeof next.expanded === 'boolean' ? next.expanded : expanded;
        o = next;
        applyVars();
        if (typeof nextOpts.expanded === 'boolean') {
          setExpanded(nextExpanded, { source: 'update' });
        }
      },
      expand(meta) {
        setExpanded(true, Object.assign({ source: 'expand' }, meta || {}));
      },
      collapse(meta) {
        setExpanded(false, Object.assign({ source: 'collapse' }, meta || {}));
      },
      toggle(meta) {
        setExpanded(!expanded, Object.assign({ source: 'toggle' }, meta || {}));
      },
      getState() {
        return { expanded };
      },
      destroy() {
        window.clearTimeout(transitionTimer);
        toggles.forEach((toggleEl) => toggleEl.removeEventListener('click', handleToggle));
        card.style.setProperty('--dur', original.dur);
        card.style.setProperty('--br', original.br);
        card.style.setProperty('--accent-color', original.accent);
        card.style.setProperty('--ease', original.ease);
      },
    };
  }
  function applyToggle(el, opts) {
    const o = merge({ duration: 300, onColor: '#00E08A', style: 'simple', onChange: null }, opts);
    el.style.setProperty('--dur', o.duration + 'ms');
    el.style.setProperty('--on-color', o.onColor);
    function handler() {
      const isOn = el.classList.toggle('on');
      if (o.style === 'liquid') {
        el.classList.add('moving');
        setTimeout(() => el.classList.remove('moving'), 150);
      }
      if (o.onChange) o.onChange(isOn);
    }
    const off = listeners(el, ['click'], handler);
    return { destroy: off, isOn: () => el.classList.contains('on'), toggle: handler };
  }
  function animateCounter(el, opts) {
    const o = merge({ from: 0, to: 100, duration: 1500, format: null, ease: 'out' }, opts);
    const eases = {
      linear: (t) => t,
      out: (t) => 1 - Math.pow(1 - t, 3),
      inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    };
    const easeFn = eases[o.ease] || eases.out;
    const fmt = o.format || ((n) => Math.round(n).toLocaleString());
    if (hasAnime()) {
      const obj = { val: o.from };
      return anime.animate(obj, {
        val: [o.from, o.to],
        duration: o.duration,
        ease: o.ease === 'out' ? 'out(3)' : o.ease === 'inOut' ? 'inOut(2)' : 'linear',
        onUpdate: () => {
          el.textContent = fmt(obj.val);
        },
      });
    } else {
      const start = Date.now();
      function step() {
        const t = Math.min(1, (Date.now() - start) / o.duration);
        el.textContent = fmt(o.from + (o.to - o.from) * easeFn(t));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      return null;
    }
  }
  function applyNumberCounterElement(el, opts) {
    const o = merge(
      {
        target: null,
        from: null,
        to: null,
        duration: 1500,
        easing: 'ease-out',
        separator: 'comma',
        textColor: null,
        fontSize: null,
        fontWeight: null,
        fontFamily: null,
        letterSpacing: null,
        lineHeight: null,
        fontVariantNumeric: null,
        replayOnClick: false,
      },
      opts
    );
    if (!el || typeof el.textContent === 'undefined') {
      throw new Error('QADC_FX.applyNumberCounter requires a valid text element.');
    }
    const originalHTML = el.innerHTML;
    const originalStyle = el.getAttribute('style');
    let rafId = 0;
    let disposed = false;

    function parseNumber(value, fallback) {
      const numeric = Number(String(value == null ? '' : value).replace(/[,\s]/g, ''));
      return Number.isFinite(numeric) ? numeric : fallback;
    }
    function formatNumber(value) {
      let str = Math.round(value).toString();
      if (o.separator !== 'none') {
        const separator = o.separator === 'space' ? ' ' : ',';
        str = str.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
      }
      return str;
    }
    function ease(t) {
      if (o.easing === 'ease-in-out') {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }
      if (o.easing === 'linear') return t;
      return 1 - Math.pow(1 - t, 3);
    }
    function syncStyle() {
      if (o.textColor != null) el.style.color = o.textColor;
      if (o.fontSize != null) el.style.fontSize = typeof o.fontSize === 'number' ? o.fontSize + 'px' : o.fontSize;
      if (o.fontWeight != null) el.style.fontWeight = o.fontWeight;
      if (o.fontFamily != null) el.style.fontFamily = o.fontFamily;
      if (o.letterSpacing != null) {
        el.style.letterSpacing = typeof o.letterSpacing === 'number' ? o.letterSpacing + 'px' : o.letterSpacing;
      }
      if (o.lineHeight != null) el.style.lineHeight = o.lineHeight;
      if (o.fontVariantNumeric != null) el.style.fontVariantNumeric = o.fontVariantNumeric;
      if (o.replayOnClick) el.style.cursor = o.cursor || 'pointer';
    }
    function play() {
      if (disposed) return;
      if (rafId) cancelAnimationFrame(rafId);
      const current = parseNumber(el.textContent, 0);
      const from = o.from != null ? parseNumber(o.from, current) : current;
      const target = parseNumber(o.to != null ? o.to : o.target, current);
      const duration = Math.max(0, Number(o.duration) || 0);
      const start = performance.now();
      if (!duration) {
        el.textContent = formatNumber(target);
        return;
      }
      el.textContent = formatNumber(from);
      function step(now) {
        if (disposed) return;
        const t = Math.min(1, (now - start) / duration);
        el.textContent = formatNumber(from + (target - from) * ease(t));
        if (t < 1) rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }
    function handleClick() {
      play();
    }

    syncStyle();
    if (o.replayOnClick) el.addEventListener('click', handleClick);
    play();
    return {
      update(nextOptions) {
        Object.assign(o, nextOptions || {});
        syncStyle();
        play();
      },
      reset: play,
      replay: play,
      destroy() {
        disposed = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (o.replayOnClick) el.removeEventListener('click', handleClick);
        el.innerHTML = originalHTML;
        if (originalStyle === null) el.removeAttribute('style');
        else el.setAttribute('style', originalStyle);
      },
    };
  }
  function applyNumberCounter(el, opts) {
    return applyTextTargets(el, opts, applyNumberCounterElement);
  }
  function applyGradientFlow(el, opts) {
    const o = merge(
      {
        colors: ['#FF4D7A', '#FFE500', '#40E0FF', '#C084FC'],
        speed: 6,
        angle: 135,
        type: 'linear',
      },
      opts
    );
    const colStr = o.colors.join(', ');
    let bg;
    if (o.type === 'radial') bg = `radial-gradient(circle, ${colStr})`;
    else if (o.type === 'conic') bg = `conic-gradient(from ${o.angle}deg, ${colStr})`;
    else bg = `linear-gradient(${o.angle}deg, ${colStr})`;
    el.style.background = bg;
    el.style.backgroundSize = '400% 400%';
    el.style.animation = `qadc-grad-flow ${o.speed}s ease infinite`;
    if (!document.getElementById('qadc-grad-css')) {
      const s = document.createElement('style');
      s.id = 'qadc-grad-css';
      s.textContent =
        '@keyframes qadc-grad-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}';
      document.head.appendChild(s);
    }
    return {
      destroy() {
        el.style.animation = '';
        el.style.background = '';
      },
    };
  }
  function applyPathDraw(target, opts) {
    const o = merge(
      {
        duration: 2000,
        strokeW: 2,
        color: '#0071e3',
        easing: 'inOut(2)',
        fillEnd: false,
        loop: false,
      },
      opts
    );
    function isSvgPathNode(node) {
      return (
        (typeof SVGPathElement !== 'undefined' && node instanceof SVGPathElement) ||
        (node && node.nodeType === 1 && String(node.tagName || '').toLowerCase() === 'path')
      );
    }
    function isSvgRootNode(node) {
      return (
        (typeof SVGSVGElement !== 'undefined' && node instanceof SVGSVGElement) ||
        (node && node.nodeType === 1 && String(node.tagName || '').toLowerCase() === 'svg')
      );
    }
    const pathEl = isSvgPathNode(target)
      ? target
      : isSvgRootNode(target)
        ? target.querySelector('[data-motion-path-target], path')
        : target && target.querySelector
          ? target.querySelector('[data-motion-path-target], path')
          : null;
    if (!isSvgPathNode(pathEl)) {
      throw new Error('applyPathDraw needs SVG path');
    }
    const original = {
      fill: pathEl.getAttribute('fill'),
      stroke: pathEl.getAttribute('stroke'),
      strokeWidth: pathEl.getAttribute('stroke-width'),
      strokeLinecap: pathEl.getAttribute('stroke-linecap'),
      strokeLinejoin: pathEl.getAttribute('stroke-linejoin'),
      dashArray: pathEl.style.strokeDasharray,
      dashOffset: pathEl.style.strokeDashoffset,
    };
    let current = null;
    function render() {
      if (current && typeof current.cancel === 'function') current.cancel();
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke', o.color);
      pathEl.setAttribute('stroke-width', o.strokeW);
      pathEl.setAttribute('stroke-linecap', 'round');
      pathEl.setAttribute('stroke-linejoin', 'round');
      current = drawPath(pathEl, {
        duration: o.duration,
        ease: o.easing,
        loop: o.loop,
        onComplete() {
          if (o.fillEnd && !o.loop) pathEl.setAttribute('fill', `${o.color}33`);
        },
      });
    }
    render();
    return {
      update(nextOpts) {
        Object.assign(o, nextOpts || {});
        render();
      },
      destroy() {
        if (current && typeof current.cancel === 'function') current.cancel();
        if (original.fill == null) pathEl.removeAttribute('fill');
        else pathEl.setAttribute('fill', original.fill);
        if (original.stroke == null) pathEl.removeAttribute('stroke');
        else pathEl.setAttribute('stroke', original.stroke);
        if (original.strokeWidth == null) pathEl.removeAttribute('stroke-width');
        else pathEl.setAttribute('stroke-width', original.strokeWidth);
        if (original.strokeLinecap == null) pathEl.removeAttribute('stroke-linecap');
        else pathEl.setAttribute('stroke-linecap', original.strokeLinecap);
        if (original.strokeLinejoin == null) pathEl.removeAttribute('stroke-linejoin');
        else pathEl.setAttribute('stroke-linejoin', original.strokeLinejoin);
        pathEl.style.strokeDasharray = original.dashArray;
        pathEl.style.strokeDashoffset = original.dashOffset;
      },
    };
  }
  function applyGlassmorphism(host, opts) {
    const o = merge(
      {
        sceneBg: '#050015',
        textColor: '#ffffff',
        blur: 20,
        cardOpacity: 0.1,
        borderAlpha: 0.18,
        blobCount: 5,
        blobSize: 200,
        blobSpeed: 2,
      },
      opts
    );
    ensureFxStyle(
      'qgc',
      '.qgh{position:relative;overflow:hidden;isolation:isolate}.qgh[data-qadc-gl-min="true"]{min-height:220px}.qgh>:not(.qgb){position:relative;z-index:1}.qgb{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:var(--qgbg,#050015)}.qgl{position:absolute;inset:0}.qgg{position:absolute;border-radius:999px;filter:blur(80px);opacity:.8;will-change:transform}.qgs{position:relative;z-index:1;backdrop-filter:blur(var(--qgbl,20px));-webkit-backdrop-filter:blur(var(--qgbl,20px));background:rgba(255,255,255,var(--qgop,.1));border:1px solid rgba(255,255,255,var(--qgbo,.18));box-shadow:0 8px 32px rgba(0,0,0,.3);color:var(--qgtc,#fff)}',
      host.ownerDocument
    );
    const colors = [
      '#ff006e',
      '#8338ec',
      '#3a86ff',
      '#06d6a0',
      '#fb5607',
      '#ffbe0b',
      '#e63946',
      '#457b9d',
    ];
    const hostSnapshot = snapshotInlineStyles(
      [host],
      ['--qgbg', '--qgbl', '--qgop', '--qgbo', '--qgtc']
    );
    const originalMinAttr = host.getAttribute('data-qadc-gl-min');
    const previousClass = host.className;
    if (!host.style.minHeight && host.clientHeight < 120)
      host.setAttribute('data-qadc-gl-min', 'true');
    host.classList.add('qgh');
    const backdrop = document.createElement('div');
    backdrop.className = 'qgb';
    const blobLayer = document.createElement('div');
    blobLayer.className = 'qgl';
    backdrop.appendChild(blobLayer);
    host.insertBefore(backdrop, host.firstChild);
    let surface = host.querySelector('[data-motion-glass-surface]');
    let generatedSurface = false;
    if (!surface) {
      const directChildren = Array.from(host.children).filter((child) => child !== backdrop);
      surface = directChildren[0];
      if (!surface) {
        surface = document.createElement('div');
        generatedSurface = true;
        surface.innerHTML =
          '<h3 style="margin:0 0 8px;font-size:20px;font-weight:700">Glass</h3><p style="margin:0">Glass.</p>';
        surface.style.width = 'min(320px, calc(100% - 32px))';
        surface.style.margin = '32px auto';
        surface.style.padding = '32px';
        surface.style.borderRadius = '20px';
        host.appendChild(surface);
      }
    }
    const surfaceRestore = {
      cls: surface.className,
    };
    let blobs = [];
    let raf = 0;
    function createBlobs() {
      blobLayer.innerHTML = '';
      blobs = [];
      for (let index = 0; index < o.blobCount; index += 1) {
        const blob = document.createElement('div');
        const size = o.blobSize * (0.7 + Math.random() * 0.6);
        blob.className = 'qgg';
        blob.style.width = `${size}px`;
        blob.style.height = `${size}px`;
        blob.style.background = colors[index % colors.length];
        blobLayer.appendChild(blob);
        blobs.push({
          el: blob,
          x: 10 + Math.random() * 70,
          y: 10 + Math.random() * 70,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
        });
      }
    }
    function apply() {
      host.style.setProperty('--qgbg', o.sceneBg);
      host.style.setProperty('--qgbl', `${o.blur}px`);
      host.style.setProperty('--qgop', `${o.cardOpacity}`);
      host.style.setProperty('--qgbo', `${o.borderAlpha}`);
      host.style.setProperty('--qgtc', o.textColor);
      surface.classList.add('qgs');
    }
    function tick() {
      blobs.forEach((blob) => {
        blob.x += blob.vx * o.blobSpeed * 0.1;
        blob.y += blob.vy * o.blobSpeed * 0.1;
        if (blob.x < -20 || blob.x > 90) blob.vx *= -1;
        if (blob.y < -20 || blob.y > 90) blob.vy *= -1;
        blob.el.style.transform = `translate(${blob.x}%, ${blob.y}%)`;
      });
      raf = requestAnimationFrame(tick);
    }
    createBlobs();
    apply();
    tick();
    return {
      update(nextOpts) {
        const prevBlobCount = o.blobCount;
        Object.assign(o, nextOpts || {});
        apply();
        if (o.blobCount !== prevBlobCount) createBlobs();
      },
      destroy() {
        cancelAnimationFrame(raf);
        backdrop.remove();
        surface.className = surfaceRestore.cls;
        if (generatedSurface) surface.remove();
        restoreInlineStyles(hostSnapshot);
        if (originalMinAttr !== null) host.setAttribute('data-qadc-gl-min', originalMinAttr);
        else host.removeAttribute('data-qadc-gl-min');
        host.className = previousClass;
      },
    };
  }
  function applyGyroscopeTilt(host, opts) {
    const o = merge({ sensitivity: 1, maxOffset: 25, smoothing: 0.1, color: '#FFFFFF' }, opts);
    ensureFxStyle(
      'qyc',
      '.qyh{position:relative;overflow:hidden;perspective:1000px;transform-style:preserve-3d}.qyh[data-qadc-gy-min="true"]{min-height:180px}.qyl{will-change:transform;transition:transform .1s ease-out}.qyg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:16px;pointer-events:none}.qyg.layer-2{inset:18px;border-radius:12px}.qyg.layer-3{inset:36px;border-radius:8px;font-size:28px}',
      host.ownerDocument
    );
    const original = {
      minAttr: host.getAttribute('data-qadc-gy-min'),
      cls: host.className,
    };
    if (!host.style.minHeight && host.clientHeight < 120)
      host.setAttribute('data-qadc-gy-min', 'true');
    host.classList.add('qyh');
    let layers = Array.from(host.querySelectorAll('[data-motion-gyro-layer]'))
      .sort(
        (a, b) =>
          (Number(a.getAttribute('data-motion-gyro-layer')) || 0) -
          (Number(b.getAttribute('data-motion-gyro-layer')) || 0)
      )
      .slice(0, 3);
    let generated = false;
    if (!layers.length) {
      const directChildren = Array.from(host.children);
      if (directChildren.length) layers = directChildren.slice(0, 3);
    }
    if (!layers.length) {
      const rgb = (
        String(o.color || '#ffffff')
          .replace('#', '')
          .match(/.{1,2}/g) || ['ff', 'ff', 'ff']
      )
        .map((part) => parseInt(part, 16))
        .join(',');
      generated = true;
      [0.18, 0.36, 0.78].forEach((alpha, index) => {
        const layer = document.createElement('div');
        layer.className = `qyg qyl layer-${index + 1}`;
        layer.style.background = `rgba(${rgb}, ${alpha})`;
        if (index === 2) layer.textContent = '🌀';
        host.appendChild(layer);
        layers.push(layer);
      });
    }
    const layerRestores = layers.map((layer) => ({
      node: layer,
      transform: layer.style.transform,
      background: layer.style.background,
      cls: layer.className,
    }));
    layers.forEach((layer) => {
      layer.classList.add('qyl');
    });
    let tiltX = 0;
    let tiltY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let raf = 0;
    let orientationActive = false;
    let permissionRequested = false;
    function syncGeneratedColors() {
      if (!generated) return;
      const rgb = hexToRgbCsv(o.color);
      [0.18, 0.36, 0.78].forEach((alpha, index) => {
        if (layers[index]) layers[index].style.background = `rgba(${rgb}, ${alpha})`;
      });
    }
    function handleOrientation(event) {
      orientationActive = true;
      tiltX = (event.gamma || 0) / 45;
      tiltY = (event.beta || 0) / 45;
    }
    async function requestPermissionIfNeeded() {
      if (permissionRequested) return;
      permissionRequested = true;
      const OrientationEventCtor = window.DeviceOrientationEvent;
      if (!OrientationEventCtor) return;
      if (typeof OrientationEventCtor.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', handleOrientation);
        return;
      }
      try {
        const permission = await OrientationEventCtor.requestPermission();
        if (permission === 'granted')
          window.addEventListener('deviceorientation', handleOrientation);
      } catch (error) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[QADC] denied', error);
        }
      }
    }
    function handlePointerMove(event) {
      const rect = host.getBoundingClientRect();
      tiltX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      tiltY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    }
    function handlePointerLeave() {
      if (!orientationActive) {
        tiltX = 0;
        tiltY = 0;
      }
    }
    function tick() {
      smoothX += (tiltX - smoothX) * o.smoothing;
      smoothY += (tiltY - smoothY) * o.smoothing;
      const clampX = Math.max(-1, Math.min(1, smoothX * o.sensitivity));
      const clampY = Math.max(-1, Math.min(1, smoothY * o.sensitivity));
      [0.4, 0.7, 1].forEach((depth, index) => {
        if (!layers[index]) return;
        layers[index].style.transform =
          `translate3d(${clampX * o.maxOffset * depth}px, ${clampY * o.maxOffset * depth}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    }
    syncGeneratedColors();
    const offs = [
      listeners(host, ['mousemove', 'pointermove'], handlePointerMove),
      listeners(host, ['mouseleave', 'pointerleave'], handlePointerLeave),
      listeners(host, ['click'], requestPermissionIfNeeded, { passive: true }),
    ];
    requestPermissionIfNeeded();
    tick();
    return {
      update(nextOpts) {
        Object.assign(o, nextOpts || {});
        syncGeneratedColors();
      },
      destroy() {
        cancelAnimationFrame(raf);
        offs.forEach((off) => off());
        window.removeEventListener('deviceorientation', handleOrientation);
        layerRestores.forEach((entry) => {
          entry.node.style.transform = entry.transform;
          entry.node.style.background = entry.background;
          entry.node.className = entry.cls;
        });
        if (generated) layers.forEach((layer) => layer.remove());
        if (original.minAttr !== null) host.setAttribute('data-qadc-gy-min', original.minAttr);
        else host.removeAttribute('data-qadc-gy-min');
        host.className = original.cls;
      },
    };
  }
  function applyHungryMule(host, opts) {
    const o = merge({ size: 180, color: '#9f9f9f', speed: 1 }, opts);
    ensureFxStyle(
      'qmc',
      '.qmt,.qadc-hungry-mule-target{display:inline-block;white-space:nowrap;text-decoration:none;background-position:0 0;background-repeat:no-repeat;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:qms var(--qmd,var(--qadc-shine-duration,3s)) linear infinite}@keyframes qms{0%{background-position:0 0}60%{background-position:var(--qmw,var(--qadc-shine-width,180px)) 0}100%{background-position:var(--qmw,var(--qadc-shine-width,180px)) 0}}@keyframes qadc-hungry-mule-shine{0%{background-position:0 0}60%{background-position:var(--qadc-shine-width,var(--qmw,180px)) 0}100%{background-position:var(--qadc-shine-width,var(--qmw,180px)) 0}}',
      host.ownerDocument
    );
    const selector = '[data-motion-shine-target]';
    const target =
      (host.matches && host.matches(selector) ? host : null) ||
      (host.querySelector && host.querySelector(selector)) ||
      (host.querySelector &&
        host.querySelector('a,button,span,p,strong,em,label,h1,h2,h3,h4,h5,h6')) ||
      null;
    let node = target;
    let generated = false;
    if (!node) {
      node = document.createElement('a');
      node.href = '#';
      node.textContent = 'Get early access';
      host.appendChild(node);
      generated = true;
    }
    const original = {
      display: node.style.display,
      whiteSpace: node.style.whiteSpace,
      textDecoration: node.style.textDecoration,
      backgroundImage: node.style.backgroundImage,
      backgroundRepeat: node.style.backgroundRepeat,
      backgroundPosition: node.style.backgroundPosition,
      backgroundSize: node.style.backgroundSize,
      webkitBackgroundClip: node.style.webkitBackgroundClip,
      backgroundClip: node.style.backgroundClip,
      webkitTextFillColor: node.style.webkitTextFillColor,
      color: node.style.color,
      animation: node.style.animation,
      fontWeight: node.style.fontWeight,
      fontSize: node.style.fontSize,
      cls: node.className,
    };
    function buildGradient(color) {
      const base = String(color || '#9f9f9f');
      return `linear-gradient(to right, ${base} 0, #ffffff 12%, ${base} 24%)`;
    }
    function speedToDuration(speed) {
      const numeric = Number(speed);
      const safe = Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
      return `${Math.max(0.6, 3 / safe).toFixed(2)}s`;
    }
    function apply() {
      node.classList.add('qmt');
      node.classList.add('qadc-hungry-mule-target');
      node.style.display = 'inline-block';
      node.style.whiteSpace = 'nowrap';
      node.style.textDecoration = 'none';
      node.style.backgroundImage = buildGradient(o.color);
      node.style.backgroundRepeat = 'no-repeat';
      node.style.backgroundPosition = '0 0';
      const shineWidth = `${Math.max(80, Number(o.size) * 2)}px`;
      const shineDuration = speedToDuration(o.speed);
      node.style.backgroundSize = `${shineWidth} 100%`;
      node.style.webkitBackgroundClip = 'text';
      node.style.backgroundClip = 'text';
      node.style.webkitTextFillColor = 'transparent';
      node.style.color = 'transparent';
      node.style.setProperty('--qmd', shineDuration);
      node.style.setProperty('--qadc-shine-duration', shineDuration);
      node.style.setProperty('--qmw', shineWidth);
      node.style.setProperty('--qadc-shine-width', shineWidth);
      node.style.animation = `qms ${shineDuration} linear infinite`;
      node.style.fontWeight = '600';
      if (generated) node.style.fontSize = `${Math.max(14, Number(o.size) / 11)}px`;
    }
    apply();
    return {
      update(nextOpts) {
        Object.assign(o, nextOpts || {});
        apply();
      },
      destroy() {
        node.style.display = original.display;
        node.style.whiteSpace = original.whiteSpace;
        node.style.textDecoration = original.textDecoration;
        node.style.backgroundImage = original.backgroundImage;
        node.style.backgroundRepeat = original.backgroundRepeat;
        node.style.backgroundPosition = original.backgroundPosition;
        node.style.backgroundSize = original.backgroundSize;
        node.style.webkitBackgroundClip = original.webkitBackgroundClip;
        node.style.backgroundClip = original.backgroundClip;
        node.style.webkitTextFillColor = original.webkitTextFillColor;
        node.style.color = original.color;
        node.style.animation = original.animation;
        node.style.fontWeight = original.fontWeight;
        node.style.fontSize = original.fontSize;
        node.className = original.cls;
        node.style.removeProperty('--qmd');
        node.style.removeProperty('--qadc-shine-duration');
        node.style.removeProperty('--qmw');
        node.style.removeProperty('--qadc-shine-width');
        if (generated) node.remove();
      },
    };
  }
  const QADC_FX = {
    version: '0.2.0',
    applyRipple,
    applyBounce,
    applyParticleBurst,
    applyMagnetic,
    applyIdleBreathe,
    applyIdleFloat,
    applyIdlePulseGlow,
    applyIdleShake,
    applyIdleBorderFlow,
    applyIdleBlink,
    applyMagneticParallax,
    applyTiltCard,
    applySpotlight,
    applyGlareHover,
    applySpotlightCard,
    applyBorderGlow,
    applySweepHighlight,
    applyBlueFlameButton,
    applySendFlightButton,
    applyDeleteConfirmButton,
    applyLogoutRevealButton,
    applyBackToTopButton,
    applyDownloadTooltipButton,
    applyBellReminderButton,
    applyArrowSlideButton,
    applyStarBorderButton,
    applySplitText,
    applySplitTextReveal,
    applyScrambleText,
    applyScrambleTextGroup,
    scrambleText,
    applyTextType,
    applyBlurText,
    applyDecryptedText,
    applyRotatingText,
    applyCircularText,
    applyNeonGlow,
    drawPath,
    morphPath,
    applyLiquidBlob,
    applyScrollReveal,
    applyStaggerEntry,
    applySnapScroll,
    applyPullRefresh,
    applyCursorTrail,
    applyCustomCursor,
    applyElasticFollow,
    applyDistortion,
    applyAccordion,
    applyExpandCollapse,
    applyExpandCollapseGroup,
    applyDragSort,
    applyPageSlide,
    applyPageZoom,
    applyPageFade,
    applyPageFlip,
    applyFadeMorph,
    applyToggle,
    animateCounter,
    applyNumberCounter,
    applyGradientFlow,
    applyPathDraw,
    applyGlassmorphism,
    applyGyroscopeTilt,
    applyHungryMule,
  };
  global.QADC_FX = QADC_FX;
  if (typeof module !== 'undefined' && module.exports) module.exports = QADC_FX;
})(typeof globalThis !== 'undefined' ? globalThis : this);
