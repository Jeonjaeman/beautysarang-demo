/* 데모 C · tech3d — 연출 스크립트 (라이브러리 없음)
   본문은 JS 없이도 모두 보인다. 초기 숨김은 이 스크립트가 붙이는 클래스 아래에서만 생긴다. */
(function () {
  "use strict";

  var d = document;
  var root = d.documentElement;
  var body = d.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktopFx = window.matchMedia("(min-width: 1024px) and (hover: hover)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var hasIO = "IntersectionObserver" in window;

  root.classList.remove("no-js");
  root.classList.add("t3-js");
  if (!reduce) root.classList.add("t3-motion");

  function each(sel, fn, scope) {
    Array.prototype.forEach.call((scope || d).querySelectorAll(sel), fn);
  }

  /* ---------- 글자 분해 (단어는 줄바꿈되지 않게 묶는다) ---------- */
  function splitChars(el, start) {
    if (el.classList.contains("t3-split")) return start;
    var n = start || 0;
    var walker = d.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (tn) {
      var frag = d.createDocumentFragment();
      tn.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
        var word = d.createElement("span");
        word.className = "t3-wd";
        Array.from(part).forEach(function (ch) {
          var s = d.createElement("span");
          s.className = "t3-ch";
          s.style.setProperty("--ci", n++);
          s.textContent = ch;
          word.appendChild(s);
        });
        frag.appendChild(word);
      });
      tn.parentNode.replaceChild(frag, tn);
    });
    el.classList.add("t3-split");
    return n;
  }

  /* ---------- 헤더: 스크롤 시 흰 배경 ---------- */
  var header = d.querySelector(".t3-header");
  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  /* ---------- 서브페이지 히어로 워터마크(섹션 영문명) ---------- */
  var WATERMARK = {
    features: "Features", industries: "Industries", pricing: "Pricing", guide: "Guide", compare: "Compare",
    faq: "FAQ", support: "Support", notice: "News", about: "Company", "free-trial": "Start free",
    privacy: "Privacy", terms: "Terms"
  };
  var pageHero = d.querySelector(".page-hero");
  if (pageHero) {
    var base = body.getAttribute("data-base") || "";
    var path = window.location.pathname;
    if (base && path.indexOf(base) === 0) path = path.slice(base.length);
    var label = WATERMARK[path.split("/").filter(Boolean)[0]];
    if (label) pageHero.style.setProperty("--t3-wm", '"' + label + '"');
  }

  /* ---------- 히어로 배경 슬라이드 (6초, fade) ---------- */
  var slides = d.querySelectorAll(".t3-hero__slides img");
  var dots = d.querySelectorAll(".t3-hero__dots i");
  if (slides.length > 1 && !reduce) {
    var current = 0;
    window.setInterval(function () {
      if (d.hidden) return;
      slides[current].classList.remove("is-on");
      if (dots[current]) dots[current].classList.remove("is-on");
      current = (current + 1) % slides.length;
      slides[current].classList.add("is-on");
      if (dots[current]) dots[current].classList.add("is-on");
    }, 6000);
  }

  /* ---------- 기능 8개: hover/focus 로 우측 프리뷰 동기화 ---------- */
  var feat = d.querySelector(".t3-feat");
  if (feat) {
    var items = feat.querySelectorAll(".t3-feat__item");
    var shots = feat.querySelectorAll(".t3-feat__frame img");
    var counter = feat.querySelector(".t3-feat__count b");
    var setActive = function (index) {
      Array.prototype.forEach.call(items, function (it, k) { it.classList.toggle("is-active", k === index); });
      Array.prototype.forEach.call(shots, function (img, k) { img.classList.toggle("is-on", k === index); });
      if (counter) counter.textContent = ("0" + (index + 1)).slice(-2);
    };
    Array.prototype.forEach.call(items, function (it, index) {
      it.addEventListener("mouseenter", function () { setActive(index); });
      it.addEventListener("focusin", function () { setActive(index); });
    });
  }

  /* ---------- 스크롤 등장 + 섹션 진입 ---------- */
  var REVEAL = "[data-reveal], .page-hero ~ .section .card, .feature-list > div, .steps > li, .check-list > li, " +
    ".pain-list > li, .criteria-list > li, .ind-card, .page-hero ~ .section .price-card, .screen-figure, .history > li";

  var pending = []; /* 아직 재생 전인 요소: IO 가 놓쳐도 스크롤로 지나가면 sweepPending 이 마무리 */
  function release(el) {
    if (el.classList.contains("t3-rv")) el.classList.add("in");
    el.classList.remove("t3-wait");
  }
  function sweepPending() {
    if (!pending.length) return;
    var edge = window.innerHeight * 0.95;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < edge) { release(el); return false; }
      return true;
    });
  }

  if (!reduce && hasIO) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    var limit = window.innerHeight * 0.92;
    each(REVEAL, function (el) {
      var rect = el.getBoundingClientRect();
      if (!rect.height || rect.top < limit) return; /* 이미 보이거나 숨겨진 요소는 연출 없이 그대로 */
      var index = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty("--rd", Math.min(index, 6) * 80 + "ms");
      el.classList.add("t3-rv");
      revealIO.observe(el);
      pending.push(el);
    });

    /* 장식 영문 타이틀과 FAQ 제목: 글자 분해 후 진입 시 재생 */
    var titleIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove("t3-wait");
        titleIO.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    each(".t3-display, .faq .section-title", function (el) {
      if (el.classList.contains("t3-split")) return; /* 히어로는 인라인 스크립트가 이미 처리 */
      if (!el.hasAttribute("aria-hidden") && !el.hasAttribute("aria-label")) {
        el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
      }
      splitChars(el, 0);
      el.classList.add("t3-play", "t3-wait");
      titleIO.observe(el);
      pending.push(el);
    });
  }

  if (hasIO) {
    if (!reduce) root.classList.add("t3-io"); /* 섹션 단위 초기 상태(와이프·도트·타일)는 이 클래스 아래에서만 */
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle("is-vis", e.isIntersecting);
        if (e.isIntersecting && e.intersectionRatio >= 0.12) e.target.classList.add("in");
      });
    }, { threshold: [0, 0.12, 0.3] });
    each(".t3-sec", function (sec) { sectionIO.observe(sec); });
  } else {
    each(".t3-sec", function (sec) { sec.classList.add("in", "is-vis"); });
  }

  /* ---------- 패럴랙스: 이유 사진 4장 + 글라스 오브젝트 (데스크톱만) ---------- */
  var layers = [];
  if (!reduce) {
    each(".t3-why__media img", function (img) {
      layers.push({ el: img, sec: img.closest("section"), shift: parseFloat(img.getAttribute("data-shift")) || 0 });
    });
    each(".t3-float", function (img) {
      layers.push({ el: img, sec: img.closest("section"), speed: parseFloat(img.getAttribute("data-speed")) || 0 });
    });
  }
  var parallaxOn = false;
  function updateParallax() {
    if (!layers.length) return;
    if (!desktopFx.matches) {
      if (parallaxOn) layers.forEach(function (l) { l.el.style.transform = ""; });
      parallaxOn = false;
      return;
    }
    parallaxOn = true;
    var vh = window.innerHeight;
    layers.forEach(function (l) {
      var r = l.sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var y;
      if (l.speed !== undefined) {
        y = (r.top + r.height / 2 - vh / 2) * l.speed;
      } else {
        var progress = (vh - r.top) / (vh + r.height); /* 0 → 1 */
        y = (progress - 0.5) * 2 * l.shift;
      }
      l.el.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
    });
  }

  /* ---------- 스크롤 루프 (rAF 1회로 묶음) ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      updateHeader();
      updateParallax();
      sweepPending();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateHeader();
  updateParallax();

  /* ---------- 업데이트 소식: 썸네일이 마우스 X 를 따라감 (expo.out 0.3s 근사 lerp) ---------- */
  if (finePointer.matches && !reduce) {
    each(".t3-news__list li", function (li) {
      var thumb = li.querySelector(".t3-news__img");
      if (!thumb) return;
      var x = 0;
      var target = 0;
      var raf = 0;
      var last = 0;
      var tick = function (t) {
        var dt = last ? Math.min(t - last, 64) : 16;
        last = t;
        x += (target - x) * (1 - Math.exp(-dt / 85));
        thumb.style.translate = x.toFixed(1) + "px -50%";
        if (Math.abs(target - x) > 0.3) {
          raf = window.requestAnimationFrame(tick);
        } else {
          raf = 0;
          last = 0;
        }
      };
      var aim = function (e) {
        var r = li.getBoundingClientRect();
        var w = thumb.offsetWidth;
        target = Math.max(0, Math.min(r.width - w, e.clientX - r.left - w / 2));
      };
      li.addEventListener("mouseenter", function (e) {
        aim(e);
        x = target;
        thumb.style.translate = x.toFixed(1) + "px -50%";
      });
      li.addEventListener("mousemove", function (e) {
        aim(e);
        if (!raf) raf = window.requestAnimationFrame(tick);
      });
    });
  }
})();
