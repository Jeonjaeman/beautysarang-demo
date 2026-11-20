// 데모 D · 클래식 — 히어로 슬라이더와 빠른상담 데모 폼.
// 원칙: JS가 없어도 첫 슬라이드와 모든 글자가 보인다.
(function () {
  "use strict";

  var INTERVAL = 5000;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function initSlider(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll(".cl-slide"));
    var dotsBox = root.querySelector(".cl-slider__dots");
    var pauseBtn = root.querySelector(".cl-slider__pause");
    if (slides.length < 2 || !dotsBox) return;

    var current = 0;
    var timer = 0;
    var userPaused = reduce.matches;
    var hovering = false;

    var dots = slides.map(function (slide, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", (i + 1) + "번 슬라이드");
      b.addEventListener("click", function () { go(i); restart(); });
      dotsBox.appendChild(b);
      return b;
    });

    function go(i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var on = k === current;
        s.classList.toggle("is-active", on);
        s.setAttribute("aria-hidden", on ? "false" : "true");
        // 숨은 슬라이드 안의 링크로 탭 이동이 들어가지 않게 한다
        Array.prototype.forEach.call(s.querySelectorAll("a, button"), function (el) {
          if (on) el.removeAttribute("tabindex"); else el.setAttribute("tabindex", "-1");
        });
      });
      dots.forEach(function (d, k) { d.setAttribute("aria-selected", String(k === current)); });
    }
    function stop() { clearInterval(timer); timer = 0; }
    function restart() {
      stop();
      if (!userPaused && !hovering && !document.hidden) timer = setInterval(function () { go(current + 1); }, INTERVAL);
    }

    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.querySelector(".visually-hidden").textContent = userPaused ? "슬라이드 재생" : "슬라이드 멈춤";
      pauseBtn.addEventListener("click", function () {
        userPaused = !userPaused;
        pauseBtn.setAttribute("aria-pressed", String(userPaused));
        pauseBtn.querySelector(".visually-hidden").textContent = userPaused ? "슬라이드 재생" : "슬라이드 멈춤";
        restart();
      });
    }
    root.addEventListener("mouseenter", function () { hovering = true; stop(); });
    root.addEventListener("mouseleave", function () { hovering = false; restart(); });
    root.addEventListener("focusin", function () { hovering = true; stop(); });
    root.addEventListener("focusout", function () { hovering = false; restart(); });
    document.addEventListener("visibilitychange", restart);

    // 터치 스와이프
    var x0 = null;
    root.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1)); restart(); }
    }, { passive: true });

    go(0);
    restart();
  }

  // 빠른상담: 데모라 실제로 보내지 않는다 (입력값을 주소에 싣지 않는다)
  function initDemoForm(form) {
    var msg = form.querySelector(".cl-phone__msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (msg) {
        msg.hidden = false;
        msg.textContent = "데모 화면이라 접수되지 않았습니다. 상담은 1833-3675로 전화해 주세요.";
      }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-slider]"), initSlider);
  Array.prototype.forEach.call(document.querySelectorAll("[data-demo-form]"), initDemoForm);
})();
