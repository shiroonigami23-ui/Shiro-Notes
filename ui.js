// UI Interaction Module for Shiro Notes
class UIModule {
    constructor(app) {
        this.app = app;
        this.sidebarCollapsed = false;
        this.setupEventListeners(); // Setup UI specific listeners immediately
    }

    setupEventListeners() {
        // Theme Toggle (Assuming button exists)
        const themeToggleBtn = document.getElementById('themeToggle'); // Make sure this ID exists in HTML
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        } else {
             // Add theme toggle button dynamically if needed, or ensure it's in index.html
            const topBarRight = document.querySelector('.top-bar-right');
            if (topBarRight) {
                const button = document.createElement('button');
                button.id = 'themeToggle';
                button.className = 'action-btn';
                button.title = 'Toggle Theme';
                button.innerHTML = '<i class="fas fa-moon"></i>'; // Default icon
                button.addEventListener('click', () => this.toggleTheme());
                topBarRight.appendChild(button);
                this.initializeTheme(); // Update icon after adding
            }
        }


        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileSidebar());
        }

        // Sidebar toggle (Desktop)
        const sidebarToggleBtn = document.getElementById('sidebarToggle');
        if (sidebarToggleBtn) {
            sidebarToggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Quick note button
        const quickNoteBtn = document.getElementById('quickNote');
        if (quickNoteBtn) {
            quickNoteBtn.addEventListener('click', () => this.showQuickNote());
        }

        // Full screen button
        const fullScreenBtn = document.getElementById('fullScreenBtn');
        if (fullScreenBtn) {
            fullScreenBtn.addEventListener('click', () => this.toggleFullScreen());
        }

        // Clicking outside sidebar closes mobile sidebar
        const mainContent = document.querySelector('.main-content');
         if (mainContent) {
            mainContent.addEventListener('click', (e) => {
                const sidebar = document.getElementById('sidebar');
                 if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
                     // Check if click was not on the toggle button itself
                     if (!mobileMenuBtn || !mobileMenuBtn.contains(e.target)) {
                         this.closeMobileSidebar();
                     }
                 }
            });
         }
    }

    // --- Theme Management ---
    initializeTheme() {
        const themeSetting = this.app.data.settings.theme || 'auto';
        let themeToSet = themeSetting;

        if (themeSetting === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeToSet = prefersDark ? 'dark' : 'light';
        }
        this.setTheme(themeToSet, false); // Set initial theme without saving 'auto'

        // Listen for system changes if set to auto
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
          if (this.app.data.settings.theme === 'auto') {
            this.setTheme(event.matches ? 'dark' : 'light', false);
          }
        });
    }

    setTheme(theme, saveSetting = true) {
        document.documentElement.setAttribute('data-theme', theme); // Use data-theme attribute
        const themeIcon = document.getElementById('themeToggle')?.querySelector('i');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        if (saveSetting) {
            this.app.data.settings.theme = theme; // Store the actual theme (light/dark) unless auto was clicked
            this.app.saveData();
        }
    }

    toggleTheme() {
        const currentThemeSetting = this.app.data.settings.theme || 'auto';
        const currentActualTheme = document.documentElement.getAttribute('data-theme') || 'light';
        let newThemeSetting;

        if (currentThemeSetting === 'auto') {
            // If currently auto, switch explicitly to the opposite of the current actual theme
            newThemeSetting = currentActualTheme === 'dark' ? 'light' : 'dark';
        } else {
            // If explicitly set, toggle between light and dark
            newThemeSetting = currentActualTheme === 'dark' ? 'light' : 'dark';
            // Optionally add 'auto' back into the cycle if desired
            // newThemeSetting = currentActualTheme === 'dark' ? 'light' : (currentActualTheme === 'light' ? 'auto' : 'dark');
        }

        let themeToSet = newThemeSetting;
         if (newThemeSetting === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeToSet = prefersDark ? 'dark' : 'light';
         }

        this.setTheme(themeToSet, true); // Save the new setting
        this.app.data.settings.theme = newThemeSetting; // Explicitly save the setting chosen ('light', 'dark', or 'auto')
        this.app.saveData();
    }


    // --- Sidebar Management ---
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('collapsed');
        this.sidebarCollapsed = sidebar.classList.contains('collapsed');
        // Optional: Save sidebar state?
        // localStorage.setItem('shiroSidebarCollapsed', this.sidebarCollapsed);
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('open');
        // Add/remove overlay or dim effect on main content if desired
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.remove('open');
    }

    // --- Quick Note Popup ---
    showQuickNote() {
        const popup = document.getElementById('quickNotePopup');
        if (!popup) {
            console.error("Quick Note Popup element not found.");
            return;
        }
        popup.classList.remove('hidden');
        setTimeout(() => popup.classList.add('visible'), 10);

        // Clear previous content
        document.getElementById('quickNoteTitle').value = '';
        document.getElementById('quickNoteContent').value = '';

        // Focus the title input
        setTimeout(() => document.getElementById('quickNoteTitle').focus(), 150);


        // Remove previous listeners before adding new ones to prevent duplicates
        const closeBtn = document.getElementById('closeQuickNote');
        const cancelBtn = document.getElementById('cancelQuickNote');
        const saveBtn = document.getElementById('saveQuickNote');

        const closeHandler = () => this.hideQuickNote();
        const saveHandler = () => this.saveQuickNote();

        closeBtn.replaceWith(closeBtn.cloneNode(true)); // Clone to remove listeners
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        saveBtn.replaceWith(saveBtn.cloneNode(true));

        document.getElementById('closeQuickNote').addEventListener('click', closeHandler);
        document.getElementById('cancelQuickNote').addEventListener('click', closeHandler);
        document.getElementById('saveQuickNote').addEventListener('click', saveHandler);

    }

    hideQuickNote() {
        const popup = document.getElementById('quickNotePopup');
        if (!popup) return;
        popup.classList.remove('visible');
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 300); // Match CSS transition duration
    }

    saveQuickNote() {
        const titleInput = document.getElementById('quickNoteTitle');
        const contentInput = document.getElementById('quickNoteContent');
        const title = titleInput.value.trim() || 'Quick Note'; // Default title
        const content = contentInput.value.trim();

        if (!content) {
            this.app.showToast('Please enter some content for the note.', 'warning');
            contentInput.focus();
            return;
        }

        const note = {
            id: this.app.generateId(),
            title: title,
            content: content, // Save raw content, editor handles formatting if opened later
            type: 'text',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            tags: ['quick note'], // Add a default tag
            bookmarked: false,
            encrypted: false
        };

        this.app.data.notes.push(note);
        this.app.saveData();
        this.app.updateUI(); // Refresh counts, maybe recent notes
        this.hideQuickNote();
        this.app.showToast('Quick note saved successfully!', 'success');
    }

    // --- Full Screen ---
    toggleFullScreen() {
        const btn = document.getElementById('fullScreenBtn');
        const icon = btn?.querySelector('i');

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                this.app.showToast('Could not enter full screen mode.', 'error');
            });
            if (icon) icon.className = 'fas fa-compress';
            if (btn) btn.title = 'Exit Full Screen';
        } else {
             if (document.exitFullscreen) {
                document.exitFullscreen();
                if (icon) icon.className = 'fas fa-expand';
                if (btn) btn.title = 'Enter Full Screen';
             }
        }

        // Listen for fullscreen change event to reset button if exited via Esc key
        const fullscreenChangeHandler = () => {
             if (!document.fullscreenElement && icon && btn) {
                 icon.className = 'fas fa-expand';
                 btn.title = 'Enter Full Screen';
                 document.removeEventListener('fullscreenchange', fullscreenChangeHandler); // Clean up listener
             }
        };
        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
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
            error: 'fas fa-times-circle', // Use times-circle for error
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
          <div class="toast-icon-wrapper">
            <i class="toast-icon ${icons[type]}"></i>
          </div>
          <div class="toast-content">
            <p class="toast-message">${this.app.escapeHtml(message)}</p>
          </div>
          <button class="toast-close" aria-label="Close notification">
            <i class="fas fa-times"></i>
          </button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });


        const removeToast = () => {
            toast.classList.remove('visible');
            toast.addEventListener('transitionend', () => {
                if (toast.parentNode === container) { // Check if still attached
                     container.removeChild(toast);
                }
            }, { once: true });
        };

        // Auto remove timer
        const timerId = setTimeout(removeToast, duration);

        // Remove on click
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timerId); // Clear auto-remove timer
            removeToast();
        });
    }


    // --- Loading Overlay ---
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        // Optional: Add message span to overlay HTML if needed
        // const messageEl = overlay.querySelector('.loading-message');
        // if (messageEl) messageEl.textContent = message;
        overlay.classList.remove('hidden');
         // Add small delay for fade-in effect if desired
        setTimeout(() => overlay.style.opacity = '1', 10);
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (!overlay) return;
        overlay.style.opacity = '0';
        // Wait for fade-out transition before hiding
        setTimeout(() => overlay.classList.add('hidden'), 300); // Match CSS transition
    }

     // --- General Modal Handling ---
     closeOpenModals() {
        const openModal = document.querySelector('.modal-overlay.visible');
        if (openModal) {
            openModal.classList.remove('visible');
            openModal.addEventListener('transitionend', () => {
                 if (openModal.parentNode) {
                     openModal.parentNode.removeChild(openModal);
                 }
            }, { once: true });
            return true; // Indicate a modal was closed
        }
        return false; // No modal was open
     }

     // --- Update Breadcrumb ---
      updateBreadcrumb(pageId) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.textContent = this.app.getPageTitle(pageId); // Assumes getPageTitle is on main app
        }
      }

       // --- Update Active Nav Item ---
      setActiveNavItem(pageId) {
         // Remove active state from all nav items
         document.querySelectorAll('.nav-item').forEach(item => {
             item.classList.remove('active');
         });

         // Set active nav item
         const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
         if (navItem) {
             navItem.classList.add('active');
         }
      }

}

// Initialize the module and attach it to the window or app instance
if (window.app) {
    window.uiModule = new UIModule(window.app);
} else {
    console.error("Main app instance not found for UIModule initialization.");
}
