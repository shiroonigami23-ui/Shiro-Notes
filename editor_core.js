// Core Editor Logic Module for Shiro Notes
class EditorCore {
    constructor(app) {
        this.app = app;
        this.currentEditor = null; // Reference to the contenteditable div
        this.currentItem = null; // Reference to the book/note being edited
        this.editorHistory = [];
        this.historyIndex = -1;
        this.isComposing = false; // Flag for IME composition
    }

    // --- Editor Creation & Basic Setup ---

    createEditorInstance(containerElement, initialContent = '') {
        // Creates the contenteditable div itself
        const editorContent = document.createElement('div');
        editorContent.className = 'editor-content';
        editorContent.setAttribute('contenteditable', 'true');
        editorContent.setAttribute('role', 'textbox');
        editorContent.setAttribute('aria-multiline', 'true');
        editorContent.innerHTML = initialContent; // Set initial content

        containerElement.appendChild(editorContent);
        this.currentEditor = editorContent;
        this.setupCoreEventListeners(); // Attach listeners to the new editor instance
        this.resetHistory(initialContent); // Start history with initial content

        return editorContent; // Return the created element
    }

    setupCoreEventListeners() {
        if (!this.currentEditor) return;

        // Debounced history save
        const debouncedSaveHistory = this.debounce(() => this.saveHistory(), 500);

        // Input event: Handles typing, pasting, etc.
        this.currentEditor.addEventListener('input', () => {
            if (this.isComposing) return; // Don't trigger on intermediate composition events
            window.editorModule?.updateWordCount(); // Update word count (calls function in main module)
            window.editorModule?.scheduleAutoSave(); // Trigger auto-save (calls function in main module)
            debouncedSaveHistory(); // Save history after a pause in typing
             // Update toolbar state needs selection info, better handled on keyup/click
        });

        // Keydown for shortcuts and special handling (like Tab)
        this.currentEditor.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Keyup and Click to update toolbar state based on selection
        this.currentEditor.addEventListener('keyup', () => window.editorToolbar?.updateToolbarState());
        this.currentEditor.addEventListener('click', () => window.editorToolbar?.updateToolbarState());
        // Listen for selection changes globally as well
        document.addEventListener('selectionchange', () => {
             if (this.currentEditor && document.activeElement === this.currentEditor) {
                 window.editorToolbar?.updateToolbarState();
             }
         });


        // Handle IME composition events (for languages like Chinese, Japanese, Korean)
        this.currentEditor.addEventListener('compositionstart', () => {
            this.isComposing = true;
        });
        this.currentEditor.addEventListener('compositionend', () => {
            this.isComposing = false;
            // Trigger updates after composition finishes
            window.editorModule?.updateWordCount();
            window.editorModule?.scheduleAutoSave();
            this.saveHistory();
             window.editorToolbar?.updateToolbarState();
        });

        // Handle Paste (optional: plain text paste)
        this.currentEditor.addEventListener('paste', (e) => {
           // Basic plain text paste (uncomment to enable)
           /*
           e.preventDefault();
           const text = (e.clipboardData || window.clipboardData).getData('text/plain');
           document.execCommand('insertText', false, text);
           */
        });
    }

    handleKeyDown(e) {
        // Ctrl/Cmd shortcuts handled by main editor module (for now)
        // Specific key handling for the editor content area
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Insert 4 spaces
            this.saveHistory(); // Save history after tab
        }
        // Add more specific key handlers if needed (e.g., Enter key behavior)
    }

    // --- Core Command Execution ---

    execCommand(command, value = null) {
        if (!this.currentEditor) return;
        try {
            document.execCommand(command, false, value);
            this.currentEditor.focus(); // Keep focus in the editor
            // Manually save history after commands that change content significantly
            // (input event handles typing)
            if (!['undo', 'redo'].includes(command)) {
                this.saveHistory(); // Save state after command execution
                 window.editorToolbar?.updateToolbarState(); // Update toolbar after command
            }
        } catch (error) {
            console.error(`Error executing command '${command}':`, error);
            this.app.showToast(`Could not perform action: ${command}`, 'error');
        }
    }

    // --- History Management (Undo/Redo) ---

    resetHistory(initialContent = '') {
        this.editorHistory = [initialContent];
        this.historyIndex = 0;
    }

    saveHistory() {
        if (!this.currentEditor || this.isComposing) return;

        const currentContent = this.currentEditor.innerHTML;

        // Don't save if content hasn't changed from the last state
        if (this.historyIndex >= 0 && this.editorHistory[this.historyIndex] === currentContent) {
            return;
        }

        // If we undo'd and then typed something new, truncate the 'redo' history
        if (this.historyIndex < this.editorHistory.length - 1) {
            this.editorHistory = this.editorHistory.slice(0, this.historyIndex + 1);
        }

        this.editorHistory.push(currentContent);
        this.historyIndex++;

        // Limit history size (e.g., keep last 50 states)
        const maxHistory = 50;
        if (this.editorHistory.length > maxHistory) {
            this.editorHistory.shift(); // Remove the oldest state
            this.historyIndex--; // Adjust index accordingly
        }
        // console.log("History saved, index:", this.historyIndex, "size:", this.editorHistory.length);
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentEditor.innerHTML = this.editorHistory[this.historyIndex];
            // console.log("Undo, index:", this.historyIndex);
             window.editorToolbar?.updateToolbarState(); // Update toolbar after undo
             window.editorModule?.updateWordCount(); // Update counts
        } else {
             this.app.showToast("Nothing more to undo", "info", 1500);
        }
    }

    redo() {
        if (this.historyIndex < this.editorHistory.length - 1) {
            this.historyIndex++;
            this.currentEditor.innerHTML = this.editorHistory[this.historyIndex];
            // console.log("Redo, index:", this.historyIndex);
             window.editorToolbar?.updateToolbarState(); // Update toolbar after redo
             window.editorModule?.updateWordCount(); // Update counts
        } else {
             this.app.showToast("Nothing more to redo", "info", 1500);
        }
    }

    // --- Utility ---
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Method to update current item reference (called by item manager)
    setCurrentItem(item) {
        this.currentItem = item;
    }

    // Method to clear editor state (called by item manager when closing)
    clearEditorState() {
        this.currentEditor = null;
        this.currentItem = null;
        this.editorHistory = [];
        this.historyIndex = -1;
         // Remove global listeners if necessary, or ensure they check if currentEditor exists
         document.removeEventListener('selectionchange', window.editorToolbar?.updateToolbarState); // Example cleanup
    }
}

// Instantiate and attach to window (or app instance)
if (window.app) {
    window.editorCore = new EditorCore(window.app);
} else {
    console.error("Main app instance not found for EditorCore initialization.");
}
```eof

