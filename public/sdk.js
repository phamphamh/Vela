/*!
 * Lead tracking SDK — drop-in, dependency-free.
 *
 * Install on the customer's site:
 *   <script src="https://YOUR_APP/sdk.js" data-key="lead_pk_..." defer></script>
 *
 * Auto-captures pageviews (incl. SPA route changes) and clicks on links/buttons,
 * and exposes a global `lead()` for explicit events:
 *   lead('conversion', 'signup', { plan: 'pro' })   // a goal was reached
 *   lead('track', 'cta_hero')                        // a custom click/event
 *   lead('exposure', experimentId, variantId)        // visitor saw a variant
 * Markup helpers (no JS needed):
 *   <button data-lead-event="hero_cta">…            // names the click
 *   <a data-lead-conversion>Buy</a>                  // counts as a conversion
 *   <div data-lead-exp="EXP" data-lead-variant="B">  // clicks inside emit EXPOSURE
 * Events batch and flush via sendBeacon on hide/unload — no perf impact.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var origin = new URL(script.src).origin;
  var KEY =
    script.getAttribute("data-key") ||
    new URL(script.src).searchParams.get("key") ||
    window.LEAD_KEY;
  if (!KEY) {
    console.warn("[lead] missing SDK key — set data-key on the script tag.");
    return;
  }
  var ENDPOINT = origin + "/api/ingest";
  var ENDPOINT_EXP = origin + "/api/experiments/active";

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // First-party, persistent visitor id (anonymous — no PII). Per-load session id.
  var VKEY = "_lead_vid";
  var vid;
  try {
    vid = localStorage.getItem(VKEY);
    if (!vid) {
      vid = uid();
      localStorage.setItem(VKEY, vid);
    }
  } catch {
    vid = uid();
  }
  var sid = uid();

  var queue = [];
  function flush(useBeacon) {
    if (!queue.length) return;
    var batch = queue.splice(0, queue.length);
    var payload = JSON.stringify({
      sdkKey: KEY,
      visitorId: vid,
      sessionId: sid,
      events: batch,
    });
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          ENDPOINT,
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
          mode: "cors",
        }).catch(function () {});
      }
    } catch {
      /* never let tracking throw into the host page */
    }
  }

  function enqueue(type, props) {
    var ev = {
      type: type,
      ts: Date.now(),
      path: location.pathname + location.search,
      ref: document.referrer || null,
    };
    if (props) for (var k in props) ev[k] = props[k];
    queue.push(ev);
    if (queue.length >= 12) flush(false);
  }

  /* --- A/B experiments ------------------------------------------------- */
  // Active experiments are fetched from the flag endpoint; the visitor is
  // bucketed deterministically per experiment, the treatment copy is swapped in
  // for the B cohort, and conversions are attributed to the assigned variant.

  var EXPERIMENTS = []; // [{ id, split, a: controlVariantId, b: treatmentVariantId }]
  var AKEY = "_lead_assign"; // sessionStorage: { experimentId: variantId } once exposed

  // Stable 0–99 bucket from a string (FNV-1a) — same visitor always lands the
  // same way for a given experiment, with no server round-trip.
  function bucket(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h % 100;
  }

  function readAssigns() {
    try {
      return JSON.parse(sessionStorage.getItem(AKEY) || "{}") || {};
    } catch {
      return {};
    }
  }
  function writeAssigns(m) {
    try {
      sessionStorage.setItem(AKEY, JSON.stringify(m));
    } catch {
      /* private mode — attribution degrades to this page only */
    }
  }

  // Apply every active experiment present on the current DOM: bucket, record the
  // exposure once, and swap in the treatment copy for the B cohort.
  function applyExperiments() {
    if (!EXPERIMENTS.length) return;
    var assigns = readAssigns();
    for (var i = 0; i < EXPERIMENTS.length; i++) {
      var exp = EXPERIMENTS[i];
      var el = document.querySelector('[data-lead-exp="' + exp.id + '"]');
      if (!el) continue; // not on this page → don't count an impression here
      var isB = bucket(vid + ":" + exp.id) < exp.split;
      var variantId = isB ? exp.b : exp.a;
      if (!(exp.id in assigns)) {
        assigns[exp.id] = variantId;
        writeAssigns(assigns);
        enqueue("EXPOSURE", { experimentId: exp.id, variantId: variantId });
      }
      if (isB) {
        var copy = el.getAttribute("data-lead-b");
        if (copy != null && el.textContent !== copy) el.textContent = copy;
      }
    }
  }

  // A conversion, attributed to every variant the visitor was actually exposed
  // to this session. With no exposures it's a plain project-level conversion.
  function convert(name, meta) {
    var assigns = readAssigns();
    var ids = Object.keys(assigns);
    if (!ids.length) {
      enqueue("CONVERSION", { name: name || "conversion", meta: meta || null });
      return;
    }
    for (var i = 0; i < ids.length; i++) {
      enqueue("CONVERSION", {
        name: name || "conversion",
        meta: meta || null,
        experimentId: ids[i],
        variantId: assigns[ids[i]],
      });
    }
  }

  // Public API. Mirrors the snippet stub: lead('cmd', ...args).
  function lead() {
    var a = Array.prototype.slice.call(arguments);
    switch (a[0]) {
      case "pageview":
        return enqueue("PAGEVIEW", {});
      case "track":
        return enqueue("CLICK", { name: a[1], meta: a[2] || null });
      case "conversion":
        return convert(a[1], a[2] || null);
      case "exposure":
        return enqueue("EXPOSURE", { experimentId: a[1], variantId: a[2] });
      default:
        return undefined;
    }
  }
  // Drain anything queued before the SDK loaded (async snippet pattern).
  var pre = window.lead && window.lead.q ? window.lead.q : [];
  window.lead = lead;
  for (var i = 0; i < pre.length; i++) lead.apply(null, pre[i]);

  // Auto pageview, including client-side route changes.
  enqueue("PAGEVIEW", {});
  var _push = history.pushState;
  history.pushState = function () {
    _push.apply(this, arguments);
    enqueue("PAGEVIEW", {});
    // New route may render an experiment element — re-apply shortly after.
    setTimeout(applyExperiments, 60);
  };
  window.addEventListener("popstate", function () {
    enqueue("PAGEVIEW", {});
    setTimeout(applyExperiments, 60);
  });

  // Fetch active experiments (the flag), then apply. Re-apply on a couple of
  // short delays to catch elements rendered after client-side hydration.
  try {
    fetch(ENDPOINT_EXP + "?key=" + encodeURIComponent(KEY), {
      mode: "cors",
      credentials: "omit",
    })
      .then(function (r) {
        return r.ok ? r.json() : { experiments: [] };
      })
      .then(function (cfg) {
        EXPERIMENTS = (cfg && cfg.experiments) || [];
        applyExperiments();
        setTimeout(applyExperiments, 400);
        setTimeout(applyExperiments, 1500);
      })
      .catch(function () {});
  } catch {
    /* never let tracking throw into the host page */
  }

  // Auto click capture: links, buttons, and anything tagged with data-lead-*.
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var el = t.closest("a,button,[role=button],[data-lead-event]");
      if (!el) return;
      var label =
        el.getAttribute("data-lead-event") ||
        el.getAttribute("aria-label") ||
        (el.textContent || "").trim().slice(0, 80) ||
        "click";
      if (el.hasAttribute("data-lead-conversion")) {
        convert(label);
      } else {
        enqueue("CLICK", { name: label });
      }
      // If the click is inside a variant container, record the exposure too.
      var ex = el.closest("[data-lead-exp]");
      if (ex) {
        enqueue("EXPOSURE", {
          experimentId: ex.getAttribute("data-lead-exp"),
          variantId: ex.getAttribute("data-lead-variant"),
        });
      }
    },
    true,
  );

  // Flush periodically and reliably on the way out.
  setInterval(function () {
    flush(false);
  }, 5000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", function () {
    flush(true);
  });
})();
