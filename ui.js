// UI Interaction Module for Shiro Notes
class UIModule {
    constructor(app) {
        this.app = app;
        // Store original button content for loading state
        this.originalButtonContent = new WeakMap();
    }

    // --- Theme Management ---
    initializeTheme() {
        const savedTheme = this.app.data.settings.theme;
        let effectiveTheme = 'light'; // Default

        if (savedTheme === 'auto') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            // Add listener for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (this.app.data.settings.theme === 'auto') {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        } else {
            effectiveTheme = savedTheme;
        }
        this.setTheme(effectiveTheme);

        // Update theme toggle UI if it exists (e.g., in profile)
        this.updateThemeToggleUI(effectiveTheme);
    }

    setTheme(theme) {
        // Remove existing theme attributes first
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-color-scheme');

        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-color-scheme', 'dark');
        } else {
            // Default to light
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-color-scheme', 'light');
        }
        console.log(`Theme set to: ${theme}`);
        this.updateThemeToggleUI(theme); // Update UI
    }

    // Call this when the theme select/toggle changes
    handleThemeChange(selectedTheme) {
        this.app.data.settings.theme = selectedTheme;
        this.app.saveData();
        if (selectedTheme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        } else {
            this.setTheme(selectedTheme);
        }
    }

    updateThemeToggleUI(currentTheme) {
        // Example: Update a theme toggle button icon
        const themeToggleButton = document.getElementById('themeToggleBtn'); // Assuming you add this ID
        if (themeToggleButton) {
            const icon = themeToggleButton.querySelector('i');
            if (icon) {
                icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
            themeToggleButton.setAttribute('title', `Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`);
        }

        // Example: Update select dropdown in profile
        const themeSelect = document.querySelector('#tab-preferences select');
         if (themeSelect && this.app.currentPage === 'profile') {
             themeSelect.value = this.app.data.settings.theme; // Use saved setting for select value
         }
    }


    // --- Sidebar Management ---
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.toggle('collapsed');
        this.app.sidebarCollapsed = isCollapsed;

        const toggleIcon = document.getElementById('sidebarToggle')?.querySelector('i');
        if (toggleIcon) {
            toggleIcon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        }
        // Persist sidebar state?
        // localStorage.setItem('shiroSidebarCollapsed', isCollapsed);
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
            // Optional: Add overlay to main content when sidebar is open
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 768) { // Only close if on mobile view
            sidebar.classList.remove('open');
        }
    }

     // Method to check persisted sidebar state on load
     checkSidebarState() {
         /*
         const savedState = localStorage.getItem('shiroSidebarCollapsed');
         if (savedState === 'true' && !this.app.sidebarCollapsed) {
             this.toggleSidebar();
         }
         */
         // Ensure correct icon on load
         const sidebar = document.getElementById('sidebar');
         const isCollapsed = sidebar?.classList.contains('collapsed');
         const toggleIcon = document.getElementById('sidebarToggle')?.querySelector('i');
         if (toggleIcon) {
             toggleIcon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
         }
     }


    // --- Quick Note Popup ---
    showQuickNote() {
        const popup = document.getElementById('quickNotePopup');
        if (!popup) return;
        popup.classList.remove('hidden');
        // Trigger reflow before adding visible class for transition
        void popup.offsetWidth;
        popup.classList.add('visible');

        // Setup handlers (ensure they are only added once or remove previous)
        const closeBtn = document.getElementById('closeQuickNote');
        const cancelBtn = document.getElementById('cancelQuickNote');
        const saveBtn = document.getElementById('saveQuickNote');

        // Use .onclick to easily replace handlers
        closeBtn.onclick = () => this.hideQuickNote();
        cancelBtn.onclick = () => this.hideQuickNote();
        saveBtn.onclick = () => this.app.saveQuickNote(); // Call main app logic

        // Focus title input
        setTimeout(() => document.getElementById('quickNoteTitle')?.focus(), 150); // Delay allows transition
    }

    hideQuickNote() {
        const popup = document.getElementById('quickNotePopup');
        if (!popup) return;
        popup.classList.remove('visible');
        // Wait for transition to finish before hiding and clearing
        setTimeout(() => {
            popup.classList.add('hidden');
            document.getElementById('quickNoteTitle').value = '';
            document.getElementById('quickNoteContent').value = '';
        }, 300); // Match CSS transition duration
    }

    // --- Fullscreen Toggle ---
    toggleFullScreen() {
        const btnIcon = document.getElementById('fullScreenBtn')?.querySelector('i');
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                if (btnIcon) btnIcon.className = 'fas fa-compress';
            }).catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                this.app.showToast('Could not enter fullscreen mode', 'warning');
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    if (btnIcon) btnIcon.className = 'fas fa-expand';
                }).catch(err => {
                     console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
                });
            }
        }
    }

     // Listen for fullscreen changes (e.g., user pressing Esc)
     setupFullscreenListener() {
         document.addEventListener('fullscreenchange', () => {
             const btnIcon = document.getElementById('fullScreenBtn')?.querySelector('i');
             if (btnIcon) {
                 btnIcon.className = document.fullscreenElement ? 'fas fa-compress' : 'fas fa-expand';
             }
         });
     }

    // --- Toast Notifications ---
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
          <i class="toast-icon ${icons[type]}" aria-hidden="true"></i>
          <div class="toast-content">
            <div class="toast-message">${message}</div>
          </div>
          <button class="toast-close" aria-label="Dismiss notification">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        `;

        container.prepend(toast); // Add new toasts to the top

        // Animate in
        // Trigger reflow before adding visible class
        void toast.offsetWidth;
        toast.classList.add('visible');

        // Auto remove
        const timer = setTimeout(() => {
            this.hideToast(toast);
        }, duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timer);
            this.hideToast(toast);
        });
    }

    hideToast(toastElement) {
         if (!toastElement) return;
         toastElement.classList.remove('visible');
         // Remove from DOM after transition
         toastElement.addEventListener('transitionend', () => {
              // Check if the element still exists before removing
              if (toastElement.parentElement) {
                 toastElement.remove();
              }
         }, { once: true });
     }


    // --- Loading Overlay ---
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        const spinner = overlay.querySelector('.loading-spinner i');
        const srText = overlay.querySelector('.sr-only');

        if (spinner) spinner.className = 'fas fa-spinner fa-spin'; // Ensure spinner is spinning
        if (srText) srText.textContent = message;

        overlay.classList.remove('hidden');
        overlay.classList.add('visible'); // If using opacity transition
        overlay.setAttribute('aria-busy', 'true');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        overlay.classList.remove('visible'); // If using opacity transition
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-busy', 'false');
    }

    // --- Button Loading State ---
    showButtonLoading(buttonElement) {
        if (!buttonElement || buttonElement.disabled) return;

        // Store original content if not already stored
        if (!this.originalButtonContent.has(buttonElement)) {
            this.originalButtonContent.set(buttonElement, buttonElement.innerHTML);
        }

        buttonElement.disabled = true;
        buttonElement.classList.add('btn--loading');
        // Add spinner icon
        const spinner = document.createElement('i');
        spinner.className = 'btn-spinner fas fa-spinner fa-spin';
        spinner.setAttribute('aria-hidden', 'true');
        buttonElement.appendChild(spinner);

        // Add ARIA busy state
        buttonElement.setAttribute('aria-busy', 'true');
        buttonElement.setAttribute('aria-live', 'polite'); // Announce state change
    }

    hideButtonLoading(buttonElement) {
        if (!buttonElement || !buttonElement.classList.contains('btn--loading')) return;

        buttonElement.disabled = false;
        buttonElement.classList.remove('btn--loading');
        const spinner = buttonElement.querySelector('.btn-spinner');
        if (spinner) {
            spinner.remove();
        }

        // Restore original content
        if (this.originalButtonContent.has(buttonElement)) {
            buttonElement.innerHTML = this.originalButtonContent.get(buttonElement);
            this.originalButtonContent.delete(buttonElement); // Clean up map
        }

        // Remove ARIA busy state
        buttonElement.removeAttribute('aria-busy');
        buttonElement.removeAttribute('aria-live');
    }


    // --- Modal Management ---
    closeModals() {
        // Close quick note if open
        const quickNote = document.getElementById('quickNotePopup');
        if (quickNote && quickNote.classList.contains('visible')) {
            this.hideQuickNote();
        }
        // Close any other generic modals (add specific checks if needed)
        document.querySelectorAll('.modal-overlay.visible').forEach(modal => {
            // Check if it's NOT the quick note modal before removing,
            // as hideQuickNote handles its specific cleanup.
            if (!modal.querySelector('.quick-note-container')) {
                 modal.classList.remove('visible');
                 setTimeout(() => modal.remove(), 300); // Allow transition
            }
        });
        // Add logic for editor modals, etc. if they have specific close functions
        // Example: if (window.editorFeatures && window.editorFeatures.isFindReplaceVisible) window.editorFeatures.closeFindReplace();
    }

    // --- Navigation UI Updates ---
    updateActiveNavItem(pageId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }

    updateBreadcrumb(pageTitle) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.textContent = pageTitle;
        }
    }

    // --- General Initialization ---
    initUI() {
        this.initializeTheme();
        this.checkSidebarState();
        this.setupFullscreenListener();
        // Add other UI initializations here
    }
}

// Instantiate and attach to window.app if it exists
if (window.app) {
    window.uiModule = new UIModule(window.app);
    // Overload app methods or set references if needed
    window.app.showToast = (msg, type, duration) => window.uiModule.showToast(msg, type, duration);
    window.app.showLoading = (msg) => window.uiModule.showLoading(msg);
    window.app.hideLoading = () => window.uiModule.hideLoading();
    window.app.toggleMobileSidebar = () => window.uiModule.toggleMobileSidebar();
    window.app.toggleSidebar = () => window.uiModule.toggleSidebar();
    window.app.closeMobileSidebar = () => window.uiModule.closeMobileSidebar();
    window.app.showQuickNote = () => window.uiModule.showQuickNote();
    window.app.hideQuickNote = () => window.uiModule.hideQuickNote();
    window.app.toggleFullScreen = () => window.uiModule.toggleFullScreen();
    window.app.closeModals = () => window.uiModule.closeModals();
     // Add initUI call within app.init
     const originalAppInit = window.app.init;
     window.app.init = async function() {
         // Run original init first
         await originalAppInit.call(this);
         // Then initialize UI specifics
         window.uiModule.initUI();
     }


} else {
    console.error("Main app instance not found for UIModule initialization.");
}
