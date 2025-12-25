/* =====================================================
   ORBITAL JS SYSTEM
   script.js — PART 1 (CORE FOUNDATION)
   ===================================================== */

/* =====================================================
   GLOBAL NAMESPACE
   ===================================================== */
/*
  One global object.
  No pollution.
  No random globals.
*/

const ORBITAL = {
  config: {},
  state: {},
  events: {},
  utils: {},
  modules: {}
};

/* =====================================================
   CONFIG
   ===================================================== */

ORBITAL.config = {
  debug: false,
  motion: true
};

/* =====================================================
   LOGGER
   ===================================================== */

ORBITAL.utils.log = function (...args) {
  if (ORBITAL.config.debug) {
    console.log("[ORBITAL]", ...args);
  }
};

/* =====================================================
   EVENT BUS (PUB / SUB)
   ===================================================== */

ORBITAL.events = (function () {
  const events = {};

  function on(event, handler) {
    if (!events[event]) {
      events[event] = [];
    }
    events[event].push(handler);
  }

  function off(event, handler) {
    if (!events[event]) return;
    events[event] = events[event].filter(h => h !== handler);
  }

  function emit(event, data) {
    ORBITAL.utils.log("Event:", event, data);
    if (!events[event]) return;
    events[event].forEach(handler => handler(data));
  }

  return { on, off, emit };
})();

/* =====================================================
   STATE STORE
   ===================================================== */

ORBITAL.state = (function () {
  const store = {};
  const listeners = {};

  function get(key) {
    return store[key];
  }

  function set(key, value) {
    store[key] = value;
    ORBITAL.utils.log("State:", key, value);

    if (listeners[key]) {
      listeners[key].forEach(fn => fn(value));
    }
  }

  function subscribe(key, fn) {
    if (!listeners[key]) {
      listeners[key] = [];
    }
    listeners[key].push(fn);
  }

  return { get, set, subscribe };
})();

/* =====================================================
   DOM HELPERS
   ===================================================== */

ORBITAL.utils.dom = {
  qs(selector, scope = document) {
    return scope.querySelector(selector);
  },

  qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  },

  create(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }
};

/* =====================================================
   APP INIT
   ===================================================== */

ORBITAL.init = function () {
  ORBITAL.utils.log("App initialized");
  ORBITAL.events.emit("app:init");
};

document.addEventListener("DOMContentLoaded", ORBITAL.init);
/* =====================================================
   script.js — PART 2
   INTERACTION & BEHAVIOR LAYER
   ===================================================== */

/* =====================================================
   SCROLL STATE ENGINE
   ===================================================== */

ORBITAL.modules.scroll = (function () {
  let lastY = 0;

  function onScroll() {
    const currentY = window.scrollY;

    ORBITAL.state.set("scroll:y", currentY);
    ORBITAL.state.set("scroll:direction", currentY > lastY ? "down" : "up");

    lastY = currentY;
  }

  function init() {
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.scroll.init);

/* =====================================================
   NAVBAR BEHAVIOR
   ===================================================== */

ORBITAL.modules.navbar = (function () {
  let nav;

  function handleScroll(y) {
    if (!nav) return;

    if (y > 20) {
      nav.classList.add("nav-scrolled");
    } else {
      nav.classList.remove("nav-scrolled");
    }
  }

  function init() {
    nav = ORBITAL.utils.dom.qs("header, nav");
    ORBITAL.state.subscribe("scroll:y", handleScroll);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.navbar.init);

/* =====================================================
   REVEAL ON SCROLL (JS-DRIVEN)
   ===================================================== */

ORBITAL.modules.reveal = (function () {
  let elements;

  function revealOnScroll() {
    const trigger = window.innerHeight * 0.9;

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < trigger) {
        el.classList.add("is-visible");
      }
    });
  }

  function init() {
    elements = ORBITAL.utils.dom.qsa("[data-reveal]");
    window.addEventListener("scroll", revealOnScroll, { passive: true });
    revealOnScroll(); // initial run
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.reveal.init);

/* =====================================================
   BUTTON FEEDBACK ENGINE
   ===================================================== */

ORBITAL.modules.buttons = (function () {
  function attach() {
    const buttons = ORBITAL.utils.dom.qsa(".btn");

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        btn.classList.add("btn-active");

        setTimeout(() => {
          btn.classList.remove("btn-active");
        }, 150);

        ORBITAL.events.emit("ui:button:click", {
          label: btn.textContent.trim()
        });
      });
    });
  }

  return { init: attach };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.buttons.init);

/* =====================================================
   KEYBOARD SHORTCUTS
   ===================================================== */

ORBITAL.modules.shortcuts = (function () {
  function handleKey(e) {
    // Toggle debug mode: Ctrl + D
    if (e.ctrlKey && e.key.toLowerCase() === "d") {
      ORBITAL.config.debug = !ORBITAL.config.debug;
      console.log("Debug mode:", ORBITAL.config.debug);
    }

    // Scroll to top: Ctrl + K
    if (e.ctrlKey && e.key.toLowerCase() === "k") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function init() {
    window.addEventListener("keydown", handleKey);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.shortcuts.init);

/* =====================================================
   VISIBILITY AWARENESS (PAGE STATE)
   ===================================================== */

ORBITAL.modules.visibility = (function () {
  function handleVisibility() {
    ORBITAL.state.set(
      "page:visible",
      document.visibilityState === "visible"
    );
  }

  function init() {
    document.addEventListener("visibilitychange", handleVisibility);
    handleVisibility();
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.visibility.init);
/* =====================================================
   script.js — PART 3
   FORMS, VALIDATION & UX STATE
   ===================================================== */

/* =====================================================
   FORM UTILITIES
   ===================================================== */

ORBITAL.utils.form = {
  isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  isEmpty(value) {
    return !value || !value.trim();
  }
};

/* =====================================================
   FORM VALIDATION ENGINE
   ===================================================== */

ORBITAL.modules.formValidation = (function () {
  let forms = [];

  function validateField(input) {
    const value = input.value;
    const type = input.type;

    let valid = true;
    let message = "";

    if (ORBITAL.utils.form.isEmpty(value)) {
      valid = false;
      message = "This field is required.";
    }

    if (type === "email" && !ORBITAL.utils.form.isEmail(value)) {
      valid = false;
      message = "Enter a valid email address.";
    }

    setFieldState(input, valid, message);
    return valid;
  }

  function setFieldState(input, valid, message) {
    const field = input.closest(".field");
    if (!field) return;

    field.classList.remove("field-error", "field-success");

    let msg = field.querySelector(".field-message");
    if (!msg) {
      msg = document.createElement("span");
      msg.className = "field-message";
      field.appendChild(msg);
    }

    if (valid) {
      field.classList.add("field-success");
      msg.textContent = "";
    } else {
      field.classList.add("field-error");
      msg.textContent = message;
    }
  }

  function validateForm(form) {
    const inputs = form.querySelectorAll(".field-input");
    let allValid = true;

    inputs.forEach(input => {
      if (!validateField(input)) {
        allValid = false;
      }
    });

    ORBITAL.state.set("form:valid", allValid);
    return allValid;
  }

  function attach(form) {
    const inputs = form.querySelectorAll(".field-input");

    inputs.forEach(input => {
      input.addEventListener("blur", () => validateField(input));
      input.addEventListener("input", () => {
        ORBITAL.state.set("form:dirty", true);
      });
    });

    form.addEventListener("submit", e => {
      e.preventDefault();
      const valid = validateForm(form);

      ORBITAL.events.emit("form:submit", {
        form,
        valid
      });
    });
  }

  function init() {
    forms = ORBITAL.utils.dom.qsa("form");
    forms.forEach(attach);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.formValidation.init);

/* =====================================================
   FORM FEEDBACK CONTROLLER
   ===================================================== */

ORBITAL.modules.formFeedback = (function () {
  function handleSubmit({ form, valid }) {
    if (!valid) {
      ORBITAL.utils.log("Form invalid");
      return;
    }

    form.classList.add("form-loading");

    setTimeout(() => {
      form.classList.remove("form-loading");
      form.classList.add("form-success");

      ORBITAL.events.emit("form:success");
    }, 800);
  }

  function init() {
    ORBITAL.events.on("form:submit", handleSubmit);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.formFeedback.init);

/* =====================================================
   UX STATE MIRROR (DEBUG / AWARENESS)
   ===================================================== */

ORBITAL.modules.uxState = (function () {
  function init() {
    ORBITAL.state.subscribe("form:dirty", value => {
      ORBITAL.utils.log("Form dirty:", value);
    });

    ORBITAL.state.subscribe("form:valid", value => {
      ORBITAL.utils.log("Form valid:", value);
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.uxState.init);
/* =====================================================
   script.js — PART 4
   THEME & USER PREFERENCES
   ===================================================== */

/* =====================================================
   THEME ENGINE
   ===================================================== */

ORBITAL.modules.theme = (function () {
  const STORAGE_KEY = "orbital:theme";
  const root = document.documentElement;

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    ORBITAL.state.set("theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function toggleTheme() {
    const current = root.dataset.theme || getSystemTheme();
    applyTheme(current === "dark" ? "light" : "dark");
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    applyTheme(saved || getSystemTheme());

    ORBITAL.events.on("theme:toggle", toggleTheme);
  }

  return { init, toggleTheme };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.theme.init);

/* =====================================================
   PREFERENCE AWARENESS (REDUCED MOTION)
   ===================================================== */

ORBITAL.modules.preferences = (function () {
  function detectMotion() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ORBITAL.state.set("motion:reduced", reduced);
    document.body.dataset.motion = reduced ? "reduced" : "full";
  }

  function init() {
    detectMotion();
    window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", detectMotion);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.preferences.init);

/* =====================================================
   UI STATE SYNC (CSS <-> JS)
   ===================================================== */

ORBITAL.modules.uiSync = (function () {
  function init() {
    ORBITAL.state.subscribe("scroll:y", y => {
      document.body.dataset.scroll = y > 50 ? "scrolled" : "top";
    });

    ORBITAL.state.subscribe("form:valid", valid => {
      document.body.dataset.formValid = valid ? "yes" : "no";
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.uiSync.init);

/* =====================================================
   GLOBAL CLICK DELEGATION
   ===================================================== */
/*
  One listener.
  Infinite scalability.
*/

ORBITAL.modules.delegation = (function () {
  function handleClick(e) {
    const themeToggle = e.target.closest("[data-theme-toggle]");
    if (themeToggle) {
      ORBITAL.events.emit("theme:toggle");
    }
  }

  function init() {
    document.addEventListener("click", handleClick);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.delegation.init);

/* =====================================================
   SAFE INIT CONFIRMATION
   ===================================================== */

ORBITAL.events.on("app:init", () => {
  ORBITAL.utils.log("PART 4 loaded: Theme & Preferences ready");
});
/* =====================================================
   script.js — PART 5
   PERFORMANCE & OPTIMIZATION LAYER
   ===================================================== */

/* =====================================================
   TIMING UTILITIES
   ===================================================== */

ORBITAL.utils.timing = {
  debounce(fn, delay = 200) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  throttle(fn, limit = 100) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
};

/* =====================================================
   SCROLL PERFORMANCE GUARD
   ===================================================== */

ORBITAL.modules.scrollPerformance = (function () {
  function init() {
    const throttledScroll = ORBITAL.utils.timing.throttle(() => {
      ORBITAL.state.set("scroll:tick", Date.now());
    }, 200);

    window.addEventListener("scroll", throttledScroll, { passive: true });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.scrollPerformance.init);

/* =====================================================
   RESIZE HANDLING
   ===================================================== */

ORBITAL.modules.resize = (function () {
  function handleResize() {
    ORBITAL.state.set("viewport:width", window.innerWidth);
    ORBITAL.state.set("viewport:height", window.innerHeight);
  }

  function init() {
    const debouncedResize = ORBITAL.utils.timing.debounce(handleResize, 250);
    window.addEventListener("resize", debouncedResize);
    handleResize();
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.resize.init);

/* =====================================================
   LAZY IMAGE LOADER
   ===================================================== */

ORBITAL.modules.lazyImages = (function () {
  function init() {
    const images = ORBITAL.utils.dom.qsa("img[data-src]");

    if (!("IntersectionObserver" in window)) {
      images.forEach(img => (img.src = img.dataset.src));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        observer.unobserve(img);
      });
    }, { rootMargin: "200px" });

    images.forEach(img => observer.observe(img));
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.lazyImages.init);

/* =====================================================
   SECTION LAZY ACTIVATION
   ===================================================== */

ORBITAL.modules.lazySections = (function () {
  function init() {
    const sections = ORBITAL.utils.dom.qsa("[data-lazy-section]");

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-active");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    sections.forEach(sec => observer.observe(sec));
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.lazySections.init);

/* =====================================================
   PAGE PERFORMANCE SIGNALS
   ===================================================== */

ORBITAL.modules.performance = (function () {
  function init() {
    window.addEventListener("load", () => {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;

      ORBITAL.state.set("performance:loadTime", loadTime);
      ORBITAL.utils.log("Page load time:", loadTime, "ms");
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.performance.init);

/* =====================================================
   PART CONFIRMATION
   ===================================================== */

ORBITAL.events.on("app:init", () => {
  ORBITAL.utils.log("PART 5 loaded: Performance layer active");
});
/* =====================================================
   script.js — PART 6
   MODALS & MENUS
   ===================================================== */

/* =====================================================
   MODAL ENGINE
   ===================================================== */

ORBITAL.modules.modal = (function () {
  let activeModal = null;

  function open(modal) {
    if (!modal) return;

    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    activeModal = modal;

    ORBITAL.events.emit("modal:open", modal);
  }

  function close() {
    if (!activeModal) return;

    activeModal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    ORBITAL.events.emit("modal:close", activeModal);
    activeModal = null;
  }

  function handleClick(e) {
    const openBtn = e.target.closest("[data-modal-open]");
    const closeBtn = e.target.closest("[data-modal-close]");

    if (openBtn) {
      const id = openBtn.dataset.modalOpen;
      open(document.getElementById(id));
    }

    if (closeBtn || e.target.classList.contains("modal-backdrop")) {
      close();
    }
  }

  function handleKey(e) {
    if (e.key === "Escape") {
      close();
    }
  }

  function init() {
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
  }

  return { init, open, close };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.modal.init);

/* =====================================================
   MOBILE MENU TOGGLE
   ===================================================== */

ORBITAL.modules.menu = (function () {
  let menu;

  function toggle() {
    if (!menu) return;
    menu.classList.toggle("is-open");
  }

  function init() {
    menu = ORBITAL.utils.dom.qs("[data-menu]");
    if (!menu) return;

    document.addEventListener("click", e => {
      if (e.target.closest("[data-menu-toggle]")) {
        toggle();
      }
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.menu.init);

/* =====================================================
   BODY LOCK (MODAL / MENU)
   ===================================================== */

ORBITAL.modules.bodyLock = (function () {
  function init() {
    ORBITAL.events.on("modal:open", () => {
      document.body.style.overflow = "hidden";
    });

    ORBITAL.events.on("modal:close", () => {
      document.body.style.overflow = "";
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.bodyLock.init);

/* =====================================================
   PART CONFIRMATION
   ===================================================== */

ORBITAL.events.on("app:init", () => {
  ORBITAL.utils.log("PART 6 loaded: Modals & menus ready");
});
/* =====================================================
   script.js — PART 7
   ANALYTICS & EVENT LOGGING
   ===================================================== */

/* =====================================================
   EVENT LOGGER CORE
   ===================================================== */

ORBITAL.modules.analytics = (function () {
  const queue = [];
  const MAX_QUEUE = 50;

  function log(type, payload = {}) {
    const event = {
      type,
      payload,
      timestamp: Date.now(),
      url: location.pathname
    };

    queue.push(event);

    if (queue.length > MAX_QUEUE) {
      queue.shift();
    }

    ORBITAL.utils.log("Analytics:", event);
  }

  function getQueue() {
    return [...queue];
  }

  return { log, getQueue };
})();

/* =====================================================
   AUTO UI EVENT TRACKING
   ===================================================== */

ORBITAL.modules.uiTracking = (function () {
  function init() {
    ORBITAL.events.on("ui:button:click", data => {
      ORBITAL.modules.analytics.log("button_click", data);
    });

    ORBITAL.events.on("form:submit", data => {
      ORBITAL.modules.analytics.log("form_submit", {
        valid: data.valid
      });
    });

    ORBITAL.events.on("modal:open", modal => {
      ORBITAL.modules.analytics.log("modal_open", {
        id: modal.id
      });
    });

    ORBITAL.events.on("modal:close", modal => {
      ORBITAL.modules.analytics.log("modal_close", {
        id: modal.id
      });
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.uiTracking.init);

/* =====================================================
   GLOBAL ERROR CAPTURE
   ===================================================== */

ORBITAL.modules.errorTracking = (function () {
  function handleError(event) {
    ORBITAL.modules.analytics.log("js_error", {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno
    });
  }

  function handlePromise(event) {
    ORBITAL.modules.analytics.log("promise_error", {
      reason: event.reason
    });
  }

  function init() {
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handlePromise);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.errorTracking.init);

/* =====================================================
   VISIBILITY & SESSION TRACKING
   ===================================================== */

ORBITAL.modules.session = (function () {
  let startTime = Date.now();

  function init() {
    document.addEventListener("visibilitychange", () => {
      ORBITAL.modules.analytics.log("visibility_change", {
        state: document.visibilityState
      });
    });

    window.addEventListener("beforeunload", () => {
      ORBITAL.modules.analytics.log("session_end", {
        duration: Date.now() - startTime
      });
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.session.init);

/* =====================================================
   PART CONFIRMATION
   ===================================================== */

ORBITAL.events.on("app:init", () => {
  ORBITAL.utils.log("PART 7 loaded: Analytics active");
});
/* =====================================================
   script.js — PART 8
   ACCESSIBILITY & STATE RECOVERY
   ===================================================== */

/* =====================================================
   FOCUS TRAP (MODALS)
   ===================================================== */

ORBITAL.modules.focusTrap = (function () {
  let focusable = [];
  let firstEl = null;
  let lastEl = null;

  function trap(modal) {
    focusable = modal.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusable.length) return;

    firstEl = focusable[0];
    lastEl = focusable[focusable.length - 1];

    firstEl.focus();

    modal.addEventListener("keydown", handleKey);
  }

  function release(modal) {
    modal.removeEventListener("keydown", handleKey);
  }

  function handleKey(e) {
    if (e.key !== "Tab") return;

    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  function init() {
    ORBITAL.events.on("modal:open", trap);
    ORBITAL.events.on("modal:close", release);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.focusTrap.init);

/* =====================================================
   ARIA STATE SYNC
   ===================================================== */

ORBITAL.modules.aria = (function () {
  function init() {
    ORBITAL.events.on("modal:open", modal => {
      modal.setAttribute("aria-hidden", "false");
      modal.setAttribute("role", "dialog");
    });

    ORBITAL.events.on("modal:close", modal => {
      modal.setAttribute("aria-hidden", "true");
    });

    ORBITAL.events.on("theme:toggle", () => {
      document.documentElement.setAttribute(
        "aria-theme",
        document.documentElement.dataset.theme
      );
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.aria.init);

/* =====================================================
   STATE RESTORE ON RELOAD
   ===================================================== */

ORBITAL.modules.restore = (function () {
  function init() {
    const theme = localStorage.getItem("orbital:theme");
    if (theme) {
      document.documentElement.dataset.theme = theme;
      ORBITAL.state.set("theme", theme);
    }

    const scrollY = sessionStorage.getItem("orbital:scrollY");
    if (scrollY) {
      window.scrollTo(0, Number(scrollY));
    }
  }

  function save() {
    sessionStorage.setItem("orbital:scrollY", window.scrollY);
  }

  window.addEventListener("beforeunload", save);

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.restore.init);

/* =====================================================
   SAFE KEYBOARD NAVIGATION
   ===================================================== */

ORBITAL.modules.keyboard = (function () {
  function init() {
    document.addEventListener("keydown", e => {
      // Prevent accidental scroll lock
      if (e.key === "Escape") {
        ORBITAL.events.emit("modal:close");
      }
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.keyboard.init);

/* =====================================================
   PART CONFIRMATION
   ===================================================== */

ORBITAL.events.on("app:init", () => {
  ORBITAL.utils.log("PART 8 loaded: Accessibility ready");
});
/* =====================================================
   script.js — PART 9
   PERSISTENCE & OFFLINE AWARENESS
   ===================================================== */

/* =====================================================
   PERSISTENT STATE STORE
   ===================================================== */

ORBITAL.modules.persistence = (function () {
  const PREFIX = "orbital:persist:";

  function save(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      ORBITAL.utils.log("Persist save failed", e);
    }
  }

  function load(key) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      ORBITAL.utils.log("Persist load failed", e);
      return null;
    }
  }

  function init() {
    // Restore known state keys
    ["theme", "menu:open"].forEach(key => {
      const value = load(key);
      if (value !== null) {
        ORBITAL.state.set(key, value);
      }
    });
  }

  return { init, save, load };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.persistence.init);

/* =====================================================
   AUTO-PERSIST SELECTED STATE
   ===================================================== */

ORBITAL.modules.autoPersist = (function () {
  function init() {
    ORBITAL.state.subscribe("theme", value => {
      ORBITAL.modules.persistence.save("theme", value);
    });

    ORBITAL.state.subscribe("menu:open", value => {
      ORBITAL.modules.persistence.save("menu:open", value);
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.autoPersist.init);

/* =====================================================
   ONLINE / OFFLINE DETECTION
   ===================================================== */

ORBITAL.modules.network = (function () {
  function update() {
    const status = navigator.onLine ? "online" : "offline";
    ORBITAL.state.set("network", status);
    document.body.dataset.network = status;
  }

  function init() {
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.network.init);

/* =====================================================
   OFFLINE UX SIGNAL
   ===================================================== */

ORBITAL.modules.offlineUX = (function () {
  function init() {
    ORBITAL.state.subscribe("network", status => {
      if (status === "offline") {
        ORBITAL.utils.log("Offline mode enabled");
      }
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.offlineUX.init);

/* =====================================================
   SAFE STORAGE CHECK
   ===================================================== */

ORBITAL.modules.storageGuard = (function () {
  function init() {
    try {
      localStorage.setItem("__test", "1");
      localStorage.removeItem("__test");
      ORBITAL.state.set("storage:available", true);
    } catch {
      ORBITAL.state.set("storage:available", false);
    }
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.storageGuard.init);

/* =====================================================
   PART CONFIRMATION
   ===================================================== */

ORBITAL.events.on("app:init", () => {
  ORBITAL.utils.log("PART 9 loaded: Persistence & offline ready");
});
/* =====================================================
   script.js — PART 10
   FINAL CLEANUP & DOCUMENTATION
   ===================================================== */

/* =====================================================
   SAFE INITIALIZATION GUARD
   ===================================================== */

ORBITAL.modules.guard = (function () {
  function init() {
    if (!window.ORBITAL) {
      throw new Error("ORBITAL core missing");
    }
    ORBITAL.utils.log("System guard OK");
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.guard.init);

/* =====================================================
   FEATURE AVAILABILITY REPORT
   ===================================================== */

ORBITAL.modules.featureReport = (function () {
  function init() {
    const report = {
      intersectionObserver: "IntersectionObserver" in window,
      localStorage: (() => {
        try {
          localStorage.setItem("__t", "1");
          localStorage.removeItem("__t");
          return true;
        } catch {
          return false;
        }
      })(),
      prefersReducedMotion:
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    };

    ORBITAL.state.set("feature:report", report);
    ORBITAL.utils.log("Feature report:", report);
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.featureReport.init);

/* =====================================================
   DEV HELPERS (OPTIONAL)
   ===================================================== */

ORBITAL.utils.inspect = function () {
  console.table(ORBITAL.state.get("feature:report"));
  console.log("Analytics queue:", ORBITAL.modules.analytics?.getQueue());
};

/* =====================================================
   GRACEFUL DEGRADATION NOTICE
   ===================================================== */

ORBITAL.modules.degradation = (function () {
  function init() {
    ORBITAL.state.subscribe("feature:report", report => {
      if (!report.intersectionObserver) {
        ORBITAL.utils.log(
          "IntersectionObserver not supported. Lazy loading disabled."
        );
      }
    });
  }

  return { init };
})();

ORBITAL.events.on("app:init", ORBITAL.modules.degradation.init);

/* =====================================================
   FINAL SYSTEM BANNER
   ===================================================== */

ORBITAL.events.on("app:init", () => {
  console.log(
    "%cORBITAL SYSTEM READY",
    "font-weight:bold;font-size:14px;color:#6366f1"
  );
});
