(function () {
  const readerStates = new Map();

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getState(targetId) {
    if (!readerStates.has(targetId)) {
      readerStates.set(targetId, {
        playing: false,
        timerId: 0,
      });
    }
    return readerStates.get(targetId);
  }

  function getControls(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return null;

    return {
      target,
      button: document.querySelector(`[data-reader-toggle="${targetId}"]`),
      speed: document.querySelector(`[data-reader-speed="${targetId}"]`),
      preset: document.querySelector(`[data-reader-preset="${targetId}"]`),
      status: document.querySelector(`[data-reader-status="${targetId}"]`),
      progress: document.querySelector(`[data-reader-progress="${targetId}"]`),
      progressBar: document.querySelector(
        `[data-reader-progress-bar="${targetId}"]`,
      ),
    };
  }

  function updateProgress(targetId) {
    const controls = getControls(targetId);
    if (!controls) return;

    const rect = controls.target.getBoundingClientRect();
    const start = window.scrollY + rect.top - 120;
    const readableHeight = Math.max(
      controls.target.offsetHeight - window.innerHeight + 220,
      1,
    );
    const progress = clamp((window.scrollY - start) / readableHeight, 0, 1);
    const percent = Math.round(progress * 100);

    if (controls.progress) {
      controls.progress.textContent = `${percent}%`;
    }
    if (controls.progressBar) {
      controls.progressBar.style.width = `${percent}%`;
    }
  }

  window.__updateReaderProgress = updateProgress;

  function syncButton(targetId) {
    const controls = getControls(targetId);
    const state = getState(targetId);
    if (!controls || !controls.button) return;

    controls.button.textContent = state.playing ? "暂停滚动" : "开始滚动";
    controls.button.classList.toggle("is-active", state.playing);
    controls.target.dataset.readerRunning = state.playing ? "true" : "false";
    if (controls.status) {
      controls.status.textContent = state.playing ? "滚动中" : "待开始";
    }
  }

  function applyPreset(targetId) {
    const controls = getControls(targetId);
    if (!controls || !controls.preset) return;
    controls.target.dataset.readerPreset = controls.preset.value;
  }

  window.__applyReaderPreset = function (targetId) {
    applyPreset(targetId);
    updateProgress(targetId);
  };

  function stop(targetId) {
    const state = getState(targetId);
    state.playing = false;
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = 0;
    }
    syncButton(targetId);
  }

  function step(targetId) {
    const controls = getControls(targetId);
    const state = getState(targetId);
    if (!controls || !state.playing) return;
    const stepSize = Number(controls.speed && controls.speed.value) || 7;
    const maxScrollTop =
      document.documentElement.scrollHeight - window.innerHeight - 4;

    if (window.scrollY >= maxScrollTop) {
      stop(targetId);
      updateProgress(targetId);
      return;
    }

    window.scrollTo(0, Math.min(window.scrollY + stepSize, maxScrollTop));
    updateProgress(targetId);
  }

  function toggle(targetId) {
    const controls = getControls(targetId);
    if (!controls) return;

    const state = getState(targetId);
    state.playing = !state.playing;
    syncButton(targetId);

    if (state.playing) {
      step(targetId);
      state.timerId = window.setInterval(() => {
        step(targetId);
      }, 40);
    } else if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = 0;
    }
  }

  window.__toggleReader = toggle;

  function bindReaders() {
    document.querySelectorAll("[data-reader-controls]").forEach((node) => {
      const targetId = node.getAttribute("data-reader-controls");
      if (!targetId || node.dataset.readerReady === "true") return;
      node.dataset.readerReady = "true";
      applyPreset(targetId);
      updateProgress(targetId);
      syncButton(targetId);
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reader-toggle]");
    if (!button) return;

    const targetId = button.getAttribute("data-reader-toggle");
    if (!targetId) return;

    event.preventDefault();
    toggle(targetId);
  });

  window.addEventListener(
    "scroll",
    () => {
      document.querySelectorAll("[data-reader-controls]").forEach((node) => {
        const targetId = node.getAttribute("data-reader-controls");
        if (targetId) updateProgress(targetId);
      });
    },
    { passive: true },
  );

  window.addEventListener("resize", () => {
    bindReaders();
  });

  const observer = new MutationObserver(() => {
    bindReaders();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindReaders);
  } else {
    bindReaders();
  }
})();
