// Rich Text Editor Module Coordinator for Shiro Notes
class EditorModule {
    constructor(app) {
        this.app = app;

        // Sub-module references (assuming they are globally available)
        this.core = window.editorCore;
        this.toolbar = window.editorToolbar;
        this.features = window.editorFeatures;
        this.itemManager = window.itemEditor; // Handles Book/Note specific logic

        this.currentEditorInstance = null; // Reference to the current contenteditable div
        this.currentItem = null; // Reference to the book/note object being edited
        this.autoSaveTimer = null;
        this.isEditing = false; // Flag if an editor is currently active

        this.init();
    }

    init() {
        // Basic initialization, sub-modules handle their own setup
        console.log("Editor Module Coordinator Initialized");
        // Inject editor-specific CSS (keeping this here for now)
        this.injectEditorStyles();
    }

    // --- Public Methods Called by App ---

    createNewBook() {
        if (!this.itemManager) return console.error("Item Editor not loaded");
        this.isEditing = true;
        this.itemManager.createNewBook();
        // Item manager will call createEditor internally
    }

    createNewNote() {
        if (!this.itemManager) return console.error("Item Editor not loaded");
        this.isEditing = true;
        this.itemManager.createNewNote();
        // Item manager will call createEditor internally
    }

    editBook(bookId) {
        if (!this.itemManager) return console.error("Item Editor not loaded");
        this.isEditing = true;
        this.currentItem = this.app.data.books.find(b => b.id === bookId);
        if (this.currentItem) {
            this.itemManager.editBook(bookId);
            // Item manager will call createEditor internally
        } else {
             this.isEditing = false;
             this.app.showToast("Book not found", "error");
        }
    }

    editNote(noteId) {
        if (!this.itemManager) return console.error("Item Editor not loaded");
        this.isEditing = true;
        this.currentItem = this.app.data.notes.find(n => n.id === noteId);
         if (this.currentItem) {
            this.itemManager.editNote(noteId);
            // Item manager will call createEditor internally
        } else {
             this.isEditing = false;
             this.app.showToast("Note not found", "error");
        }
    }

    // --- Editor Lifecycle & Coordination ---

    // Called by item_editor.js after it creates the editor structure
    registerEditorInstance(editorElement, item) {
        if (!this.core || !this.toolbar) {
             console.error("Core or Toolbar module not ready for registration.");
             return;
        }
        this.currentEditorInstance = editorElement;
        this.currentItem = item;
        this.core.currentEditor = editorElement; // Link core to the element
        this.core.currentItem = item;           // Link core to the item
        this.core.resetHistory(item.content || ''); // Initialize history
        this.toolbar.setEditor(editorElement); // Link toolbar to the element
        this.toolbar.updateToolbarState();     // Set initial toolbar state
        this.features.setEditor(editorElement); // Link features to the element
        this.updateWordCount();
        this.startAutoSave();
        this.isEditing = true;
        console.log("Editor instance registered for item:", item.id);
    }

    // --- Auto-Save ---

    startAutoSave() {
        this.scheduleAutoSave(); // Start the timer loop
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimer);
        if (!this.isEditing || !this.currentItem) return; // Don't save if not editing

        this.updateAutoSaveStatus('Saving...');
        this.autoSaveTimer = setTimeout(() => {
            this.autoSave();
        }, 3000); // Auto-save after 3 seconds of inactivity
    }

    autoSave() {
        if (!this.isEditing || !this.currentItem || !this.currentEditorInstance) return;

        // Get content from the core module's perspective (it holds the reference)
        const currentContent = this.core.currentEditor?.innerHTML;
        if (currentContent === undefined) return; // Editor might have been closed quickly

        // Check if content actually changed before saving
        const itemIsBookChapter = this.currentItem.chapters && this.itemManager?.currentChapterIndex !== undefined;
        let originalContent = '';
        if (itemIsBookChapter) {
             originalContent = this.currentItem.chapters[this.itemManager.currentChapterIndex]?.content || '';
        } else {
             originalContent = this.currentItem.content || '';
        }

        if (currentContent !== originalContent) {
            console.log("Auto-saving changes...");
            // Delegate saving logic to itemManager
            this.itemManager.updateItemContent(currentContent); // Update content in data structure
            this.app.saveData(); // Save the main app data
            this.updateAutoSaveStatus('Auto-saved');
        } else {
            // console.log("Auto-save skipped, no changes.");
            this.updateAutoSaveStatus('Saved'); // Indicate it's up-to-date
        }
    }

    updateAutoSaveStatus(status) {
        const statusEl = document.getElementById('autoSaveStatus');
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = status === 'Saving...' ? 'saving' : 'saved';
        }
    }

    // --- Save & Close ---

    saveItem() {
        clearTimeout(this.autoSaveTimer); // Clear pending auto-save
        if (!this.isEditing || !this.currentItem || !this.core || !this.itemManager) return;
        console.log("Manual save triggered.");

        const currentContent = this.core.currentEditor?.innerHTML;
        if (currentContent !== undefined) {
             // Let itemManager handle updating the correct content field (note or chapter)
             this.itemManager.updateItemContent(currentContent);
        }
        // ItemManager handles updating lastModified and calling app.saveData()
        this.itemManager.saveItemMetadata(); // Ensures title, tags etc. are saved too
        this.updateAutoSaveStatus('Saved');
        this.app.showToast('Item saved successfully', 'success');
        this.app.updateUI(); // Refresh lists etc. in main app UI
    }

    closeEditor() {
         if (!this.isEditing) return; // Prevent double close
         console.log("Closing editor...");

        this.saveItem(); // Ensure last changes are saved
        this.isEditing = false;
        this.currentItem = null;
        this.currentEditorInstance = null;
        clearTimeout(this.autoSaveTimer);

        // Clean up sub-modules
        this.core?.clearEditorState();
        this.toolbar?.clearEditorState();
        this.features?.clearEditorState();
        this.itemManager?.clearEditorState(); // Let item manager handle specific cleanup

        // Exit fullscreen if active (using feature module)
        this.features?.exitFullscreenIfActive();

        // Navigate back (handled by itemManager's close function typically)
         // Assuming itemManager.closeEditor() calls app.showPage(...)
        console.log("Editor closed.");
    }

    // --- Other Coordinated Features ---

    // Word Count (called by core on input)
    updateWordCount() {
        if (!this.isEditing || !this.currentEditorInstance) return;
        this.features?.updateWordCount(this.currentEditorInstance);
    }

    // --- Style Injection ---
    injectEditorStyles() {
        // Keeping the style injection here as it applies globally to the editor component
        const editorStyles = `
            /* Styles from previous editor.css file go here */
            /* ... (omitted for brevity, include the full CSS here) ... */

            /* Example start: */
            .editor-container {
              display: flex;
              flex-direction: column;
              /* Make height relative to parent page, not fixed vh */
              height: 100%; /* Fill the container it's placed in */
              min-height: 400px; /* Ensure a minimum usable height */
              border: 1px solid var(--color-card-border);
              border-radius: var(--radius-lg);
              overflow: hidden;
              background-color: var(--color-surface);
            }

           .editor-container.fullscreen {
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              width: 100%; height: 100%;
              z-index: 1000;
              border-radius: 0;
              min-height: 100vh; /* Ensure fullscreen takes full height */
            }

            .editor-toolbar {
                display: flex;
                align-items: center;
                padding: var(--space-2) var(--space-4);
                background-color: var(--color-background);
                border-bottom: 1px solid var(--color-card-border);
                flex-wrap: wrap; /* Allow wrapping */
                gap: var(--space-1);
                overflow-x: auto; /* Scroll horizontally if needed */
                flex-shrink: 0; /* Prevent toolbar from shrinking */
            }
            /* ... include ALL styles from the previous editor.css ... */

             /* Book Editor Styles */
            .book-editor { display: flex; flex-direction: column; height: 100%; }
            /* ... etc ... */

             /* Note Editor Styles */
            .note-editor { display: flex; flex-direction: column; height: 100%; }
             /* ... etc ... */

             /* Statistics Modal */
            .stats-grid { display: grid; /* ... */ }
             /* ... etc ... */
        `;
        const editorStyleSheet = document.createElement('style');
        editorStyleSheet.textContent = editorStyles;
        document.head.appendChild(editorStyleSheet);
    }

} // End of EditorModule class

// Initialize editor module coordinator
if (window.app) {
    window.editorModule = new EditorModule(window.app);
    // Now link sub-modules to the main module if needed
    if (window.itemEditor) window.itemEditor.setMainModule(window.editorModule);
    if (window.editorFeatures) window.editorFeatures.setMainModule(window.editorModule);
    // Core and Toolbar don't strictly need a back-reference for this structure
} else {
    console.error("Main app instance not found for EditorModule initialization.");
}
