// Book & Note Editor Management Module for Shiro Notes
class ItemEditor {
    constructor(app) {
        this.app = app;
        this.currentChapterIndex = undefined; // Track active chapter in book editor
        this.autoSaveTimer = null; // Timer for auto-save functionality
    }

    // --- Entry Points for Editing ---

    editBook(bookId) {
        const book = this.app.data.books.find(b => b.id === bookId);
        if (!book) {
            this.app.showToast("Book not found.", "error");
            return;
        }
        // Check encryption status (handled by app.js before calling this)
        console.log("Editing book:", book.title);
        window.editorCore?.setCurrentItem(book); // Set item reference in core
        this.renderBookEditorUI(book);
    }

    editNote(noteId) {
        const note = this.app.data.notes.find(n => n.id === noteId);
        if (!note) {
            this.app.showToast("Note not found.", "error");
            return;
        }
         // Check encryption status (handled by app.js before calling this)
        console.log("Editing note:", note.title);
        window.editorCore?.setCurrentItem(note); // Set item reference in core
        this.renderNoteEditorUI(note);
    }

    // --- UI Rendering ---

    renderBookEditorUI(book) {
        // Assume app.currentPage is already set to 'books'
        const pageElement = document.getElementById('booksPage');
        if (!pageElement) return;

        // Ensure chapters array exists
         book.chapters = book.chapters || [];
         const hasChapters = book.chapters.length > 0;
         // Select first chapter by default if chapters exist
         this.currentChapterIndex = hasChapters ? 0 : undefined;


        pageElement.innerHTML = `
          <div class="editor-host book-editor"> <!-- Added editor-host class -->
            <div class="book-header">
               <button class="btn btn--secondary btn--sm cover-btn" onclick="window.itemEditor.showCoverModal('${book.id}')" title="Change Cover">
                   ${this.renderBookCoverIcon(book.cover)} Change Cover
               </button>
              <input type="text" class="book-title-input" value="${this.app.escapeHtml(book.title)}" placeholder="Book title..." oninput="window.itemEditor.updateBookTitle(this.value)">
              <div class="book-actions">
                <button class="btn btn--secondary btn--sm" onclick="window.itemEditor.addChapter()" title="Add New Chapter"><i class="fas fa-plus"></i> Add Chapter</button>
                <button class="btn btn--primary btn--sm" onclick="window.itemEditor.saveItem()" title="Save Changes (Ctrl+S)"><i class="fas fa-save"></i> Save</button>
                <button class="btn btn--secondary btn--sm" onclick="window.itemEditor.closeEditor()" title="Close Editor (Esc)"><i class="fas fa-times"></i> Close</button>
              </div>
            </div>

            <div class="book-content">
              <div class="chapters-sidebar">
                <h3>Chapters</h3>
                <div class="chapters-list" id="chaptersList">
                  ${hasChapters ?
                    book.chapters.map((chapter, index) => this.renderChapterListItem(chapter, index)).join('') :
                    '<p class="empty-state-small">No chapters yet</p>'
                  }
                </div>
                 <button class="btn btn--secondary btn--sm add-chapter-sidebar" onclick="window.itemEditor.addChapter()">
                    <i class="fas fa-plus"></i> Add Chapter
                 </button>
              </div>

              <div class="chapter-editor" id="chapterEditorContainer">
                ${hasChapters ? this.renderChapterEditorContent(book.chapters[0], 0) : this.renderEmptyChapterState()}
              </div>
            </div>
          </div>
        `;

        // Initialize the rich text editor instance if a chapter is loaded
        if (hasChapters) {
             const editorWrapper = document.getElementById('chapterContentWrapper'); // Target the wrapper
             if (editorWrapper && window.editorCore) {
                 const editorInstance = window.editorCore.createEditorInstance(editorWrapper, book.chapters[0].content || '');
                 this.setupEditorDependencies(editorInstance); // Connect toolbar etc.
             }
        }
         // Add event listeners for chapter selection etc.
         this.setupBookEditorEventListeners();
    }

     renderBookCoverIcon(cover) {
        const defaultIcon = 'fa-book';
        if (!cover) return `<i class="fas ${defaultIcon} me-1"></i>`;

        switch(cover.type) {
            case 'image': return `<i class="fas fa-image me-1"></i>`; // Show generic image icon
            case 'emoji': return `<span class="me-1">${this.app.escapeHtml(cover.value)}</span>`;
            case 'icon':
            default: return `<i class="${this.app.escapeHtml(cover.value || `fas ${defaultIcon}`)} me-1"></i>`;
        }
     }

     renderChapterListItem(chapter, index) {
        return `
         <div class="chapter-item ${index === this.currentChapterIndex ? 'active' : ''}" data-index="${index}">
             <span class="chapter-title">${this.app.escapeHtml(chapter.title)}</span>
             <button class="chapter-delete" onclick="event.stopPropagation(); window.itemEditor.deleteChapter(${index})" title="Delete Chapter">
               <i class="fas fa-trash"></i>
             </button>
         </div>
         `;
     }

      renderChapterEditorContent(chapter, index) {
          return `
            <input type="text" class="chapter-title-input" value="${this.app.escapeHtml(chapter.title)}" placeholder="Chapter title..." data-index="${index}" oninput="window.itemEditor.updateChapterTitle(${index}, this.value)">
            <div id="chapterContentWrapper" class="editor-content-host">
                <!-- Rich text editor will be created here by createEditorInstance -->
            </div>
          `;
      }

      renderEmptyChapterState() {
          return '<div class="empty-state-full"><i class="fas fa-file-alt fa-3x"></i><p>Select a chapter or add a new one to start writing.</p></div>';
      }

    renderNoteEditorUI(note) {
        const pageElement = document.getElementById('notesPage');
        if (!pageElement) return;

        pageElement.innerHTML = `
          <div class="editor-host note-editor"> <!-- Added editor-host class -->
            <div class="note-header">
              <input type="text" class="note-title-input" value="${this.app.escapeHtml(note.title)}" placeholder="Note title..." oninput="window.itemEditor.updateNoteTitle(this.value)">
               <div class="note-actions">
                 <!-- Share buttons moved here for better visibility -->
                 <button class="btn btn--secondary btn--sm" onclick="window.autoEncryption?.autoEncryptAndShare(window.editorCore?.currentItem, false)" title="Encrypt & Share">
                   <i class="fas fa-share-alt"></i> Share
                 </button>
                 <button class="btn btn--secondary btn--sm btn--danger" onclick="window.autoEncryption?.autoEncryptAndShare(window.editorCore?.currentItem, true)" title="Share once & Delete">
                   <i class="fas fa-fire"></i> Share & Destroy
                 </button>
                 <div class="separator"></div>
                 <button class="btn btn--primary btn--sm" onclick="window.itemEditor.saveItem()" title="Save Note (Ctrl+S)"><i class="fas fa-save"></i> Save</button>
                 <button class="btn btn--secondary btn--sm" onclick="window.itemEditor.closeEditor()" title="Close Editor (Esc)"><i class="fas fa-times"></i> Close</button>
               </div>
            </div>

             <div class="note-meta-bar">
                 <input type="text" class="note-tags" value="${note.tags ? note.tags.join(', ') : ''}" placeholder="Tags (comma separated)..." onchange="window.itemEditor.updateNoteTags(this.value)" title="Add comma-separated tags">
                 <label class="checkbox-label" title="Bookmark this note">
                   <input type="checkbox" ${note.bookmarked ? 'checked' : ''} onchange="window.itemEditor.toggleNoteBookmark(this.checked)">
                   <i class="fas fa-bookmark"></i> Bookmark
                 </label>
                 <label class="checkbox-label" title="Encrypt this note with Master Password">
                   <input type="checkbox" ${note.encrypted ? 'checked' : ''} onchange="window.itemEditor.toggleNoteEncryption(this.checked)">
                    <i class="fas fa-lock"></i> Encrypt
                 </label>
             </div>

            <div id="noteContentWrapper" class="editor-content-host">
                 <!-- Rich text editor will be created here -->
            </div>
          </div>
        `;

        const editorWrapper = document.getElementById('noteContentWrapper');
        if (editorWrapper && window.editorCore) {
            const editorInstance = window.editorCore.createEditorInstance(editorWrapper, note.content || '');
            this.setupEditorDependencies(editorInstance);
        }
         // Add specific event listeners if needed
         this.setupNoteEditorEventListeners();
    }

    // Connects the created editor instance to toolbar, features etc.
     setupEditorDependencies(editorInstance) {
         // Assuming editorModule holds references or methods to connect sub-modules
         if (window.editorModule) {
            window.editorModule.connectEditorInstance(editorInstance);
         } else {
             console.error("Main EditorModule not found to connect dependencies.");
         }
     }

     setupBookEditorEventListeners() {
         const chaptersList = document.getElementById('chaptersList');
         if (chaptersList) {
             chaptersList.addEventListener('click', (e) => {
                 const chapterItem = e.target.closest('.chapter-item');
                 if (chapterItem && chapterItem.dataset.index) {
                     this.selectChapter(parseInt(chapterItem.dataset.index, 10));
                 }
             });
         }
     }

      setupNoteEditorEventListeners() {
          // Add specific listeners for note editor if any are needed beyond the input/change handlers
      }


    // --- Book Management ---

    updateBookTitle(title) {
        const currentItem = window.editorCore?.currentItem;
        if (currentItem && currentItem.chapters !== undefined) { // Check if it's a book
            currentItem.title = title;
            currentItem.lastModified = new Date().toISOString();
            // No save needed here, auto-save handles it or manual save
            window.editorModule?.scheduleAutoSave(true); // Indicate metadata changed
        }
    }

    addChapter() {
        const book = window.editorCore?.currentItem;
        if (!book || book.chapters === undefined) return;

        // Save current chapter content before switching
        this.saveCurrentChapterContent();

        const chapter = {
            id: this.app.generateId(),
            title: `Chapter ${book.chapters.length + 1}`,
            content: '<p><br></p>' // Start with an empty paragraph
        };

        book.chapters.push(chapter);
        book.lastModified = new Date().toISOString();

        // Rerender the chapter list
        this.updateChapterListUI(book.chapters);

        // Select the new chapter
        this.selectChapter(book.chapters.length - 1);

        // Save data immediately after adding chapter structure
         this.app.saveData();
    }

    selectChapter(index) {
        const book = window.editorCore?.currentItem;
        if (!book || book.chapters === undefined || index === this.currentChapterIndex || !book.chapters[index]) return;

        console.log("Selecting chapter:", index);

        // Save current chapter's content before switching
        this.saveCurrentChapterContent();

        this.currentChapterIndex = index;
        const chapter = book.chapters[index];

        // Update active state in UI list
        document.querySelectorAll('.chapter-item').forEach((item) => {
            item.classList.toggle('active', parseInt(item.dataset.index, 10) === index);
        });

        // Render the new chapter editor content
        const editorContainer = document.getElementById('chapterEditorContainer');
        if (editorContainer) {
             editorContainer.innerHTML = this.renderChapterEditorContent(chapter, index);
             // Re-create the rich text editor instance for the new chapter
             const editorWrapper = document.getElementById('chapterContentWrapper');
             if (editorWrapper && window.editorCore) {
                const editorInstance = window.editorCore.createEditorInstance(editorWrapper, chapter.content || '');
                this.setupEditorDependencies(editorInstance);
             }
        }
    }


    updateChapterTitle(index, title) {
        const book = window.editorCore?.currentItem;
        if (book?.chapters?.[index]) {
            book.chapters[index].title = title;
            book.lastModified = new Date().toISOString();
            // Update title in sidebar list immediately
            const listItem = document.querySelector(`.chapter-item[data-index="${index}"] .chapter-title`);
            if (listItem) {
                listItem.textContent = title;
            }
             window.editorModule?.scheduleAutoSave(true); // Indicate metadata changed
        }
    }

    deleteChapter(index) {
        const book = window.editorCore?.currentItem;
        if (!book || !book.chapters?.[index]) return;

         const chapterTitle = book.chapters[index].title;

        if (confirm(`Are you sure you want to delete "${chapterTitle}"?`)) {
            book.chapters.splice(index, 1);
            book.lastModified = new Date().toISOString();

            // Rerender the chapter list
             this.updateChapterListUI(book.chapters);


             // Decide what to show next
            if (book.chapters.length === 0) {
                 // No chapters left
                 this.currentChapterIndex = undefined;
                 const editorContainer = document.getElementById('chapterEditorContainer');
                 if(editorContainer) editorContainer.innerHTML = this.renderEmptyChapterState();
                  window.editorCore?.createEditorInstance(null); // Detach core editor
            } else if (index === this.currentChapterIndex) {
                 // If we deleted the active chapter, select the previous or first one
                 const newIndex = Math.max(0, index - 1);
                 this.selectChapter(newIndex);
            } else if (index < this.currentChapterIndex) {
                 // If we deleted a chapter before the current one, adjust index
                 this.currentChapterIndex--;
                  // Update active state in UI list based on the *new* index
                 document.querySelectorAll('.chapter-item').forEach((item) => {
                     item.classList.toggle('active', parseInt(item.dataset.index, 10) === this.currentChapterIndex);
                 });
            }
             // If deleted after current, index remains correct.

            // Save data immediately after deletion
             this.app.saveData();
             this.app.showToast("Chapter deleted.", "success");
        }
    }

     updateChapterListUI(chapters) {
         const chaptersList = document.getElementById('chaptersList');
         if (chaptersList) {
             if (chapters.length > 0) {
                 chaptersList.innerHTML = chapters.map((chap, idx) => this.renderChapterListItem(chap, idx)).join('');
             } else {
                 chaptersList.innerHTML = '<p class="empty-state-small">No chapters yet</p>';
             }
         }
     }

    saveCurrentChapterContent() {
        const book = window.editorCore?.currentItem;
        const editor = window.editorCore?.currentEditor;
        if (book?.chapters && this.currentChapterIndex !== undefined && editor) {
            if (book.chapters[this.currentChapterIndex]) {
                 book.chapters[this.currentChapterIndex].content = editor.innerHTML;
                 // console.log("Saved content for chapter:", this.currentChapterIndex);
            }
        }
    }

    // --- Note Management ---

    updateNoteTitle(title) {
        const currentItem = window.editorCore?.currentItem;
        if (currentItem && currentItem.chapters === undefined) { // Check it's a note
            currentItem.title = title;
            currentItem.lastModified = new Date().toISOString();
            window.editorModule?.scheduleAutoSave(true); // Indicate metadata changed
        }
    }

    updateNoteTags(tagsString) {
        const currentItem = window.editorCore?.currentItem;
        if (currentItem && currentItem.chapters === undefined) {
            currentItem.tags = tagsString ? tagsString.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag) : [];
            currentItem.lastModified = new Date().toISOString();
            window.editorModule?.scheduleAutoSave(true); // Indicate metadata changed
        }
    }

    toggleNoteBookmark(isBookmarked) {
        const currentItem = window.editorCore?.currentItem;
        if (currentItem && currentItem.chapters === undefined) {
            currentItem.bookmarked = isBookmarked;
            currentItem.lastModified = new Date().toISOString();
            window.editorModule?.scheduleAutoSave(true); // Indicate metadata changed
             this.app.showToast(isBookmarked ? 'Note bookmarked' : 'Bookmark removed', 'info', 1500);
        }
    }

    toggleNoteEncryption(shouldEncrypt) {
        const currentItem = window.editorCore?.currentItem;
        if (!currentItem || currentItem.chapters !== undefined) return; // Only for notes

         // Ensure master password exists if trying to encrypt
        if (shouldEncrypt && !this.app.data.settings.masterPasswordHash) {
             this.app.showToast('Please set a Master Password in Security settings before encrypting items.', 'error');
             // Revert checkbox
             const checkbox = document.querySelector('.note-meta-bar input[type="checkbox"][onchange*="toggleNoteEncryption"]');
             if(checkbox) checkbox.checked = false;
             return;
        }

        currentItem.encrypted = shouldEncrypt;
        currentItem.lastModified = new Date().toISOString();
         window.editorModule?.scheduleAutoSave(true); // Indicate metadata changed
        this.app.showToast(`Note will be ${shouldEncrypt ? 'encrypted' : 'decrypted'} on save.`, 'info');
    }


    // --- Common Save & Close ---

    async saveItem() {
        const currentItem = window.editorCore?.currentItem;
        const editor = window.editorCore?.currentEditor;
        if (!currentItem || !editor) {
             this.app.showToast('Nothing to save.', 'info');
             return;
        }

         window.editorModule?.updateAutoSaveStatus('Saving...');

        // Save current editor content to the correct place (note content or current chapter)
        if (currentItem.chapters !== undefined) { // It's a book
            this.saveCurrentChapterContent();
        } else { // It's a note
            currentItem.content = editor.innerHTML;
        }

        currentItem.lastModified = new Date().toISOString();

        // --- Handle Encryption/Decryption on Save ---
         let needsPassword = false;
         let operation = null; // 'encrypt' or 'decrypt'

         // Check if encryption status changed
         const originalItem = currentItem.chapters === undefined
             ? this.app.data.notes.find(n => n.id === currentItem.id)
             : this.app.data.books.find(b => b.id === currentItem.id);

          if (originalItem) {
             if (currentItem.encrypted && !originalItem.encrypted) {
                 needsPassword = true;
                 operation = 'encrypt';
             } else if (!currentItem.encrypted && originalItem.encrypted) {
                 needsPassword = true;
                 operation = 'decrypt';
             } else if (currentItem.encrypted && originalItem.encrypted){
                 // If already encrypted and saving changes, we still need to re-encrypt
                  needsPassword = true;
                  operation = 'encrypt'; // Re-encrypt existing encrypted item
             }
         } else if (currentItem.encrypted) {
              // New item marked for encryption
             needsPassword = true;
             operation = 'encrypt';
         }

         if (needsPassword) {
             if (!this.app.data.settings.masterPasswordHash) {
                 this.app.showToast('Cannot save: Master Password required for encryption/decryption.', 'error');
                 window.editorModule?.updateAutoSaveStatus('Save Failed');
                 return;
             }
             // Prompt for password securely (using a modal is better than prompt)
             const password = prompt(`Enter Master Password to ${operation} "${currentItem.title}":`);
             if (!password) {
                 this.app.showToast('Save cancelled.', 'warning');
                 window.editorModule?.updateAutoSaveStatus('Save Cancelled');
                 return; // Cancelled
             }
             try {
                 this.app.showLoading("Verifying...");
                 const enteredHash = await window.cryptoModule.hash(password);
                 if (enteredHash !== this.app.data.settings.masterPasswordHash) {
                     throw new Error('Incorrect Master Password');
                 }
                 this.app.hideLoading();

                 // Perform the operation
                 this.app.showLoading(operation === 'encrypt' ? "Encrypting..." : "Decrypting...");
                 if (operation === 'encrypt') {
                     // Encrypt note content or ALL chapter contents for a book
                     if (currentItem.chapters !== undefined) { // Book
                         for (const chapter of currentItem.chapters) {
                             chapter.content = await window.cryptoModule.encrypt(chapter.content, password);
                         }
                     } else { // Note
                         currentItem.content = await window.cryptoModule.encrypt(currentItem.content, password);
                     }
                 } else { // Decrypt
                      if (currentItem.chapters !== undefined) { // Book
                         for (const chapter of currentItem.chapters) {
                             // Assume content is currently encrypted string
                              chapter.content = await window.cryptoModule.decrypt(chapter.content, password);
                         }
                     } else { // Note
                          // Assume content is currently encrypted string
                         currentItem.content = await window.cryptoModule.decrypt(currentItem.content, password);
                     }
                 }
                  this.app.hideLoading();

             } catch (error) {
                 this.app.hideLoading();
                 console.error(`${operation} error:`, error);
                 this.app.showToast(`${operation === 'encrypt' ? 'Encryption' : 'Decryption'} failed: ${error.message}`, 'error');
                 window.editorModule?.updateAutoSaveStatus('Save Failed');
                  // IMPORTANT: Revert the item's content and encrypted status in memory
                  // This is complex, might need to reload original item state
                 return; // Stop save process
             }
         }
        // --- End Encryption Handling ---


        // Update the item in the main data array
        let dataArray = currentItem.chapters === undefined ? this.app.data.notes : this.app.data.books;
        const index = dataArray.findIndex(item => item.id === currentItem.id);
        if (index !== -1) {
            // Update existing item - merge new data carefully
            // Clone to avoid direct mutation issues if save fails later
            dataArray[index] = JSON.parse(JSON.stringify(currentItem));
        } else {
             // Add new item (shouldn't happen often here, creation happens elsewhere)
             dataArray.push(JSON.parse(JSON.stringify(currentItem)));
        }


        this.app.saveData(); // Save all data to localStorage
        this.app.updateUI();   // Update global UI elements like counts
        window.editorModule?.updateAutoSaveStatus('Saved');
        this.app.showToast('Item saved successfully', 'success');

        // If content was decrypted on save, reload editor with decrypted content
         if (operation === 'decrypt') {
             if (currentItem.chapters !== undefined) {
                 this.renderBookEditorUI(currentItem); // Re-render book editor
             } else {
                 this.renderNoteEditorUI(currentItem); // Re-render note editor
             }
         }
         // If encrypted, the editor still shows plain text until closed/reopened
    }


    closeEditor() {
        // Ask confirmation if there are unsaved changes (more complex to implement reliably)
        // For now, just save before closing
        this.saveItem().then(() => { // Ensure save completes if async (encryption)
            const currentItem = window.editorCore?.currentItem;
            const itemType = currentItem?.chapters === undefined ? 'notes' : 'books';

            // Clear editor state in core module
            window.editorCore?.clearEditorState();
             window.editorModule?.clearAutoSaveTimer(); // Clear timer in main module

            // Navigate back to the list page
            this.app.showPage(itemType);

            console.log("Editor closed.");
        }).catch(error => {
            console.error("Error during save on close:", error);
            // Decide if we should still close or keep editor open
             if (confirm("Could not save changes. Close anyway?")) {
                 window.editorCore?.clearEditorState();
                 window.editorModule?.clearAutoSaveTimer();
                 const currentItem = window.editorCore?.currentItem;
                 const itemType = currentItem?.chapters === undefined ? 'notes' : 'books';
                 this.app.showPage(itemType);
             }
        });
    }

      // --- Cover Modal --- (Keep simple UI logic here)
      showCoverModal(bookId) {
        const book = this.app.data.books.find(b => b.id === bookId);
        if (!book) return;

        // Save selection just in case modal interaction affects it
        window.editorFeatures?.saveSelection();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
          <div class="modal-content cover-modal">
            <div class="modal-header">
              <h3>Choose Book Cover</h3>
              <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div class="cover-options">
                <h4>Default Icons</h4>
                <div class="icon-grid">
                  ${['fas fa-book', 'fas fa-feather-alt', 'fas fa-lightbulb', 'fas fa-brain', 'fas fa-atom', 'fas fa-flask', 'fas fa-code', 'fas fa-briefcase', 'fas fa-heart', 'fas fa-star', 'fas fa-leaf', 'fas fa-compass', 'fas fa-map', 'fas fa-globe-americas', 'fas fa-scroll', 'fas fa-palette'].map(icon => `
                    <button class="icon-choice" data-type="icon" data-value="${icon}" title="${icon.replace('fas fa-','')}"><i class="${icon}"></i></button>
                  `).join('')}
                </div>

                <h4>Emoji</h4>
                <div class="form-group emoji-group">
                  <input type="text" id="emojiInput" placeholder="Enter or paste an emoji..." maxlength="2">
                  <button class="btn btn--secondary btn--sm" id="setEmojiBtn">Set Emoji</button>
                </div>

                <h4>Upload Image</h4>
                <div class="form-group upload-group">
                  <label for="coverUpload" class="btn btn--secondary btn--sm"><i class="fas fa-upload"></i> Choose Image...</label>
                  <input type="file" id="coverUpload" accept="image/*" class="hidden">
                  <span id="uploadFileName">No file chosen</span>
                </div>
              </div>
            </div>
             <div class="modal-footer">
                <button class="btn btn--secondary" id="closeCoverModalBtn">Cancel</button>
             </div>
          </div>
        `;
        document.body.appendChild(modal);
         setTimeout(() => modal.classList.add('visible'), 10);

        const closeModal = () => {
             modal.remove();
             window.editorFeatures?.restoreSelection();
        };

        // Event listeners for the modal
        modal.querySelector('.close-btn').onclick = closeModal;
        modal.querySelector('#closeCoverModalBtn').onclick = closeModal;

        modal.querySelectorAll('.icon-choice').forEach(btn => {
          btn.onclick = () => {
            book.cover = { type: 'icon', value: btn.dataset.value };
            this.app.saveData();
            this.renderBookEditorUI(book); // Re-render editor header
            closeModal();
          };
        });

        modal.querySelector('#setEmojiBtn').onclick = () => {
          const emojiInput = modal.querySelector('#emojiInput');
          const emoji = emojiInput.value.trim();
          // Basic check if it looks like an emoji (very rudimentary)
          if (emoji && /\p{Emoji}/u.test(emoji)) {
            book.cover = { type: 'emoji', value: emoji.slice(0, 2) }; // Limit length just in case
            this.app.saveData();
            this.renderBookEditorUI(book);
            closeModal();
          } else {
              this.app.showToast("Please enter a valid emoji.", "warning");
              emojiInput.focus();
          }
        };

         const coverUploadInput = modal.querySelector('#coverUpload');
         const uploadFileNameSpan = modal.querySelector('#uploadFileName');
        coverUploadInput.onchange = (e) => this.handleCoverUpload(e, book, modal, uploadFileNameSpan);

     }

      handleCoverUpload(event, book, modal, fileNameSpan) {
        const file = event.target.files[0];
        if (!file) {
            fileNameSpan.textContent = "No file chosen";
            return;
        }

         const maxSize = 2 * 1024 * 1024; // 2MB limit
         if (file.size > maxSize) {
            this.app.showToast(`Image too large (Max ${maxSize / 1024 / 1024}MB).`, 'error');
            event.target.value = ''; // Reset file input
            fileNameSpan.textContent = "File too large";
            return;
         }

         fileNameSpan.textContent = this.app.escapeHtml(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
          book.cover = { type: 'image', value: e.target.result }; // Store as base64
          this.app.saveData();
          this.renderBookEditorUI(book);
          modal.remove(); // Close modal on success
          window.editorFeatures?.restoreSelection();
        };
         reader.onerror = () => {
             this.app.showToast('Error reading image file.', 'error');
              fileNameSpan.textContent = "Error reading file";
              window.editorFeatures?.restoreSelection();
         };
        reader.readAsDataURL(file);
      }

} // End of ItemEditor class

// Instantiate and attach to window
if (window.app) {
    window.itemEditor = new ItemEditor(window.app);
     // Connect relevant app functions if needed
     app.createBook = () => window.itemEditor.createBook(); // Or keep in app.js if preferred
     app.createNote = () => window.itemEditor.createNote(); // Or keep in app.js
} else {
    console.error("Main app instance not found for ItemEditor initialization.");
}
    
