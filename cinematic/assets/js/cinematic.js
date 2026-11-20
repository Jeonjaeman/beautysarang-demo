// 데모 A · 시네마틱 — 라이브러리 없는 연출 레이어.
// 원칙: 본문은 JS 없이도 모두 보인다. 이 파일은 클래스를 붙여 연출을 "켜기"만 한다.
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var narrow = window.matchMedia("(max-width: 860px)");
  var coarse = window.matchMedia("(hover: none)");

  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function onChange(mq, fn) { if (mq.addEventListener) mq.addEventListener("change", fn); else if (mq.addListener) mq.addListener(fn); }
  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  root.classList.remove("no-js");
  root.classList.add("js");

  // ---------- 헤더: 스크롤하면 얇은 선 + 그림자 ----------
  function initHeader() {
    var header = doc.querySelector(".site-header");
    if (!header) return;
    var on = false;
    function check() {
      var next = window.scrollY > 8;
      if (next !== on) { on = next; header.classList.toggle("is-scrolled", on); }
    }
    window.addEventListener("scroll", check, { passive: true });
    check();
  }

  // ---------- ① 히어로 영상: load 이후 src 주입, 진행 바, 일시정지 ----------
  function initHero() {
    var hero = doc.querySelector(".cine-hero");
    var video = hero && hero.querySelector(".cine-hero__video");
    if (!video || !video.getAttribute("data-src")) return;
    var conn = navigator.connection;
    if (reduce.matches || narrow.matches || (conn && conn.saveData)) return;

    var bar = hero.querySelector(".cine-hero__bar i");
    var btn = hero.querySelector(".cine-hero__pause");
    var userPaused = false;
    var inView = true;
    var failed = false;
    var raf = 0;

    function tick() {
      raf = 0;
      if (bar && video.duration) bar.style.transform = "scaleX(" + (video.currentTime / video.duration).toFixed(4) + ")";
      if (!video.paused) raf = requestAnimationFrame(tick);
    }
    function fail() {
      if (failed) return;
      failed = true;
      hero.classList.remove("is-video");
      video.classList.remove("is-playing");
      video.pause();
      if (btn) btn.hidden = true;
    }
    function sync() {
      if (failed) return;
      if (!userPaused && inView) {
        var p = video.play();
        if (p && p.catch) p.catch(fail);
      } else {
        video.pause();
      }
    }

    video.addEventListener("playing", function () {
      video.classList.add("is-playing");
      hero.classList.add("is-video");
      if (btn) btn.hidden = false;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    video.addEventListener("error", fail);

    if (btn) {
      btn.addEventListener("click", function () {
        userPaused = !userPaused;
        btn.setAttribute("aria-pressed", String(userPaused));
        btn.textContent = userPaused ? "영상 재생" : "영상 멈춤";
        sync();
      });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        sync();
      }).observe(hero);
    }
    onChange(reduce, function () { if (reduce.matches) { userPaused = true; sync(); } });

    video.src = video.getAttribute("data-src");
    sync();
  }

  // ---------- ③ 기능 8카드 → 텍스트 탭 (ARIA tabs) ----------
  function initTabs() {
    var list = doc.querySelector("[data-feat]");
    if (!list) return;
    var items = all(".feat__item", list);
    if (items.length < 2) return;

    var tablist = doc.createElement("div");
    tablist.className = "feat-tabs";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "기능 선택");

    var tabs = items.map(function (li, i) {
      var h = li.querySelector("h3");
      var tab = doc.createElement("button");
      tab.type = "button";
      tab.className = "feat-tab";
      tab.id = "feat-tab-" + i;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "feat-panel-" + i);
      tab.textContent = h ? h.textContent.trim() : String(i + 1);
      li.id = "feat-panel-" + i;
      li.setAttribute("role", "tabpanel");
      li.setAttribute("aria-labelledby", tab.id);
      tab.addEventListener("click", function () { select(i, false); });
      tablist.appendChild(tab);
      return tab;
    });

    function keepVisible(tab) {
      if (tablist.scrollWidth <= tablist.clientWidth) return;
      var left = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
      tablist.scrollTo({ left: left, behavior: reduce.matches ? "auto" : "smooth" });
    }
    function select(i, focus) {
      tabs.forEach(function (tab, k) {
        var on = k === i;
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        items[k].classList.toggle("is-active", on);
        items[k].inert = !on;
        if (on) items[k].removeAttribute("aria-hidden"); else items[k].setAttribute("aria-hidden", "true");
      });
      if (focus) tabs[i].focus();
      keepVisible(tabs[i]);
    }

    tablist.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(doc.activeElement);
      if (i < 0) return;
      var n = null;
      if (e.key === "ArrowRight") n = i + 1;
      else if (e.key === "ArrowLeft") n = i - 1;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      select((n + tabs.length) % tabs.length, true);
    });

    list.parentNode.insertBefore(tablist, list);
    list.classList.add("is-tabs");
    select(0, false);
  }

  // ---------- ④ 업종: hover / focus / 탭으로 사진 교체 + 설명 펼침 ----------
  function initIndustries() {
    var box = doc.querySelector("[data-ind]");
    if (!box) return;
    var lis = all(".ind__list > li", box);
    var imgs = all(".ind__media img", box);
    var current = 0;

    function set(i) {
      current = i;
      lis.forEach(function (li, k) { li.classList.toggle("is-active", k === i); });
      imgs.forEach(function (im, k) { im.classList.toggle("is-active", k === i); });
    }
    lis.forEach(function (li, i) {
      li.addEventListener("mouseenter", function () { set(i); });
      li.addEventListener("focusin", function () { set(i); });
      var a = li.querySelector("a");
      // 터치 화면(넓은 폭)에서는 첫 탭은 펼치기, 두 번째 탭에서 이동
      if (a) a.addEventListener("click", function (e) {
        if (coarse.matches && !narrow.matches && current !== i) { e.preventDefault(); set(i); }
      });
    });
    box.classList.add("is-ready");
  }

  // ---------- ⑤ 이유: 스크롤 진행률 → 캔버스 프레임 시퀀스 + 항목 활성 ----------
  function initSequence() {
    var sec = doc.querySelector("[data-seq]");
    if (!sec) return;
    var track = sec.querySelector(".cine-why__track");
    var stage = sec.querySelector(".cine-why__stage");
    var bgBox = sec.querySelector(".cine-why__bg");
    var items = all(".reason-list > div", sec);
    var bar = sec.querySelector(".cine-why__progress i");
    if (!track || !stage || !bgBox) return;

    var COUNT = 60;
    var dir = bgBox.getAttribute("data-src") || "";
    var frames = [];
    var started = false;
    var canvas = null;
    var ctx = null;
    var enabled = false;
    var listening = false;
    var raf = 0;
    var stickTop = 0;
    var lastFrame = -1;
    var lastDrawn = null;
    var lastItem = -1;
    var canDraw = !!(doc.createElement("canvas").getContext);

    function frameUrl(n) { return dir + ("000" + n).slice(-4) + ".webp"; }
    function progress() {
      var r = track.getBoundingClientRect();
      var span = r.height - stage.offsetHeight;
      return span > 0 ? clamp01((stickTop - r.top) / span) : 0;
    }
    function nearest(idx) {
      if (frames[idx]) return frames[idx];
      for (var d = 1; d < COUNT; d++) {
        if (frames[idx - d]) return frames[idx - d];
        if (frames[idx + d]) return frames[idx + d];
      }
      return null;
    }
    function draw(idx) {
      if (!ctx) return;
      var im = nearest(idx);
      if (!im || im === lastDrawn) return;
      ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
      lastDrawn = im;
      if (!canvas.classList.contains("is-ready")) canvas.classList.add("is-ready");
    }
    function load(n, next) {
      var im = new Image();
      im.decoding = "async";
      im.onload = function () {
        frames[n - 1] = im;
        if (enabled) draw(lastFrame < 0 ? 0 : lastFrame);
        if (next) next();
      };
      im.onerror = function () { /* 누락 프레임은 건너뛴다: 포스터가 그대로 보인다 */ };
      im.src = frameUrl(n);
    }
    function preload() {
      if (started || !dir) return;
      started = true;
      // 첫 프레임이 있으면 나머지를 받는다(없으면 요청 1건으로 끝)
      load(1, function () { for (var n = 2; n <= COUNT; n++) load(n); });
    }
    function update() {
      raf = 0;
      if (!enabled) return;
      var p = progress();
      if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      var k = Math.min(items.length - 1, Math.floor(p * items.length));
      if (k !== lastItem) {
        lastItem = k;
        items.forEach(function (it, j) { it.classList.toggle("is-active", j === k); });
      }
      var f = Math.round(p * (COUNT - 1));
      if (f !== lastFrame) { lastFrame = f; draw(f); }
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
    function listen(on) {
      if (on === listening) return;
      listening = on;
      if (on) window.addEventListener("scroll", onScroll, { passive: true });
      else window.removeEventListener("scroll", onScroll);
    }
    function measure() { stickTop = parseFloat(window.getComputedStyle(stage).top) || 0; onScroll(); }

    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      var near = entries[0].isIntersecting;
      if (near) preload();
      listen(near);
      if (near) onScroll();
    }, { rootMargin: "1000px 0px" }) : null;

    function enable() {
      if (enabled) return;
      enabled = true;
      sec.classList.add("is-seq");
      if (!canvas) {
        canvas = doc.createElement("canvas");
        canvas.width = 960;
        canvas.height = 540;
        canvas.setAttribute("aria-hidden", "true");
        ctx = canvas.getContext("2d");
        bgBox.appendChild(canvas);
      }
      lastDrawn = null;
      measure();
      if (io) io.observe(sec); else { preload(); listen(true); }
      window.addEventListener("resize", measure, { passive: true });
    }
    function disable() {
      if (!enabled) return;
      enabled = false;
      sec.classList.remove("is-seq");
      if (io) io.unobserve(sec);
      listen(false);
      window.removeEventListener("resize", measure);
      items.forEach(function (it) { it.classList.remove("is-active"); });
      lastItem = -1;
      lastFrame = -1;
    }
    function apply() { if (canDraw && !reduce.matches && !narrow.matches) enable(); else disable(); }

    apply();
    onChange(reduce, apply);
    onChange(narrow, apply);
  }

  // ---------- 전역 리빌: 화면 아래쪽 요소만 translateY(40px) → 제자리 ----------
  function initReveal() {
    if (reduce.matches || !("IntersectionObserver" in window)) return;
    var sel = [
      ".section-head", ".cine-intro .definition", ".cine-intro__cta", ".feat-tabs", ".feat", ".ind",
      ".price-card", ".cube", ".news > li", ".faq-item", ".cta-band__inner > *", ".card-grid > li",
      ".feature-list > div", ".steps > li", ".pain-list > li", ".criteria-list > li", ".ind-grid > li",
      ".check-list > li", ".screen-figure", ".table-wrap", ".ind-price", ".history > li", ".container > .section-title"
    ].join(",");
    var limit = window.innerHeight * 0.92;
    var els = all(sel).filter(function (el) {
      return !el.closest(".cine-hero, .cine-why.is-seq") && el.getBoundingClientRect().top > limit;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px" });

    els.forEach(function (el) {
      var parent = el.parentElement;
      var idx = parent ? Array.prototype.indexOf.call(parent.children, el) : 0;
      if (idx > 0) el.style.setProperty("--rd", Math.min(idx, 4) * 80 + "ms");
      el.classList.add("reveal");
      el.addEventListener("transitionend", function done(ev) {
        if (ev.target !== el || ev.propertyName !== "transform") return;
        el.removeEventListener("transitionend", done);
        el.classList.remove("reveal", "in");
        el.style.removeProperty("--rd");
      });
      io.observe(el);
    });
  }

  function start() {
    initHeader();
    initTabs();
    initIndustries();
    initSequence();
    initReveal();
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start);
  else start();

  // 영상은 페이지 load 이후에만 받는다
  if (doc.readyState === "complete") initHero();
  else window.addEventListener("load", initHero);
})();
