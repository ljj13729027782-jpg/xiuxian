(function () {
  'use strict';

  var PAGE_APIS = new Set(['applyPageSlide', 'applyPageZoom', 'applyPageFade', 'applyPageFlip']);

  function normalizedText(el) {
    return String(el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  }

  function findByAnchor(anchor) {
    if (!anchor || !anchor.tagName) return null;
    var nodes = document.querySelectorAll(String(anchor.tagName).toLowerCase());
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      if (anchor.innerText && normalizedText(el) !== anchor.innerText) continue;
      if (anchor.classList && !anchor.classList.every(function (name) { return el.classList.contains(name); })) continue;
      if (anchor.href && el.getAttribute('href') !== anchor.href) continue;
      if (anchor.altText && el.getAttribute('alt') !== anchor.altText) continue;
      if (anchor.role && el.getAttribute('role') !== anchor.role) continue;
      return el;
    }
    return null;
  }

  function locate(item) {
    var el = null;
    try { el = document.querySelector(item.selector); } catch (_) {}
    return el || findByAnchor(item.anchor);
  }

  function destroyAll() {
    (window.QADC_FX_HANDLES || []).forEach(function (handle) {
      try { if (handle && typeof handle.destroy === 'function') handle.destroy(); } catch (error) {
        console.warn('[QADC_FX] cleanup failed', error);
      }
    });
    window.QADC_FX_HANDLES = [];
  }

  function mount() {
    destroyAll();
    if (!window.QADC_FX || !Array.isArray(window.QADC_FX_CONFIG)) {
      console.error('[QADC_FX] runtime or configuration is missing');
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.info('[QADC_FX] reduced motion requested; effects skipped');
      return;
    }

    window.QADC_FX_CONFIG.forEach(function (item) {
      var el = locate(item);
      if (!el) {
        console.warn('[QADC_FX] target not found:', item.id, item.selector);
        return;
      }
      (item.effects || []).forEach(function (effect) {
        var api = window.QADC_FX[effect.type];
        if (typeof api !== 'function') {
          console.warn('[QADC_FX] unknown API:', effect.type);
          return;
        }
        var params = Object.assign({}, effect.params || {});
        var target = el;
        if (params.targetsSelector) {
          target = Array.from(el.querySelectorAll(params.targetsSelector));
          delete params.targetsSelector;
        }
        if (PAGE_APIS.has(effect.type)) {
          target = Array.from(el.querySelectorAll(params.pageSelector));
          delete params.pageSelector;
        }
        try {
          var handle = api(target, params);
          if (handle) window.QADC_FX_HANDLES.push(handle);
        } catch (error) {
          console.error('[QADC_FX] failed:', item.id, effect.type, error);
        }
      });
    });
  }

  window.QADC_FX_REMOUNT = mount;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  window.addEventListener('pagehide', destroyAll, { once: true });
})();
