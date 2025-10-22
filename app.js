// Main Application Logic for Shiro Notes
class ShiroNotes {
    constructor() {
        // --- Core Data Structure ---
        this.data = {
            books: [],
            notes: [],
            events: [],
            settings: {
                theme: 'auto', // 'light', 'dark', 'auto'
                autoLock: false,
                lockTimeout: 300000, // 5 minutes in milliseconds
                masterPasswordHash: null, // Store hash of the master password
                profile: {
                    name: '',
                    email: '',
                    bio: '',
                    avatar: null // Base64 Data URL or null
                }
                // passcode is deprecated, replaced by masterPasswordHash
            },
            bookmarks: [], // IDs of bookmarked items (used for filtering)
            tags: [], // Could be dynamically generated or a stored list
            templates: [] // Array of template objects
        };

        // --- Application State ---
        this.currentPage = 'dashboard';
        this.isLocked = false;
        this.lockTimer = null;
        this.sidebarCollapsed = false; // Tracks UI state

        // --- Initialization ---
        // Make the instance globally available EARLY
        window.app = this;
        // Start the initialization process
        this.init();
    }

    // --- Initialization Sequence ---
    async init() {
        console.log("ShiroNotes Initializing...");
        try {
            await this.loadData(); // Load saved data from localStorage
            this.setupBaseEventListeners(); // Setup basic listeners needed before full UI init
            // Note: UI Initialization (theme, sidebar state) is now called from ui.js via the hook below
            if (window.uiModule) {
                 window.uiModule.initUI(); // Initialize theme, sidebar state etc.
            } else {
                 console.error("UI Module not found during init!");
                 // Fallback basic theme init if UI module failed
                 this.setFallbackTheme();
            }
             this.checkLockStatus(); // Check if master password is set, potentially lock
            this.updateUI(); // Initial UI rendering (stats, sidebar counts)
            this.setupKeyboardShortcuts(); // Handled by keyboard.js

            // Initial page load
             if (this.currentPage) {
                 this.showPage(this.currentPage);
             } else {
                 this.showPage('dashboard'); // Fallback to dashboard
             }

            console.log("ShiroNotes Initialization Complete.");
             // Use uiModule for toasts now
             this.showToast('Welcome to Shiro Notes!', 'success');

        } catch (error) {
            console.error('FATAL: ShiroNotes Initialization Failed:', error);
            // Display a user-friendly error message if possible
            document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Initialization Error</h1><p>Shiro Notes could not start. Please check the console for details or try clearing application data.</p></div>';
        }
    }

    // --- Data Management ---
    async loadData() {
        console.log("Loading data...");
        try {
            const savedData = localStorage.getItem('shiroNotesData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                // Deep merge settings to avoid losing new default settings
                if (parsedData.settings) {
                    parsedData.settings = { ...this.data.settings, ...parsedData.settings };
                    // Ensure nested profile object is also merged
                     if (parsedData.settings.profile) {
                         parsedData.settings.profile = { ...this.data.settings.profile, ...parsedData.settings.profile };
                     } else {
                         parsedData.settings.profile = this.data.settings.profile; // Ensure profile exists
                     }
                }
                // Merge top-level data
                this.data = { ...this.data, ...parsedData };

                // --- Migration/Cleanup ---
                // Remove deprecated passcode if masterPasswordHash exists
                if (this.data.settings.masterPasswordHash && this.data.settings.passcode) {
                    delete this.data.settings.passcode;
                    console.log("Migrated: Removed old passcode setting.");
                }
                 // Ensure chapters array exists for books
                 this.data.books.forEach(book => {
                     if (!Array.isArray(book.chapters)) book.chapters = [];
                     // Ensure cover object exists
                     if (typeof book.cover !== 'object' || book.cover === null) {
                         book.cover = { type: 'icon', value: 'fas fa-book' };
                     }
                 });
                 // Ensure notes have a type
                 this.data.notes.forEach(note => {
                     if (!note.type) note.type = 'text';
                 });

                console.log("Data loaded successfully.");
            } else {
                console.log("No saved data found, using defaults.");
            }

            // Initialize default templates if none exist
            if (!this.data.templates || this.data.templates.length === 0) {
                this.initializeDefaultTemplates();
                console.log("Initialized default templates.");
            }

        } catch (error) {
            console.error('Error loading data:', error);
             this.showToast('Error loading data. Using defaults.', 'error');
            // Reset to defaults on parse error? Be careful not to wipe user data unintentionally.
            // Consider a backup mechanism or informing the user.
        }
    }

    saveData() {
        try {
            localStorage.setItem('shiroNotesData', JSON.stringify(this.data));
            // Optional: Data integrity check (handled by security module if needed)
            // window.securityModule?.verifyDataIntegrity();
        } catch (error) {
            console.error('Error saving data:', error);
             this.showToast('Error saving data', 'error');
            // Handle potential storage quota exceeded error
            if (error.name === 'QuotaExceededError') {
                 this.showToast('Storage limit reached! Cannot save data.', 'error');
            }
        }
    }

    // --- Basic Event Listeners (Needed before full UI init) ---
     setupBaseEventListeners() {
         // Sidebar Toggle
         document.getElementById('sidebarToggle')?.addEventListener('click', () => {
             this.toggleSidebar(); // Use uiModule via app method overload
         });

         // Mobile Menu Button
         document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
             this.toggleMobileSidebar(); // Use uiModule via app method overload
         });

         // --- Top Bar Actions ---
         document.getElementById('quickNote')?.addEventListener('click', () => {
             this.showQuickNote(); // Use uiModule via app method overload
         });
         document.getElementById('fullScreenBtn')?.addEventListener('click', () => {
              this.toggleFullScreen(); // Use uiModule via app method overload
         });

         // Quick Search (Basic Input Handling - more advanced logic in search.js)
         const quickSearchInput = document.getElementById('quickSearch');
         if (quickSearchInput) {
             quickSearchInput.addEventListener('input', (e) => {
                 // Delegate to search module's handler if available
                 if (window.searchModule?.handleQuickSearchInput) {
                     window.searchModule.handleQuickSearchInput(e.target.value);
                 } else {
                     // Basic fallback if search module not loaded/refactored yet
                     console.log("Quick search input:", e.target.value);
                 }
             });
             quickSearchInput.addEventListener('keydown', (e) => {
                 if (e.key === 'Enter') {
                     if (window.searchModule?.performSearch) {
                         window.searchModule.performSearch(e.target.value);
                         this.showPage('search'); // Navigate to search page on Enter
                     }
                 }
             });
         }


         // Activity tracking for auto-lock timer reset
         ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
             document.addEventListener(eventType, () => {
                 this.resetLockTimer();
             }, { passive: true });
         });

         // Navigation (using event delegation on the sidebar nav)
         const sidebarNav = document.querySelector('.sidebar-nav');
         if (sidebarNav) {
             sidebarNav.addEventListener('click', (e) => {
                 const navButton = e.target.closest('.nav-item[data-page]');
                 if (navButton) {
                     e.preventDefault();
                     const page = navButton.getAttribute('data-page');
                     this.showPage(page);
                 }
             });
         }
         // Footer navigation (Profile)
          const sidebarFooter = document.querySelector('.sidebar-footer');
          if (sidebarFooter) {
              sidebarFooter.addEventListener('click', (e) => {
                  const profileButton = e.target.closest('.nav-item[data-page="profile"]');
                  if (profileButton) {
                      e.preventDefault();
                      this.showPage('profile');
                  }
              });
          }
     }

     // Deprecated/Moved: setupKeyboardShortcuts is now handled by keyboard.js
     setupKeyboardShortcuts() {
          console.log("Keyboard shortcuts managed by KeyboardModule.");
     }

    // --- Lock Screen Management ---
    checkLockStatus() {
         // Simplified: If a master password is set, assume it might need locking on inactivity
         // Actual locking/unlocking UI is handled by security.js showing modals
         if (this.data.settings.masterPasswordHash && this.data.settings.autoLock) {
             console.log("Auto-lock enabled.");
             this.resetLockTimer(); // Start the timer
         } else {
              console.log("Auto-lock disabled or no master password set.");
         }
    }

     resetLockTimer() {
         if (this.isLocked || !this.data.settings.autoLock || !this.data.settings.masterPasswordHash) {
             clearTimeout(this.lockTimer); // Clear any existing timer if conditions aren't met
             return;
         }
         clearTimeout(this.lockTimer);
         this.lockTimer = setTimeout(() => {
             this.lockApp();
         }, this.data.settings.lockTimeout);
         // console.log("Lock timer reset.");
     }

     lockApp() {
          if (this.isLocked || !this.data.settings.masterPasswordHash) return;
          console.log("Locking app due to inactivity or manual trigger.");
          this.isLocked = true;
          // Delegate showing the lock UI to the security module
          if (window.securityModule?.showLockScreen) {
              window.securityModule.showLockScreen();
          } else {
               console.error("Security module or showLockScreen function not found!");
          }
          clearTimeout(this.lockTimer); // Stop timer when locked
     }

     unlockApp() {
          if (!this.isLocked) return;
          console.log("Unlocking app.");
          this.isLocked = false;
          this.resetLockTimer(); // Restart inactivity timer
          // UI hiding is handled within securityModule.js upon successful unlock
     }

    // --- Navigation ---
    showPage(pageId) {
        if (this.isLocked) {
             this.showToast('App is locked. Please unlock first.', 'warning');
             return; // Don't navigate when locked
        }
        console.log(`Navigating to page: ${pageId}`);

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(pageId + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;

            // Update UI elements (handled by uiModule now)
             if (window.uiModule) {
                 const pageTitle = this.getPageTitle(pageId);
                 window.uiModule.updateBreadcrumb(pageTitle);
                 window.uiModule.updateActiveNavItem(pageId);
             }

            // Load specific page content
            this.loadPageContent(pageId);
        } else {
             console.error(`Page element not found for pageId: ${pageId}Page`);
             this.showPage('dashboard'); // Fallback to dashboard on error
             return; // Stop execution if page not found
        }

        // Close mobile sidebar after navigation
         this.closeMobileSidebar(); // Use uiModule via app method overload
    }

    getPageTitle(pageId) {
        const titles = {
            dashboard: 'Dashboard',
            books: 'Books',
            notes: 'All Notes',
            canvas: 'Canvas',
            audio: 'Audio Notes',
            search: 'Search',
            bookmarks: 'Bookmarks',
            tags: 'Tags',
            templates: 'Templates',
            scheduler: 'Calendar',
            export: 'Export & Backup', // Updated title
            security: 'Security Settings', // Updated title
            profile: 'Profile & Settings' // Updated title
        };
        // Capitalize first letter as a fallback
        return titles[pageId] || pageId.charAt(0).toUpperCase() + pageId.slice(1);
    }

    loadPageContent(pageId) {
         if (this.isLocked) return; // Prevent loading content when locked

        const pageElement = document.getElementById(pageId + 'Page');
         if (!pageElement) {
              console.error(`Cannot load content: Page element #${pageId}Page not found.`);
              return;
         }

         console.log(`Loading content for: ${pageId}`);

        // Clear previous content? Maybe not necessary if pages are just hidden/shown
        // pageElement.innerHTML = ''; // Consider implications for complex modules like editor/canvas

        try {
            switch (pageId) {
                case 'dashboard':
                    // Delegate to dashboard module
                    window.dashboardModule?.loadDashboardContent(pageElement);
                    break;
                case 'books':
                    this.renderBooksPage(pageElement);
                    break;
                case 'notes':
                    this.renderNotesPage(pageElement);
                    break;
                case 'canvas':
                    // Structure is minimal, coordinator handles init
                    pageElement.innerHTML = `
                        <div class="canvas-container">
                            <div class="canvas-toolbar"></div>
                            <div class="canvas-wrapper"><canvas id="drawingCanvas"></canvas></div>
                        </div>`;
                    window.canvasModule?.initCanvas();
                    break;
                case 'audio':
                     // Delegate to audio module (assuming it handles innerHTML)
                     if (window.audioModule?.loadAudioPageContent) {
                         window.audioModule.loadAudioPageContent(pageElement);
                     } else {
                         // Fallback basic structure if module/method doesn't exist
                         pageElement.innerHTML = `<h2>Audio Notes</h2><p>Audio module content goes here.</p>`;
                         console.warn("audioModule.loadAudioPageContent not found.");
                     }
                    break;
                case 'search':
                    // Delegate to search module
                    window.searchModule?.loadSearchPage(pageElement);
                    break;
                 case 'bookmarks':
                     this.renderBookmarksPage(pageElement);
                     break;
                 case 'tags':
                     this.renderTagsPage(pageElement);
                     break;
                case 'templates':
                    // Delegate to templates module
                     if (window.templatesModule?.loadTemplatesPageContent) {
                          window.templatesModule.loadTemplatesPageContent(pageElement);
                     } else {
                          pageElement.innerHTML = `<h2>Templates</h2><p>Template module content goes here.</p>`;
                          console.warn("templatesModule.loadTemplatesPageContent not found.");
                     }
                    break;
                case 'scheduler':
                    // Delegate to scheduler module
                     if (window.schedulerModule?.loadSchedulerPageContent) {
                          window.schedulerModule.loadSchedulerPageContent(pageElement);
                     } else {
                           pageElement.innerHTML = `<h2>Calendar</h2><p>Calendar module content goes here.</p>`;
                           console.warn("schedulerModule.loadSchedulerPageContent not found.");
                     }
                    break;
                case 'export':
                    // Delegate to export module
                    window.exportModule?.loadExportPage(pageElement);
                    break;
                case 'security':
                    // Delegate to security module
                     if (window.securityModule?.loadSecurityPageContent) {
                          window.securityModule.loadSecurityPageContent(pageElement);
                     } else {
                           pageElement.innerHTML = `<h2>Security Settings</h2><p>Security module content goes here.</p>`;
                           console.warn("securityModule.loadSecurityPageContent not found.");
                     }
                    break;
                case 'profile':
                    // Delegate to profile module
                     if (window.profileModule?.loadProfilePageContent) {
                           window.profileModule.loadProfilePageContent(pageElement);
                     } else {
                            pageElement.innerHTML = `<h2>Profile</h2><p>Profile module content goes here.</p>`;
                            console.warn("profileModule.loadProfilePageContent not found.");
                     }
                    break;
                default:
                    pageElement.innerHTML = `<h2>${this.getPageTitle(pageId)}</h2><p>Content for this page is not yet implemented.</p>`;
            }
        } catch (error) {
             console.error(`Error loading content for page '${pageId}':`, error);
             pageElement.innerHTML = `<div class="error-state"><h3>Error Loading Page</h3><p>Could not load content for ${this.getPageTitle(pageId)}.</p></div>`;
             this.showToast(`Error loading ${pageId} page`, 'error');
        }
    }


    // --- Page Rendering Functions (Simple Lists) ---
renderBooksPage(pageElement) {
        const books = this.data.books.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        pageElement.innerHTML = `
          <div class="page-header">
            <h1>Books</h1>
            <button class="btn btn--primary" onclick="window.editorModule?.createNewBook()">
              <i class="fas fa-plus"></i> New Book
            </button>
          </div>
          <div class="books-grid" id="booksGrid">
            ${books.length === 0 ?
              '<div class="empty-state"><i class="fas fa-book"></i><h3>No books yet</h3><p>Create your first book to get started.</p><button class="btn btn--primary mt-4" onclick="window.editorModule?.createNewBook()">Create Book</button></div>' :
              books.map(book => this.createBookCard(book)).join('')
            }
          </div>
        `;
    }

    renderNotesPage(pageElement) {
         // Filter only text notes for the main 'All Notes' page
         const textNotes = this.data.notes
             .filter(note => note.type === 'text')
             .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        pageElement.innerHTML = `
          <div class="page-header">
            <h1>All Notes</h1>
            <button class="btn btn--primary" onclick="window.editorModule?.createNewNote()">
              <i class="fas fa-plus"></i> New Note
            </button>
          </div>
          <div class="notes-grid" id="notesGrid">
            ${textNotes.length === 0 ?
              '<div class="empty-state"><i class="fas fa-sticky-note"></i><h3>No notes yet</h3><p>Create your first note to get started.</p><button class="btn btn--primary mt-4" onclick="window.editorModule?.createNewNote()">Create Note</button></div>' :
              textNotes.map(note => this.createNoteCard(note)).join('')
            }
          </div>
        `;
    }

    renderBookmarksPage(pageElement) {
        const bookmarkedItems = [
            ...this.data.books,
            ...this.data.notes // Assuming notes can be bookmarked
        ]
        .filter(item => item.bookmarked)
        .sort((a, b) => new Date(b.lastModified || b.created) - new Date(a.lastModified || a.created));

        pageElement.innerHTML = `
          <div class="bookmarks-container">
            <h1>Bookmarks</h1>
            <div class="bookmarks-list">
              ${bookmarkedItems.length === 0 ?
                '<div class="empty-state"><i class="fas fa-bookmark"></i><h3>No bookmarks yet</h3><p>Bookmark items using the editor to find them here.</p></div>' :
                bookmarkedItems.map(item => this.createBookmarkCard(item)).join('')
              }
            </div>
          </div>
        `;
    }

     renderTagsPage(pageElement) {
          const allTags = window.searchModule?.getAllTags ? window.searchModule.getAllTags() : this.fallbackGetAllTags();

         pageElement.innerHTML = `
           <div class="tags-container">
             <h1>Tags</h1>
             <div class="tags-cloud">
               ${allTags.length === 0 ?
                 '<div class="empty-state"><i class="fas fa-tags"></i><h3>No tags yet</h3><p>Add tags to your notes and books; they will appear here.</p></div>' :
                 allTags.map(tag =>
                     `<button class="tag-bubble" onclick="window.searchModule?.searchByTagName('${this.escapeHtml(tag.name)}')">
                         ${this.escapeHtml(tag.name)} (${tag.count})
                      </button>`
                 ).join('')
               }
             </div>
           </div>
         `;
     }


    // --- Card Creation Helpers ---

    createBookCard(book) {
        let coverHtml = '';
        const cover = book.cover || { type: 'icon', value: 'fas fa-book' }; // Default cover

        if (cover.type === 'image' && cover.value) {
            coverHtml = `<img src="${cover.value}" alt="Cover" loading="lazy">`; // Added loading="lazy"
        } else if (cover.type === 'emoji' && cover.value) {
            coverHtml = `<span class="book-cover-emoji">${cover.value}</span>`;
        } else { // 'icon' or default
             const iconClass = cover.value && cover.value.startsWith('fa') ? cover.value : 'fas fa-book'; // Fallback icon
            coverHtml = `<i class="${iconClass}"></i>`;
        }

        return `
          <div class="book-card" onclick="app.openBook('${book.id}')" role="button" tabindex="0" aria-label="Open book: ${this.escapeHtml(book.title)}">
            <div class="book-cover">${coverHtml}</div>
            <div class="book-info">
              <h3>${this.escapeHtml(book.title)}</h3>
              <p>${this.escapeHtml(book.description || 'No description')}</p>
              <small>Modified ${this.formatDate(book.lastModified)}</small>
            </div>
            ${book.encrypted ? '<div class="item-lock" title="Encrypted"><i class="fas fa-lock"></i></div>' : ''}
            ${book.bookmarked ? '<div class="item-bookmark" title="Bookmarked"><i class="fas fa-bookmark"></i></div>' : ''}
          </div>
        `;
    }

    createNoteCard(note) {
        // Ensure content exists and is a string before stripping HTML
        const contentPreview = typeof note.content === 'string' ? this.stripHtml(note.content).substring(0, 150) : '';

        return `
          <div class="note-card" onclick="app.openNote('${note.id}')" role="button" tabindex="0" aria-label="Open note: ${this.escapeHtml(note.title)}">
            <div class="note-header">
              <h4>${this.escapeHtml(note.title)}</h4>
              <div class="note-indicators">
                 ${note.encrypted ? '<i class="fas fa-lock item-lock" title="Encrypted"></i>' : ''}
                 ${note.bookmarked ? '<i class="fas fa-bookmark item-bookmark" title="Bookmarked"></i>' : ''}
              </div>
            </div>
            <div class="note-content-preview">
              <p>${this.escapeHtml(contentPreview)}${contentPreview.length >= 150 ? '...' : ''}</p>
            </div>
            <div class="note-footer">
              <small>Modified ${this.formatDate(note.lastModified)}</small>
               ${note.tags && note.tags.length > 0 ? `<div class="note-tags-preview">${note.tags.slice(0, 2).map(tag => `<span class="tag-xs">${this.escapeHtml(tag)}</span>`).join('')}${note.tags.length > 2 ? `<span class="tag-xs">+${note.tags.length - 2}</span>` : ''}</div>` : ''}
            </div>
          </div>
        `;
    }

     createBookmarkCard(item) {
         const isBook = !!item.chapters; // Check if it looks like a book
         const typeIcon = isBook ? 'fa-book' : (item.type === 'audio' ? 'fa-music' : 'fa-sticky-note'); // Add audio check
         const descriptionOrContent = isBook ? (item.description || '') : (this.stripHtml(item.content || '').substring(0, 100));

         return `
           <div class="bookmark-card" onclick="app.${isBook ? 'openBook' : 'openNote'}('${item.id}')" role="button" tabindex="0">
             <div class="bookmark-icon">
               <i class="fas ${typeIcon}"></i>
             </div>
             <div class="bookmark-content">
               <h4>${this.escapeHtml(item.title)}</h4>
               <p>${this.escapeHtml(descriptionOrContent)}${descriptionOrContent.length >= 100 ? '...' : ''}</p>
               <small>Modified ${this.formatDate(item.lastModified || item.created)}</small>
             </div>
              ${item.encrypted ? '<div class="item-lock" title="Encrypted"><i class="fas fa-lock"></i></div>' : ''}
           </div>
         `;
     }

    // --- Core Item Actions ---

    openBook(bookId) {
        const book = this.data.books.find(b => b.id === bookId);
        if (!book) {
             this.showToast('Book not found.', 'error');
             return;
        }

        if (book.encrypted) {
            // Check if master password is set
            if (!this.data.settings.masterPasswordHash) {
                 this.showToast('Master Password required. Set one in Security.', 'error');
                return;
            }
            // Delegate decryption prompt to crypto module
            window.cryptoModule?.showDecryptionDialog(bookId, 'book');
        } else {
            // Delegate opening to editor module
            window.editorModule?.editBook(bookId);
             this.showPage('books'); // Navigate to the books page where editor will appear
        }
    }

    openNote(noteId) {
        const note = this.data.notes.find(n => n.id === noteId);
        if (!note) {
             this.showToast('Note not found.', 'error');
            return;
        }

        if (note.encrypted) {
             if (!this.data.settings.masterPasswordHash) {
                  this.showToast('Master Password required. Set one in Security.', 'error');
                 return;
             }
            window.cryptoModule?.showDecryptionDialog(noteId, 'note');
        } else {
            // Delegate opening to editor module
             if (note.type === 'audio') {
                 // Handle opening audio notes differently? Maybe just show page?
                  this.showPage('audio');
                  // Potentially highlight the specific audio card
             } else {
                 window.editorModule?.editNote(noteId);
                  this.showPage('notes'); // Navigate to the notes page
             }
        }
    }

     // Generic delete function
     async deleteItem(itemId, itemType) {
         let item;
         let itemIndex;
         let dataArray;
         let itemName = 'Item'; // Default name for prompts

         if (itemType === 'book') {
             dataArray = this.data.books;
             itemName = 'Book';
         } else if (itemType === 'note' || itemType === 'audio' || itemType === 'canvas') { // Assume notes array holds various types
             dataArray = this.data.notes;
             itemName = itemType === 'note' ? 'Note' : itemType.charAt(0).toUpperCase() + itemType.slice(1);
         } else if (itemType === 'event') {
             dataArray = this.data.events;
             itemName = 'Event';
         } else {
              this.showToast(`Unknown item type: ${itemType}`, 'error');
             return;
         }

         itemIndex = dataArray.findIndex(i => i.id === itemId);
         if (itemIndex === -1) {
              this.showToast(`${itemName} not found.`, 'error');
             return;
         }
         item = dataArray[itemIndex];

         // Confirmation - Use Master Password check for encrypted, simple confirm otherwise
         let confirmed = false;
         if (item.encrypted) {
             if (!this.data.settings.masterPasswordHash) {
                  this.showToast(`Master Password required to delete encrypted ${itemName}. Set one in Security.`, 'error');
                 return;
             }
             // Delegate password prompt to crypto module
             confirmed = await window.cryptoModule?.confirmActionWithMasterPassword(`delete this encrypted ${itemName.toLowerCase()}`);
         } else {
             // Use a custom modal instead of confirm() later
             confirmed = confirm(`Are you sure you want to delete "${item.title || 'this item'}"?`);
         }

         if (!confirmed) {
              this.showToast('Deletion cancelled.', 'info');
             return; // User cancelled or entered wrong password
         }

         // Proceed with deletion
         dataArray.splice(itemIndex, 1);
         this.saveData();
         this.updateUI(); // Update stats, sidebar counts
          this.showToast(`${itemName} deleted successfully.`, 'success');

         // Refresh the current page view if the item was displayed there
         if (this.currentPage === itemType + 's' || (itemType === 'audio' && this.currentPage === 'audio') || (itemType === 'canvas' && this.currentPage === 'canvas') || (itemType === 'event' && this.currentPage === 'scheduler')) {
             this.loadPageContent(this.currentPage);
         } else if (this.currentPage === 'dashboard') { // Refresh dashboard too
              window.dashboardModule?.loadDashboardContent(document.getElementById('dashboardPage'));
         } else if (this.currentPage === 'bookmarks') { // Refresh bookmarks
              this.renderBookmarksPage(document.getElementById('bookmarksPage'));
         }
     }


    // --- UI Update & Utilities ---

    updateUI() {
        console.log("Updating global UI elements...");
        this.updateStats(); // Update stats on dashboard and sidebar counts
        // Refresh dashboard if currently viewed
         if (this.currentPage === 'dashboard') {
              const dashboardPage = document.getElementById('dashboardPage');
              if (dashboardPage && window.dashboardModule?.loadDashboardContent) {
                   window.dashboardModule.loadDashboardContent(dashboardPage);
              }
         }
         // Update profile avatar in sidebar
         window.profileModule?.updateSidebarProfile();

         // Potentially update other global elements as needed
    }

    updateStats() {
        // Update dashboard stats (delegate to dashboard module)
        window.dashboardModule?.updateDashboardStats();

        // Update sidebar counts
        const booksCountEl = document.getElementById('booksCount');
        const notesCountEl = document.getElementById('notesCount');
        if (booksCountEl) booksCountEl.textContent = this.data.books.length;
         // Count only text notes for the "All Notes" sidebar item
        if (notesCountEl) notesCountEl.textContent = this.data.notes.filter(n => n.type === 'text').length;
    }

    getEncryptedItemsCount() {
        let count = 0;
        count += this.data.books.filter(book => book.encrypted).length;
        count += this.data.notes.filter(note => note.encrypted).length;
        // Add events if they can be encrypted
        // count += this.data.events.filter(event => event.encrypted).length;
        return count;
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    stripHtml(html) {
        if (typeof html !== 'string') return '';
        try {
            const div = document.createElement('div');
            div.innerHTML = html;
            return div.textContent || div.innerText || '';
        } catch (e) {
             console.warn("Error stripping HTML:", e);
             return html; // Return original on error
        }
    }

    formatDate(dateString) {
         if (!dateString) return 'Unknown date';
        try {
            const date = new Date(dateString);
             if (isNaN(date)) return 'Invalid date'; // Check if date is valid

            const now = new Date();
            const diff = now - date;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            if (days < 0) return date.toLocaleDateString(); // Future date
            if (days === 0) {
                 // Check if it's today vs yesterday based on actual date, not just 24 hours
                 if (date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                     return 'Today ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                 } else {
                     // It crossed midnight but is within 24 hours, treat as Yesterday
                     return 'Yesterday ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                 }
            }
             if (days === 1 && now.getDate() === date.getDate() + 1) { // Check it's actually yesterday
                 return 'Yesterday ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
             }
            if (days < 7) return `${days} days ago`;
            return date.toLocaleDateString(); // Older dates: just the date
        } catch (e) {
             console.error("Error formatting date:", dateString, e);
             return 'Invalid date';
        }
    }

    generateId() {
        // Simple ID generator (consider UUID for more robustness)
        return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

     // Fallback for getting tags if search module isn't loaded
     fallbackGetAllTags() {
         console.warn("Using fallback tag calculation.");
         const tagCount = {};
         [...this.data.books, ...this.data.notes].forEach(item => {
             if (item.tags && Array.isArray(item.tags)) {
                 item.tags.forEach(tag => {
                      if (typeof tag === 'string' && tag.trim()) {
                           const trimmedTag = tag.trim();
                           tagCount[trimmedTag] = (tagCount[trimmedTag] || 0) + 1;
                      }
                 });
             }
         });
         return Object.entries(tagCount).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
     }

     // Basic theme setting if ui.js fails
     setFallbackTheme() {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
          document.documentElement.setAttribute('data-color-scheme', prefersDark ? 'dark' : 'light');
     }


     // --- Quick Note (Simplified, UI in ui.js) ---
     saveQuickNote() {
         const titleInput = document.getElementById('quickNoteTitle');
         const contentInput = document.getElementById('quickNoteContent');
         if (!titleInput || !contentInput) return;

         const title = titleInput.value.trim() || 'Quick Note ' + new Date().toLocaleDateString();
         const content = contentInput.value.trim();

         if (!content) {
              this.showToast('Please enter some content for the quick note.', 'warning');
             return;
         }

         const note = {
             id: this.generateId(),
             title,
             content: `<p>${content.replace(/\n/g, '</p><p>')}</p>`, // Basic paragraph conversion
             type: 'text',
             created: new Date().toISOString(),
             lastModified: new Date().toISOString(),
             tags: ['quick-note'], // Add a default tag
             bookmarked: false,
             encrypted: false
         };

         this.data.notes.push(note);
         this.saveData();
         this.updateUI(); // Update counts etc.
          this.hideQuickNote(); // Close popup via uiModule
          this.showToast('Quick note saved!', 'success');
     }

      // --- Default Templates ---
      initializeDefaultTemplates() {
          const defaultTemplates = [
              { id: this.generateId(), name: 'Meeting Notes', type: 'text', content: `<h1>Meeting Notes</h1>\n<p><strong>Date:</strong> {{date}}</p>\n<p><strong>Attendees:</strong></p>\n<ul><li></li></ul>\n<h2>Agenda</h2>\n<ol><li></li></ol>\n<h2>Discussion Points</h2>\n<p></p>\n<h2>Action Items</h2>\n<ul><li>[ ] Task 1</li></ul>\n<h2>Next Steps</h2>\n<p></p>`, description: 'Standard template for meeting minutes' },
              { id: this.generateId(), name: 'Project Plan', type: 'text', content: `<h1>Project Plan: [Project Name]</h1>\n<p><strong>Start Date:</strong> {{date}}</p>\n<p><strong>End Date:</strong></p>\n<p><strong>Team Members:</strong></p>\n<h2>Objectives</h2>\n<ul><li></li></ul>\n<h2>Milestones</h2>\n<ol><li>Milestone 1</li></ol>\n<h2>Resources Needed</h2>\n<p></p>\n<h2>Risks & Mitigation</h2>\n<p></p>`, description: 'Basic structure for project planning' },
              { id: this.generateId(), name: 'Daily Journal', type: 'text', content: `<h1>Daily Journal - {{date}}</h1>\n<h2>What I accomplished today:</h2>\n<p></p>\n<h2>What I learned:</h2>\n<p></p>\n<h2>What I'm grateful for:</h2>\n<ul><li></li></ul>\n<h2>Tomorrow's priorities:</h2>\n<ol><li></li></ol>`, description: 'Template for daily reflection' }
          ];
          this.data.templates = defaultTemplates;
           // Don't save here, let loadData handle the save if needed
      }

} // End of ShiroNotes Class

// --- Global Initialization ---
// Create the main application instance
// This also sets window.app within the constructor
document.addEventListener('DOMContentLoaded', () => {
     try {
         // Check if app was already created (unlikely but safe)
         if (!window.app) {
              new ShiroNotes();
         } else {
              console.warn("ShiroNotes instance already exists.");
              // Optionally re-run parts of init if needed on DOM ready
              window.uiModule?.initUI(); // Re-run UI init maybe?
         }
     } catch (error) {
          console.error("Error during DOMContentLoaded ShiroNotes initialization:", error);
           document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Application Error</h1><p>Shiro Notes failed to start after loading. Please check the console for details.</p></div>';
     }
});
    
