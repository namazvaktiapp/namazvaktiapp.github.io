// Namaz Vakitleri web sitesi: dil seçimi ve sayfa kaydırıldıkça günü yaşayan gökyüzü.
(function () {
  "use strict";

  var LANGS = ["tr", "en", "de", "fr", "ar"];
  var BADGE = { tr: "tr-tr", en: "en-us", de: "de-de", fr: "fr-fr", ar: "ar-sa" };

  // ---------- Dil ----------
  function pickLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.indexOf(q) >= 0) return q;
    try { var saved = localStorage.getItem("nv.lang"); if (saved && LANGS.indexOf(saved) >= 0) return saved; } catch (e) {}
    var nav = (navigator.languages || [navigator.language || "en"]);
    for (var i = 0; i < nav.length; i++) {
      var code = String(nav[i]).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(code) >= 0) return code;
    }
    return "en";
  }

  function applyLang(lang) {
    var dict = (window.NV_I18N || {})[lang];
    if (!dict) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n")];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-html")];
      if (v != null) el.innerHTML = v;   // yalnızca kendi i18n.js metinlerimiz
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-alt")];
      if (v != null) el.alt = v;
    });
    document.querySelectorAll("[data-shot]").forEach(function (el) {
      el.src = el.getAttribute("data-base") + "assets/img/" + lang + "/" + el.getAttribute("data-shot");
    });
    document.querySelectorAll("img.store-badge").forEach(function (el) {
      el.src = "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/" + BADGE[lang] + "?size=250x83";
    });
    document.querySelectorAll("a[data-lang-link]").forEach(function (el) {
      el.href = el.getAttribute("data-lang-link") + "?lang=" + lang;
    });
    if (dict["meta.title." + document.body.dataset.page]) document.title = dict["meta.title." + document.body.dataset.page];
    document.querySelectorAll("select.lang").forEach(function (s) { s.value = lang; });
  }

  function setupLang() {
    var lang = pickLang();
    applyLang(lang);
    document.querySelectorAll("select.lang").forEach(function (s) {
      s.addEventListener("change", function () {
        try { localStorage.setItem("nv.lang", s.value); } catch (e) {}
        var url = new URL(location.href);
        url.searchParams.set("lang", s.value);
        history.replaceState(null, "", url);
        applyLang(s.value);
        updateSky();
      });
    });
  }

  // ---------- Gökyüzü (uygulamadaki NurSky durakları, günün sırasıyla) ----------
  var STOPS = [
    ["#1C1F4E", "#433B70"], // 0 imsak
    ["#7B82B9", "#F4B9A2"], // 1 güneş doğuyor
    ["#A4C2E6", "#FBE1CC"], // 2 sabah
    ["#7BB3E8", "#DDEDF9"], // 3 öğle
    ["#8DB8E0", "#F3E5C3"], // 4 ikindi
    ["#C2AE86", "#F6CD8A"], // 5 ikindi sonu
    ["#8C6FA6", "#F1A07E"], // 6 akşam
    ["#46387A", "#C47A92"], // 7 akşam sonrası
    ["#1A1C4A", "#352F62"], // 8 yatsı
    ["#08102B", "#18214A"]  // 9 gece
  ];

  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }); }
  function css(c) { return "rgb(" + c.join(",") + ")"; }
  function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

  function skyAt(pos) {
    pos = Math.max(0, Math.min(STOPS.length - 1, pos));
    var i = Math.floor(pos), t = pos - i, j = Math.min(i + 1, STOPS.length - 1);
    return [mix(hex(STOPS[i][0]), hex(STOPS[j][0]), t), mix(hex(STOPS[i][1]), hex(STOPS[j][1]), t)];
  }

  var marks = [];
  function collect() {
    marks = Array.prototype.map.call(document.querySelectorAll("[data-sky]"), function (el) {
      return { el: el, sky: parseFloat(el.getAttribute("data-sky")) };
    });
  }

  var root = document.documentElement.style;
  function updateSky() {
    if (!marks.length) return;
    // Ekranın ortası hangi iki bölümün merkezleri arasındaysa gökyüzü o iki vakit arasında
    var mid = window.innerHeight * 0.5;
    var centers = marks.map(function (m) { var r = m.el.getBoundingClientRect(); return r.top + r.height / 2; });
    var pos = marks[0].sky;
    if (mid >= centers[centers.length - 1]) pos = marks[marks.length - 1].sky;
    else for (var k = 0; k + 1 < marks.length; k++) {
      if (mid >= centers[k] && mid < centers[k + 1]) {
        pos = marks[k].sky + (marks[k + 1].sky - marks[k].sky) * (mid - centers[k]) / (centers[k + 1] - centers[k]);
        break;
      }
    }
    var s = skyAt(pos), L = (lum(s[0]) * 0.6 + lum(s[1]) * 0.4);
    root.setProperty("--sky-top", css(s[0]));
    root.setProperty("--sky-bottom", css(s[1]));
    // Açık gökyüzünde lacivert, koyuda krem yazı (uygulamadaki sky.onSky gibi)
    var light = L > 0.62;
    root.setProperty("--ink", light ? "#1a2342" : "#f6eedf");
    root.setProperty("--ink-soft", light ? "rgba(26,35,66,0.78)" : "rgba(246,238,223,0.8)");
    root.setProperty("--accent", L > 0.5 ? "#9a6b1c" : "#e3b85c");   // açık gökte koyu altın
    root.setProperty("--stars", String(Math.max(0, Math.min(1, (0.55 - L) / 0.3))));
  }

  // ---------- Yıldızlar ----------
  function drawStars() {
    var c = document.querySelector("canvas.stars");
    if (!c) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
    c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px";
    var ctx = c.getContext("2d"), seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var n = Math.round(w * h / 9000);
    for (var i = 0; i < n; i++) {
      var r = (rnd() < 0.85 ? 0.8 : 1.5) * dpr;
      ctx.globalAlpha = 0.35 + rnd() * 0.6;
      ctx.fillStyle = "#fffaeb";
      ctx.beginPath(); ctx.arc(rnd() * c.width, rnd() * c.height * 0.9, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; updateSky(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupLang();
    collect();
    drawStars();
    updateSky();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { drawStars(); updateSky(); });
  });
})();
