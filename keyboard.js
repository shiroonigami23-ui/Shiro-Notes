// Keyboard Shortcuts Module for Shiro Notes
class KeyboardModule {
  constructor(app) {
    this.app = app;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    if (this.app.isLocked) return;

    // Check if an input, textarea, or contenteditable is focused
    const isEditingText = /INPUT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable;

    // Global shortcuts (Ctrl/Cmd)
    if (e.ctrlKey || e.metaKey) {
      // Prevent browser default actions for our shortcuts
      let prevented = true;
      switch (e.key.toLowerCase()) {
        case 'n': // New Quick Note
          this.app.showQuickNote();
          break;
        case 'b': // Go to Books
          this.app.showPage('books');
          break;
        case 'f': // Focus Search
          document.getElementById('quickSearch').focus();
          break;
        case 'l': // Lock App
          this.app.lockApp();
          break;
        case 'k': // Show Shortcuts Help
          this.showShortcutsModal();
          break;
        case 's': // Save (if editor is active)
          if (window.editorModule && editorModule.currentItem) {
            editorModule.saveItem();
          } else {
            prevented = false; // Allow default browser save
          }
          break;
        default:
          prevented = false; // Not one of our shortcuts
      }
      if (prevented) e.preventDefault();
    }

    // Global shortcuts (no modifier)
    if (!isEditingText) {
      switch (e.key) {
        case '/': // Focus search
          e.preventDefault();
          document.getElementById('quickSearch').focus();
          break;
      }
    }

    // Escape key
    if (e.key === 'Escape') {
      this.handleEscape();
    }
  }

  handleEscape() {
    // Close any open modals first
    const openModal = document.querySelector('.modal-overlay.visible');
    if (openModal) {
      openModal.remove();
      return;
    }

    // Close quick note popup
    const quickNote = document.getElementById('quickNotePopup');
    if (quickNote.classList.contains('visible')) {
      this.app.hideQuickNote();
      return;
    }

    // Exit editor fullscreen
    const fullscreenEditor = document.querySelector('.editor-container.fullscreen');
    if (fullscreenEditor) {
        window.editorModule.toggleFullscreen();
        return;
    }

    // Clear search or unfocus
    const searchInput = document.getElementById('quickSearch');
    if (document.activeElement === searchInput) {
      searchInput.value = '';
      searchInput.blur();
    }
  }

  showShortcutsModal() {
    const shortcuts = [
      { keys: 'Ctrl/Cmd + N', description: 'Create a new Quick Note' },
      { keys: 'Ctrl/Cmd + B', description: 'Navigate to Books page' },
      { keys: 'Ctrl/Cmd + F', description: 'Focus on the quick search bar' },
      { keys: 'Ctrl/Cmd + L', description: 'Lock the application' },
      { keys: 'Ctrl/Cmd + K', description: 'Show this shortcuts guide' },
      { keys: 'Ctrl/Cmd + S', description: 'Save the current note/book in the editor' },
      { keys: '/', description: 'Focus on the quick search bar (when not typing)' },
      { keys: 'Esc', description: 'Close modals, popups, or clear search' },
    ];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <ul class="shortcuts-list">
            ${shortcuts.map(s => `
              <li>
                <div class="shortcut-keys">
                  ${s.keys.split(' + ').map(k => `<kbd>${k}</kbd>`).join(' + ')}
                </div>
                <div class="shortcut-description">${s.description}</div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);

    // Add specific styles for the shortcuts modal
    const shortcutStyles = `
      .shortcuts-list { list-style: none; padding: 0; }
      .shortcuts-list li { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border); }
      .shortcuts-list li:last-child { border-bottom: none; }
      .shortcut-keys kbd {
        background-color: var(--color-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-1) var(--space-2);
        font-family: monospace;
        font-size: var(--font-size-sm);
        color: var(--color-text);
      }
      .shortcut-description { color: var(--color-text-secondary); }
    `;
    const styleSheet = document.createElement('style');
    styleSheet.textContent = shortcutStyles;
    document.head.appendChild(styleSheet);
  }
}

// Initialize the module
const keyboardModule = new KeyboardModule(app);
window.keyboardModule = keyboardModule;

// Clean up the now redundant shortcut handler in app.js
app.setupKeyboardShortcuts = () => {
    // This function is now handled by keyboard.js
    console.log("Keyboard shortcuts are managed by KeyboardModule.");
};


