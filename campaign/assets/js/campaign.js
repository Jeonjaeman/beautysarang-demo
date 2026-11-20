/* 뷰티사랑넷 데모 B · 캠페인 — 멜론 6.0 캠페인의 timeline 스크롤 엔진을 라이브러리 없이 재구현.
   - IntersectionObserver(threshold [0, .2, .6, 1]) → [data-scene] 에 is-in / is-out 클래스
   - 진행률이 필요한 곳([data-progress]: 정의문 sticky, 영상 마스크)만 scroll + rAF 로 0~1 계산
   - 실제 움직임은 전부 CSS transition. 초기 오프셋은 html.cp-motion 일 때만 걸리므로
     이 파일이 없거나 '움직임 줄이기'면 본문은 완성 상태 그대로 보인다. */
(function () {
  "use strict";

  var d = document, html = d.documentElement, w = window;
  if (w.__cpT) w.clearTimeout(w.__cpT);

  var HAS_IO = "IntersectionObserver" in w;
  var REDUCE = !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (!HAS_IO || REDUCE) html.classList.remove("cp-motion");
  var MOTION = html.classList.contains("cp-motion");
  var DESK = w.matchMedia("(min-width: 1024px)");
  var BRAND = "뷰티사랑넷";
  var LABEL_PAUSE = "영상 멈춤", LABEL_PLAY = "영상 재생";
  var COUNT_MS = 1000, DONE_MS = 1700;

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(sel)); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function nextFrame(fn) { w.requestAnimationFrame(function () { w.requestAnimationFrame(fn); }); }

  var header = d.querySelector(".site-header");
  var hero = d.querySelector(".cp-hero");

  /* ---------- 서브 페이지 제목: 핵심 단어 퍼플 (쉼표·콜론 뒤 / 브랜드명 / 마지막 단어) ---------- */
  all(".page-hero h1").forEach(function (h) {
    var ws = all(".w", h);
    if (!ws.length) return;
    var cut = -1;
    ws.forEach(function (x, i) { if (cut < 0 && /[,:]$/.test(x.textContent)) cut = i; });
    var keys = cut > -1 && cut < ws.length - 1 ? ws.slice(cut + 1)
      : ws.filter(function (x) { return x.textContent.indexOf(BRAND) === 0; }).slice(0, 1);
    if (!keys.length) keys = ws.slice(-1);
    keys.forEach(function (x) { x.classList.add("is-key"); });
  });

  /* ---------- 이유 섹션 영상: 접근 시 src 주입, 화면 밖이면 멈춤 ---------- */
  (function video() {
    var sec = d.querySelector(".cp-why");
    var v = sec && sec.querySelector(".cp-why__video");
    var btn = sec && sec.querySelector(".cp-why__pause");
    if (!v || REDUCE || !HAS_IO) return;
    var loaded = false, userPaused = false;
    function play() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          if (!loaded) {
            loaded = true;
            v.src = v.getAttribute("data-src");
            if (btn) btn.hidden = false;
          }
          if (!userPaused) play();
        } else if (loaded) {
          v.pause();
        }
      });
    }, { rootMargin: "200px 0px" }).observe(sec);
    if (btn) btn.addEventListener("click", function () {
      userPaused = !userPaused;
      if (userPaused) v.pause(); else play();
      btn.setAttribute("aria-pressed", String(userPaused));
      btn.textContent = userPaused ? LABEL_PLAY : LABEL_PAUSE;
    });
  })();

  /* ---------- 스크롤: 헤더·화살표·진행률 장면 (rAF 1회/프레임) ---------- */
  var progress = [];
  var ticking = false;
  function frame() {
    ticking = false;
    var y = w.pageYOffset, vh = w.innerHeight;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (hero) hero.classList.toggle("is-scrolled", y > 24);
    progress.forEach(function (o) { if (o.active) o.fn(o.el, o.el.getBoundingClientRect(), vh); });
  }
  function onScroll() { if (!ticking) { ticking = true; w.requestAnimationFrame(frame); } }
  w.addEventListener("scroll", onScroll, { passive: true });
  frame();

  if (!MOTION) return;

  /* ---------- 히어로·서브 히어로: 로드 후 순차 등장 ---------- */
  nextFrame(function () {
    if (hero) hero.classList.add("ready");
    all(".page-hero").forEach(function (el) { el.classList.add("ready"); });
  });

  /* ---------- 장면 엔진: is-in(1회) / is-out(화면 위로 벗어남) ---------- */
  function onIn(el) {
    if (el.classList.contains("trust-stats")) countUp(el);
    if (el.classList.contains("cp-cards") || el.classList.contains("cp-fan")) {
      w.setTimeout(function () { el.classList.add("is-done"); }, DONE_MS);
    }
  }
  var sceneIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var el = e.target;
      var need = parseFloat(el.getAttribute("data-in")) || 0.2;
      var big = e.boundingClientRect.height > w.innerHeight;
      var seen = e.isIntersecting && (e.intersectionRatio >= need || (big && e.intersectionRect.height > w.innerHeight * need));
      if (seen && !el.classList.contains("is-in")) { el.classList.add("is-in"); onIn(el); }
      el.classList.toggle("is-out", !e.isIntersecting && e.boundingClientRect.top < 0);
    });
  }, { threshold: [0, 0.2, 0.6, 1] });
  all("[data-scene], .cta-band, .page-home .faq").forEach(function (el) { sceneIO.observe(el); });

  /* ---------- 진행률 장면 ---------- */
  function ratio(r, vh) { var span = r.height - vh; return span > 0 ? clamp01(-r.top / span) : 0; }
  var handlers = {
    // 정의문: 스테이지가 들어오면 등장, 다음 섹션이 올라오기 전(.82) 0.25s 페이드아웃
    def: function (el, r, vh) {
      el.classList.toggle("is-on", r.top < vh * 0.55);
      el.classList.toggle("is-out", ratio(r, vh) > 0.82);
    },
    // 이유: .35에서 전체 화면 영상 → 폰 프레임 축소, .38~.545 사이 4항목 순차 등장
    why: function (el, r, vh) {
      var items = el._items || (el._items = all(".reason-list > div", el));
      var on = DESK.matches;
      if (on && !el._measured) { measureWhy(el); el._measured = true; }
      var p = on ? ratio(r, vh) : 0;
      el.classList.toggle("is-shrunk", on && p >= 0.35);
      items.forEach(function (it, i) { it.classList.toggle("is-on", on && p >= 0.38 + i * 0.055); });
    }
  };
  var progIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      progress.forEach(function (o) { if (o.el === e.target) o.active = e.isIntersecting; });
    });
    onScroll();
  }, { rootMargin: "100px 0px" });
  all("[data-progress]").forEach(function (el) {
    var fn = handlers[el.getAttribute("data-progress")];
    if (!fn) return;
    progress.push({ el: el, fn: fn, active: false });
    progIO.observe(el);
  });

  /* 영상 마스크의 도착점: 폰 화면 자리(.cp-why__screen)를 스테이지 기준 좌표로. 활성화·리사이즈 때 다시 잰다 */
  function measureWhy(sec) {
    var st = sec.querySelector(".cp-why__stage").getBoundingClientRect();
    var sc = sec.querySelector(".cp-why__screen").getBoundingClientRect();
    sec.style.setProperty("--fx", (sc.left - st.left).toFixed(1) + "px");
    sec.style.setProperty("--fy", (sc.top - st.top).toFixed(1) + "px");
    sec.style.setProperty("--fw", sc.width.toFixed(1) + "px");
    sec.style.setProperty("--fh", sc.height.toFixed(1) + "px");
  }
  function remeasure() {
    progress.forEach(function (o) { o.el._measured = false; });
    onScroll();
  }
  var resizeT;
  w.addEventListener("resize", function () { w.clearTimeout(resizeT); resizeT = w.setTimeout(remeasure, 120); });
  w.addEventListener("load", remeasure);

  /* ---------- 신뢰 수치: 2001은 1980부터 1초 카운트업 (3·0은 CSS 팝) ---------- */
  function countUp(scope) {
    all("[data-from]", scope).forEach(function (s) {
      var to = parseInt(s.textContent, 10), from = parseInt(s.getAttribute("data-from"), 10);
      if (isNaN(to) || isNaN(from)) return;
      var t0 = null;
      s.textContent = from;
      function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / COUNT_MS);
        s.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) w.requestAnimationFrame(step);
      }
      w.requestAnimationFrame(step);
    });
  }

  /* ---------- 업데이트 소식 마퀴: 복제본 2개(aria-hidden, 포커스 제외) ---------- */
  all("[data-marquee]").forEach(function (mq) {
    var track = mq.querySelector(".cp-marquee__track");
    var list = track && track.querySelector("ul");
    if (!list) return;
    for (var i = 0; i < 2; i++) {
      var c = list.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      all("a", c).forEach(function (a) { a.setAttribute("tabindex", "-1"); });
      track.appendChild(c);
    }
    mq.classList.add("is-running");
    new IntersectionObserver(function (es) {
      mq.classList.toggle("is-paused", !es[0].isIntersecting);
    }).observe(mq);
  });
})();
