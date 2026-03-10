(() => {
  const MOBILE_ITEMS = [
    { page: "dashboard", label: "Home", icon: "fa-home" },
    { page: "notes", label: "Notes", icon: "fa-note-sticky" },
    { page: "canvas", label: "Canvas", icon: "fa-palette" },
    { page: "scheduler", label: "Plan", icon: "fa-calendar" },
    { page: "profile", label: "Me", icon: "fa-user" }
  ];

  let deferredInstallPrompt = null;

  function renderMobileBottomNav() {
    const nav = document.getElementById("mobileBottomNav");
    if (!nav) return;

    nav.innerHTML = MOBILE_ITEMS.map((item) => {
      return `<button class="mb-nav-btn" data-page="${item.page}" type="button"><i class="fas ${item.icon}"></i><span>${item.label}</span></button>`;
    }).join("");

    nav.addEventListener("click", (event) => {
      const button = event.target.closest(".mb-nav-btn");
      if (!button || !window.app) return;
      const page = button.dataset.page;
      window.app.showPage(page);
      if (window.innerWidth <= 960 && document.getElementById("sidebar")?.classList.contains("open")) {
        window.app.toggleMobileSidebar();
      }
      updateBottomNavState(page);
    });
  }

  function updateBottomNavState(currentPage) {
    document.querySelectorAll("#mobileBottomNav .mb-nav-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.page === currentPage);
    });
  }

  function hookPageChanges() {
    if (!window.app || typeof window.app.showPage !== "function") return;
    const originalShowPage = window.app.showPage.bind(window.app);
    window.app.showPage = function patchedShowPage(page) {
      const result = originalShowPage(page);
      updateBottomNavState(page);
      return result;
    };
    updateBottomNavState(window.app.currentPage || "dashboard");
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    });
  }

  function setupInstallPrompt() {
    const installButton = document.getElementById("installPwaBtn");
    if (!installButton) return;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installButton.classList.remove("hidden");
    });

    installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.classList.add("hidden");
    });

    window.addEventListener("appinstalled", () => {
      installButton.classList.add("hidden");
      if (window.app?.showToast) {
        window.app.showToast("Shiro Notes installed successfully", "success");
      }
    });
  }

  function setupOnlineOfflineFeedback() {
    window.addEventListener("offline", () => {
      if (window.app?.showToast) window.app.showToast("You are offline. Cached mode enabled.", "warning");
    });
    window.addEventListener("online", () => {
      if (window.app?.showToast) window.app.showToast("Back online and synced.", "success");
    });
  }

  function bootstrap() {
    renderMobileBottomNav();
    setupInstallPrompt();
    registerServiceWorker();
    setupOnlineOfflineFeedback();

    const waitForApp = setInterval(() => {
      if (!window.app) return;
      hookPageChanges();
      clearInterval(waitForApp);
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
