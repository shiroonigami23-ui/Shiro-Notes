(() => {
  const NAV_STATE_KEY = "shiro_nav_sections_v1";

  function setupNavSectionCollapse() {
    const sections = Array.from(document.querySelectorAll(".sidebar .nav-section"));
    if (!sections.length) return;

    const saved = JSON.parse(localStorage.getItem(NAV_STATE_KEY) || "{}");

    sections.forEach((section, index) => {
      const title = section.querySelector(".nav-section-title");
      if (!title) return;
      const id = title.textContent.trim().toLowerCase() || `section-${index}`;
      title.classList.add("nav-section-title");
      title.setAttribute("tabindex", "0");
      title.setAttribute("role", "button");

      if (saved[id]) section.classList.add("is-collapsed");

      const toggle = () => {
        section.classList.toggle("is-collapsed");
        saved[id] = section.classList.contains("is-collapsed");
        localStorage.setItem(NAV_STATE_KEY, JSON.stringify(saved));
      };

      title.addEventListener("click", toggle);
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  function setupWorkspaceStatusPill() {
    const topBarRight = document.querySelector(".top-bar-right");
    if (!topBarRight || document.getElementById("workspaceStatus")) return;

    const pill = document.createElement("div");
    pill.id = "workspaceStatus";
    pill.className = "workspace-status";
    pill.innerHTML = '<span class="dot"></span><span id="workspaceStatusText">All changes saved</span>';
    topBarRight.prepend(pill);

    const text = pill.querySelector("#workspaceStatusText");
    window.addEventListener("sn:data-saved", () => {
      if (!text) return;
      text.textContent = "Saved just now";
      setTimeout(() => {
        text.textContent = "All changes saved";
      }, 2000);
    });
  }

  function setupKeyboardAccessibleCards() {
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (event.key !== "Enter") return;
      if (target.getAttribute("role") === "button") {
        event.preventDefault();
        target.click();
      }
    });
  }

  function applyCanvasPreset(preset) {
    const core = window.canvasCore;
    if (!core?.canvas) {
      window.app?.showToast?.("Open Canvas page first", "warning");
      return;
    }

    const ctx = core.getActiveLayerContext?.();
    if (!ctx) return;

    const w = core.canvas.width;
    const h = core.canvas.height;

    if (preset === "grid") {
      ctx.save();
      ctx.strokeStyle = "rgba(59,130,246,0.25)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (preset === "wireframe") {
      ctx.save();
      ctx.strokeStyle = "rgba(15,23,42,0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(120, 100, w - 240, h - 200);
      ctx.strokeRect(180, 170, w - 360, 120);
      ctx.strokeRect(180, 330, w - 360, h - 450);
      ctx.restore();
    }

    if (preset === "mindmap") {
      ctx.save();
      ctx.strokeStyle = "rgba(16,185,129,0.55)";
      ctx.fillStyle = "rgba(16,185,129,0.12)";
      ctx.lineWidth = 2;
      const cx = w / 2;
      const cy = h / 2;
      const nodes = [
        [cx, cy],
        [cx - 280, cy - 180],
        [cx + 280, cy - 180],
        [cx - 280, cy + 180],
        [cx + 280, cy + 180]
      ];
      nodes.slice(1).forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      });
      nodes.forEach(([x, y], idx) => {
        ctx.beginPath();
        ctx.arc(x, y, idx === 0 ? 64 : 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    core.renderLayers?.();
    core.saveState?.();
    window.app?.showToast?.("Canvas preset applied", "success");
  }

  function injectCanvasPresets() {
    const observer = new MutationObserver(() => {
      const container = document.querySelector("#canvasPage .canvas-container");
      if (!container || container.querySelector(".canvas-presets")) return;

      const row = document.createElement("div");
      row.className = "canvas-presets";
      row.innerHTML = `
        <span style="font-size:11px;opacity:.7;">Quick Presets:</span>
        <button class="canvas-preset-chip" type="button" data-preset="grid">Grid Board</button>
        <button class="canvas-preset-chip" type="button" data-preset="wireframe">Wireframe</button>
        <button class="canvas-preset-chip" type="button" data-preset="mindmap">Mind Map</button>
      `;
      container.appendChild(row);

      row.addEventListener("click", (event) => {
        const button = event.target.closest("[data-preset]");
        if (!button) return;
        applyCanvasPreset(button.dataset.preset);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function boot() {
    setupNavSectionCollapse();
    setupWorkspaceStatusPill();
    setupKeyboardAccessibleCards();
    injectCanvasPresets();
  }

  document.addEventListener("DOMContentLoaded", boot);
  window.workspaceTools = { applyCanvasPreset };
})();
