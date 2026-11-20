// 뷰티사랑넷 연출 레이어 — 본문은 이 파일 없이도 모두 보인다. (GEO/VISUAL-DIRECTION.md)
(function () {
  "use strict";
  if (!("IntersectionObserver" in window)) return;

  var doc = document;
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
  var REVEAL = ".section-head, .card, .industry-grid > li, .price-card, .feature-list > div, .steps > li, " +
    ".board-list > li, .faq-item, .table-wrap, .trust-stats > li, .check-list > li";
  var STAGGER_MS = 70, STAGGER_MAX = 6, REVEAL_CLEANUP_MS = 1400, COUNT_MS = 1000;

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  // 반복 애니메이션은 화면에 보일 때만 돌린다
  var loopIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle("is-inview", e.isIntersecting); });
  }, { threshold: 0.15 });
  all(".home-hero, .card--wide, .cta-band").forEach(function (el) { loopIO.observe(el); });

  if (REDUCE) return;

  // 등장: 처음 화면 아래에 있는 요소만 살짝 내려 두었다가 올린다
  (function reveal() {
    var vh = window.innerHeight;
    var below = all(REVEAL).filter(function (el) { return el.getBoundingClientRect().top > vh * 0.95; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        el.classList.add("is-in");
        window.setTimeout(function () {
          el.classList.remove("rv", "is-in");
          el.style.removeProperty("--d");
        }, REVEAL_CLEANUP_MS);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    below.forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentElement.children, el);
      el.style.setProperty("--d", Math.min(i, STAGGER_MAX) * STAGGER_MS + "ms");
      el.classList.add("rv");
      io.observe(el);
    });
  })();

  // 숫자 카운트업: HTML에는 최종값이 들어 있고, 보일 때 표시만 올린다
  all("[data-count]").forEach(function (el) {
    var text = el.textContent;
    var end = parseInt(text.replace(/\D/g, ""), 10);
    if (isNaN(end)) return;
    var from = parseInt(el.getAttribute("data-from") || "0", 10);
    el.setAttribute("aria-label", text);
    var grouped = text.indexOf(",") > -1;
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      (function tick(now) {
        var p = Math.min(1, (now - t0) / COUNT_MS);
        var v = Math.round(from + (end - from) * (1 - Math.pow(1 - p, 3)));
        el.textContent = grouped ? v.toLocaleString("ko-KR") : String(v);
        if (p < 1) window.requestAnimationFrame(tick); else el.textContent = text;
      })(t0);
    }, { threshold: 0.6 });
    io.observe(el);
  });

  // 히어로 영상: 넓은 화면에서만, 사진이 먼저 보인 뒤에 불러온다
  (function heroVideo() {
    var v = doc.querySelector(".hero-video[data-src]");
    var conn = navigator.connection;
    if (!v || window.innerWidth < 861 || (conn && conn.saveData)) return;
    var hero = v.closest(".home-hero"), btn = doc.querySelector(".hero-pause"), userPaused = false;
    function sync() { if (!userPaused && hero && hero.classList.contains("is-inview")) v.play(); else v.pause(); }
    window.addEventListener("load", function () {
      v.addEventListener("playing", function () {
        v.classList.add("is-playing");
        if (btn) btn.classList.add("is-on");
      }, { once: true });
      v.src = v.getAttribute("data-src");
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* 자동 재생이 막히면 사진 그대로 둔다 */ });
      if (hero) new IntersectionObserver(sync, { threshold: 0.1 }).observe(hero);
      if (btn) btn.addEventListener("click", function () {
        userPaused = !userPaused;
        btn.textContent = userPaused ? "영상 재생" : "영상 멈춤";
        btn.setAttribute("aria-pressed", String(userPaused));
        sync();
      });
    });
  })();

  if (!FINE) return;

  // 이유 섹션: 항목이 화면 가운데를 지날 때 사진을 바꾼다
  all("[data-story]").forEach(function (story) {
    var items = all(".reason-list > div", story);
    var imgs = all(".why__media img", story);
    if (!items.length || items.length !== imgs.length) return;
    function activate(i) {
      items.forEach(function (it, k) { it.classList.toggle("is-active", k === i); });
      imgs.forEach(function (im, k) { im.classList.toggle("is-active", k === i); });
    }
    story.classList.add("story-on");
    activate(0);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) activate(items.indexOf(e.target)); });
    }, { rootMargin: "-46% 0px -46% 0px" });
    items.forEach(function (it) { io.observe(it); });
  });

  // 카드 기울임 + 포인터 위치(빛)
  all(".industry-grid a, .price-card").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", x * 100 + "%");
      el.style.setProperty("--my", y * 100 + "%");
      el.style.setProperty("--ry", (x - 0.5) * 7 + "deg");
      el.style.setProperty("--rx", (0.5 - y) * 7 + "deg");
    });
    el.addEventListener("pointerleave", function () {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });

  // 마그네틱 버튼
  all(".cta-band .btn--accent, .home-hero .btn--accent").forEach(function (btn) {
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      btn.style.setProperty("--tx", (e.clientX - r.left - r.width / 2) * 0.22 + "px");
      btn.style.setProperty("--ty", (e.clientY - r.top - r.height / 2) * 0.32 + "px");
    });
    btn.addEventListener("pointerleave", function () {
      btn.style.setProperty("--tx", "0px");
      btn.style.setProperty("--ty", "0px");
    });
  });

  // 히어로 화면 조각 패럴랙스
  (function heroParallax() {
    var hero = doc.querySelector(".home-hero"), stage = doc.querySelector(".hero-stage");
    if (!hero || !stage) return;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      stage.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      stage.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    hero.addEventListener("pointerleave", function () {
      stage.style.setProperty("--px", "0");
      stage.style.setProperty("--py", "0");
    });
  })();
})();
