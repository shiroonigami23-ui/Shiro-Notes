// Main Shiro Notes Application Class
class ShiroNotes {
  constructor() {
    this.data = {
      books: [],
      notes: [],
      events: [],
      settings: {
        theme: 'auto', // Default theme setting
        autoLock: false,
        lockTimeout: 300000, // 5 minutes default
        masterPasswordHash: null, // Store hash of the master password
        profile: {
          name: '',
          email: '',
          bio: '',
          avatar: null // Store avatar as base64 data URL
        }
      },
      templates: [] // Bookmarks and tags are derived or managed elsewhere now
    };

    this.currentPage = 'dashboard';
    this.isLocked = false; // App lock status
    this.lockTimer = null; // Timer for auto-lock

    // Initialize core components after DOM is loaded
    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  async init() {
    console.log("Shiro Notes Initializing...");
    await this.loadData();

    // Initialize Modules (Order might matter for dependencies)
    // Make sure modules are attached to 'window' or 'this' instance
    // Example: this.cryptoModule = window.cryptoModule; this.uiModule = window.uiModule; etc.

    // Check lock status before setting up UI that might be hidden
    this.checkLockStatus(); // Handles initial lock state

    // If locked, show lock screen and wait for unlock
    if (this.isLocked && window.securityModule) {
        window.securityModule.showLockScreen();
        // Further UI initialization happens after unlock
    } else {
        this.initializeAppUI();
    }
  }

   // Initialize UI components after data load and potential unlock
   initializeAppUI() {
    console.log("Initializing App UI...");
    if (!window.uiModule || !window.dashboardModule) {
        console.error("Essential UI or Dashboard modules not loaded!");
        this.showToast("Error initializing application modules.", "error"); // Use own toast if UI module fails
        return;
    }

    // Setup general event listeners (like navigation)
    this.setupNavigation();
    this.setupActivityTracking(); // For auto-lock reset

    // Initial UI setup
    window.uiModule.initializeTheme(); // Set theme based on settings
    window.profileModule?.updateSidebarProfile(); // Update sidebar avatar

    // Show the initial page (usually dashboard)
    this.showPage(this.currentPage);

    // Initial data sync or UI update
    this.updateUI(); // Updates counts etc.

    // Show welcome message only if not locked initially
    if (!localStorage.getItem('shiroAppLocked')) { // Check if we started unlocked
        this.showToast('Welcome to Shiro Notes!', 'success');
    }

    console.log("Shiro Notes Initialized Successfully.");
}


  // --- Data Management ---
  async loadData() {
    console.log("Loading data...");
    try {
      const savedData = localStorage.getItem('shiroNotesData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Deep merge settings to avoid overwriting nested properties
        if (parsedData.settings) {
            parsedData.settings = { ...this.data.settings, ...parsedData.settings };
            if (parsedData.settings.profile) {
                parsedData.settings.profile = { ...this.data.settings.profile, ...parsedData.settings.profile };
            }
        }
        this.data = { ...this.data, ...parsedData };
        console.log("Data loaded from localStorage.");
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
      alert('Error loading data. Check console for details.'); // Use alert as fallback
    }
  }

  saveData() {
    try {
      localStorage.setItem('shiroNotesData', JSON.stringify(this.data));
      // console.log("Data saved."); // Optional: uncomment for debugging
    } catch (error) {
      console.error('Error saving data:', error);
      this.showToast('Error saving data. Changes might not persist.', 'error');
    }
  }

  // --- Lock Management ---
  checkLockStatus() {
    // Check if a master password is set and if the app was previously locked
    if (this.data.settings.masterPasswordHash && localStorage.getItem('shiroAppLocked') === 'true') {
        this.isLocked = true;
        console.log("App is locked.");
    } else {
        this.isLocked = false;
        localStorage.removeItem('shiroAppLocked'); // Ensure lock state is cleared
        this.resetLockTimer(); // Start auto-lock timer if enabled
    }
  }

    lockApp() {
        if (!this.data.settings.masterPasswordHash) {
            this.showToast('Set a Master Password in Security settings to enable locking.', 'warning');
            return;
        }
        this.isLocked = true;
        localStorage.setItem('shiroAppLocked', 'true'); // Persist lock state
        clearTimeout(this.lockTimer); // Stop auto-lock timer
        if (window.securityModule) {
            window.securityModule.showLockScreen();
        }
        console.log("App locked manually.");
    }

    // Called by SecurityModule after successful unlock
    unlockApp() {
        this.isLocked = false;
        localStorage.removeItem('shiroAppLocked');
        this.resetLockTimer(); // Restart auto-lock timer
        // If UI wasn't fully initialized due to lock, initialize it now
        if (!document.getElementById('dashboardPage').innerHTML) { // Basic check if UI needs init
             this.initializeAppUI();
        }
        console.log("App unlocked.");
        this.showToast('Application Unlocked', 'success');
    }

   resetLockTimer() {
        if (this.isLocked || !this.data.settings.autoLock || !this.data.settings.masterPasswordHash) {
            return; // Don't reset if locked, auto-lock disabled, or no password set
        }
        clearTimeout(this.lockTimer);
        const timeoutDuration = this.data.settings.lockTimeout || 300000; // Default 5 mins
        this.lockTimer = setTimeout(() => {
            if (!this.isLocked && this.data.settings.autoLock && this.data.settings.masterPasswordHash) {
                console.log("Auto-locking due to inactivity...");
                this.lockApp();
            }
        }, timeoutDuration);
   }

     // Call this on user activity
    setupActivityTracking() {
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            // Use throttling or debouncing if performance becomes an issue
            document.addEventListener(event, () => this.resetLockTimer(), { passive: true });
        });
    }

  // --- Navigation ---
   setupNavigation() {
     const sidebarNav = document.querySelector('.sidebar-nav');
     const sidebarFooter = document.querySelector('.sidebar-footer');

     const handleNavClick = (e) => {
       const navItem = e.target.closest('.nav-item[data-page]');
       if (navItem) {
         e.preventDefault();
         const pageId = navItem.getAttribute('data-page');
         this.showPage(pageId);
       }
     };

     if (sidebarNav) {
       sidebarNav.addEventListener('click', handleNavClick);
     }
     if (sidebarFooter) {
       sidebarFooter.addEventListener('click', handleNavClick);
     }
   }

  showPage(pageId) {
    if (this.isLocked) {
        console.warn("Attempted to show page while locked:", pageId);
        return; // Don't change page if locked
    }
    console.log("Showing page:", pageId);

    // Hide all pages first for transition effect
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });

    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
      this.currentPage = pageId;

      // Update UI elements via UIModule
      if (window.uiModule) {
          window.uiModule.updateBreadcrumb(pageId);
          window.uiModule.setActiveNavItem(pageId);
          window.uiModule.closeMobileSidebar(); // Close mobile sidebar on navigation
      }

      // Load content specific to the page
      this.loadPageContent(pageId);

      // Make the target page visible after a short delay for transition
      // requestAnimationFrame ensures the 'remove active' reflow happens first
      requestAnimationFrame(() => {
          targetPage.classList.add('active');
      });

    } else {
        console.error(`Page element not found for ID: ${pageId}Page`);
        this.showToast(`Error: Could not load page '${pageId}'.`, 'error');
         // Optionally fallback to dashboard
         if (pageId !== 'dashboard') {
             this.showPage('dashboard');
         }
    }
  }

  getPageTitle(pageId) {
    const titles = {
      dashboard: 'Dashboard',
      books: 'Books',
      notes: 'Notes',
      canvas: 'Canvas',
      audio: 'Audio Notes',
      search: 'Search',
      bookmarks: 'Bookmarks', // Placeholder - to be implemented
      tags: 'Tags',         // Placeholder - to be implemented
      templates: 'Templates',
      scheduler: 'Calendar',
      export: 'Export & Backup', // Renamed for clarity
      security: 'Security',
      profile: 'Profile & Settings' // Renamed for clarity
    };
    return titles[pageId] || pageId.charAt(0).toUpperCase() + pageId.slice(1); // Default capitalization
  }

  loadPageContent(pageId) {
    console.log("Loading content for page:", pageId);
    const pageElement = document.getElementById(pageId + 'Page');
    if (!pageElement) {
        console.error(`Cannot load content: Page element ${pageId}Page not found.`);
        return;
    }

    // Use specific modules to load content
    switch (pageId) {
      case 'dashboard':
        window.dashboardModule?.loadDashboard();
        break;
      case 'books':
        this.loadBooksPage(pageElement); // Keep simple list rendering here for now
        break;
      case 'notes':
        this.loadNotesPage(pageElement); // Keep simple list rendering here for now
        break;
      case 'canvas':
        window.canvasModule?.loadCanvasPage(pageElement);
        break;
      case 'audio':
        window.audioModule?.loadAudioPage(pageElement);
        break;
      case 'search':
        window.searchModule?.loadSearchPage(pageElement);
        break;
      case 'templates':
        window.templatesModule?.loadTemplatesPage(pageElement);
        break;
      case 'scheduler':
        window.schedulerModule?.loadSchedulerPage(pageElement);
        break;
      case 'export':
        window.exportModule?.loadExportPage(pageElement);
        break;
      case 'security':
         // Assuming security content is static or handled by its module
         window.securityModule?.loadSecurityPage(pageElement);
        break;
      case 'profile':
         // Assuming profile content is static or handled by its module
        window.profileModule?.loadProfilePage(pageElement);
        break;
       case 'bookmarks':
         this.loadBookmarksPage(pageElement); // Implement this
         break;
       case 'tags':
         this.loadTagsPage(pageElement); // Implement this
         break;
      default:
        console.warn(`No content loader defined for page: ${pageId}`);
        pageElement.innerHTML = `<p>Content for ${pageId} coming soon.</p>`;
    }
  }

  // --- Page Content Loaders (Keep simple lists here, delegate complex pages) ---

  loadBooksPage(page) {
    const books = this.data.books.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    page.innerHTML = `
      <div class="page-header">
        <h1>Books</h1>
        <button class="btn btn--primary" onclick="app.createBook()">
          <i class="fas fa-plus"></i> New Book
        </button>
      </div>
      <div class="books-grid" id="booksGrid">
        ${books.length === 0 ?
          this.renderEmptyState('book', 'Create your first book') :
          books.map(book => this.createBookCard(book)).join('')
        }
      </div>
    `;
  }

  loadNotesPage(page) {
     const notes = this.data.notes
        .filter(note => note.type !== 'audio') // Exclude audio notes
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    page.innerHTML = `
      <div class="page-header">
        <h1>Notes</h1>
        <button class="btn btn--primary" onclick="app.createNote()">
          <i class="fas fa-plus"></i> New Note
        </button>
      </div>
      <div class="notes-grid" id="notesGrid">
        ${notes.length === 0 ?
           this.renderEmptyState('sticky-note', 'Create your first note') :
           notes.map(note => this.createNoteCard(note)).join('')
        }
      </div>
    `;
  }

    loadBookmarksPage(page) {
        const bookmarkedItems = [
            ...this.data.books.filter(book => book.bookmarked),
            ...this.data.notes.filter(note => note.bookmarked && note.type !== 'audio')
        ].sort((a, b) => new Date(b.lastModified || b.created) - new Date(a.lastModified || a.created));

        page.innerHTML = `
          <div class="page-header">
            <h1>Bookmarks</h1>
          </div>
          <div class="bookmarks-list" id="bookmarksList">
             ${bookmarkedItems.length === 0 ?
               this.renderEmptyState('bookmark', 'Bookmark items to find them here') :
               bookmarkedItems.map(item => this.createBookmarkCard(item)).join('')
             }
          </div>
        `;
    }

    loadTagsPage(page) {
        const allTags = window.searchModule ? window.searchModule.getAllTags() : []; // Use search module if available

        page.innerHTML = `
          <div class="page-header">
            <h1>Tags</h1>
            <p>Browse your content by tags.</p>
          </div>
          <div class="tags-cloud">
             ${allTags.length === 0 ?
               this.renderEmptyState('tags', 'Tags you add will appear here') :
               allTags.map(tag => `
                 <button class="tag-bubble" onclick="app.searchByTag('${this.escapeHtml(tag.name)}')">
                   ${this.escapeHtml(tag.name)} (${tag.count})
                 </button>
               `).join('')
             }
          </div>
          <!-- Optional: Add a section to list items for a selected tag -->
          <div id="tagResults" class="mt-8"></div>
        `;
    }

  // --- Item Creation/Deletion/Opening ---
  createBook() {
    if (window.editorModule) {
      window.editorModule.createNewBook();
      this.showPage('books'); // Navigate to books page where editor will open
    } else {
      this.showToast("Editor module not loaded.", "error");
    }
  }

  createNote() {
    if (window.editorModule) {
      window.editorModule.createNewNote();
      this.showPage('notes'); // Navigate to notes page where editor will open
    } else {
      this.showToast("Editor module not loaded.", "error");
    }
  }

  openBook(bookId) {
    const book = this.data.books.find(b => b.id === bookId);
    if (!book) return;

    if (book.encrypted) {
      if (!this.data.settings.masterPasswordHash) {
          this.showToast('A Master Password is required. Please set one in Security.', 'error');
          return;
      }
      window.cryptoModule?.showDecryptionDialog(bookId, 'book');
    } else {
      window.editorModule?.editBook(bookId);
    }
  }

  openNote(noteId) {
    const note = this.data.notes.find(n => n.id === noteId);
    if (!note) return;

    if (note.encrypted) {
      if (!this.data.settings.masterPasswordHash) {
          this.showToast('A Master Password is required. Please set one in Security.', 'error');
          return;
      }
      window.cryptoModule?.showDecryptionDialog(noteId, 'note');
    } else {
      window.editorModule?.editNote(noteId);
    }
  }

    async deleteItem(itemId, itemType) {
        let itemIndex = -1;
        let dataArray = null;
        let itemTitle = "Item"; // Default title

        if (itemType === 'book') {
            dataArray = this.data.books;
        } else if (itemType === 'note' || itemType === 'audio') { // Handle note types
            dataArray = this.data.notes;
        } else if (itemType === 'event') {
            dataArray = this.data.events;
        } else if (itemType === 'template') {
            dataArray = this.data.templates;
        }
        // Add other types as needed

        if (dataArray) {
            itemIndex = dataArray.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                itemTitle = dataArray[itemIndex].title || dataArray[itemIndex].name || itemTitle; // Use title or name
            }
        }

        if (itemIndex === -1 || !dataArray) {
            this.showToast('Item not found.', 'error');
            return;
        }

        const item = dataArray[itemIndex];

        // Confirmation (handle encryption if applicable)
        let confirmed = false;
        if (item.encrypted) {
            if (!this.data.settings.masterPasswordHash) {
                this.showToast('Set Master Password to delete encrypted items.', 'error');
                return;
            }
            const password = prompt(`"${itemTitle}" is encrypted. Enter Master Password to delete:`);
            if (password === null) return; // User cancelled prompt

            try {
                 this.showLoading("Verifying...");
                 const enteredHash = await window.cryptoModule.hash(password);
                 if (enteredHash === this.data.settings.masterPasswordHash) {
                     confirmed = true;
                 } else {
                     this.showToast('Incorrect Master Password.', 'error');
                 }
            } catch (e) {
                this.showToast('Password verification failed.', 'error');
            } finally {
                 this.hideLoading();
            }
        } else {
            // Standard confirmation
            confirmed = confirm(`Are you sure you want to delete "${itemTitle}"? This cannot be undone.`);
        }

        // Proceed with deletion if confirmed
        if (confirmed) {
            dataArray.splice(itemIndex, 1);
            this.saveData();
            this.updateUI(); // Update counts etc.
            this.loadPageContent(this.currentPage); // Refresh current page view
            this.showToast(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted successfully.`, 'success');
        }
    }


  // --- UI Rendering Helpers ---

  renderEmptyState(icon, message) {
     return `<div class="empty-state"><i class="fas fa-${icon}"></i><h3>${message}</h3></div>`;
  }

  createBookCard(book) {
    let coverHtml = `<i class="fas fa-book"></i>`; // Default icon
    const cover = book.cover || { type: 'icon', value: 'fas fa-book' };

    if (cover.type === 'image') {
      coverHtml = `<img src="${cover.value}" alt="Cover" loading="lazy">`;
    } else if (cover.type === 'emoji') {
      coverHtml = `<span class="book-cover-emoji">${this.escapeHtml(cover.value)}</span>`;
    } else if (cover.value) { // Icon type
      coverHtml = `<i class="${this.escapeHtml(cover.value)}"></i>`;
    }

    return `
      <div class="book-card" onclick="app.openBook('${book.id}')" title="Open ${this.escapeHtml(book.title)}">
        <div class="book-cover">${coverHtml}</div>
        <div class="book-info">
          <h3>${this.escapeHtml(book.title)}</h3>
          <p>${this.escapeHtml(book.description || '').substring(0, 100)}${book.description && book.description.length > 100 ? '...' : ''}</p>
          <div class="card-meta">
              <small>Modified ${this.formatDate(book.lastModified)}</small>
              ${book.encrypted ? '<i class="fas fa-lock meta-icon" title="Encrypted"></i>' : ''}
              ${book.bookmarked ? '<i class="fas fa-bookmark meta-icon" title="Bookmarked"></i>' : ''}
          </div>
        </div>
       <div class="card-actions">
           <button class="btn btn--secondary btn--sm" onclick="event.stopPropagation(); app.deleteItem('${book.id}', 'book')" title="Delete Book"><i class="fas fa-trash"></i></button>
           <button class="btn btn--secondary btn--sm" onclick="event.stopPropagation(); window.editorModule?.showCoverModal('${book.id}')" title="Change Cover"><i class="fas fa-image"></i></button>
           <button class="btn btn--secondary btn--sm" onclick="event.stopPropagation(); window.exportModule?.exportToEPUB('${book.id}')" title="Export EPUB"><i class="fas fa-book-open"></i></button>
        </div>

      </div>
    `;
  }

  createNoteCard(note) {
      const snippet = this.stripHtml(note.content || '').substring(0, 150);
      return `
        <div class="note-card" onclick="app.openNote('${note.id}')" title="Open ${this.escapeHtml(note.title)}">
          <div class="note-header">
            <h4>${this.escapeHtml(note.title)}</h4>
            <div class="note-meta-icons">
                 ${note.encrypted ? '<i class="fas fa-lock meta-icon" title="Encrypted"></i>' : ''}
                 ${note.bookmarked ? '<i class="fas fa-bookmark meta-icon" title="Bookmarked"></i>' : ''}
            </div>
          </div>
          <div class="note-content">
            <p>${this.escapeHtml(snippet)}${snippet.length === 150 ? '...' : ''}</p>
          </div>
          <div class="note-footer">
            <small>Modified ${this.formatDate(note.lastModified)}</small>
            <div class="card-actions">
                <button class="btn btn--secondary btn--sm" onclick="event.stopPropagation(); app.deleteItem('${note.id}', 'note')" title="Delete Note"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;
  }

    createBookmarkCard(item) {
        const isBook = item.chapters !== undefined; // Check if it looks like a book
        const type = isBook ? 'book' : 'note';
        const icon = isBook ? 'book' : 'sticky-note';
        const snippet = isBook
            ? (item.description || '').substring(0, 100)
            : this.stripHtml(item.content || '').substring(0, 100);

        return `
          <div class="bookmark-card result-card ${type}" onclick="app.openItem('${type}', '${item.id}')">
             <div class="result-icon">
                <i class="fas fa-${icon}"></i>
             </div>
             <div class="result-content">
               <div class="result-header">
                  <h4 class="result-title">${this.escapeHtml(item.title)}</h4>
                  <div class="result-meta">
                     <span class="result-type">${type}</span>
                     <span class="result-date">${this.formatDate(item.lastModified || item.created)}</span>
                  </div>
               </div>
               <div class="result-snippet">
                 ${this.escapeHtml(snippet)}${snippet.length === 100 ? '...' : ''}
               </div>
                ${item.tags && item.tags.length > 0 ? `
                  <div class="result-tags">
                     ${item.tags.slice(0, 3).map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                     ${item.tags.length > 3 ? `<span class="more-tags">+${item.tags.length - 3}</span>` : ''}
                  </div>
                ` : ''}
             </div>
              <div class="result-actions">
                <button class="btn btn--secondary btn--sm" onclick="event.stopPropagation(); app.toggleBookmark('${item.id}', '${type}')" title="Remove Bookmark"><i class="fas fa-bookmark"></i></button>
                ${item.encrypted ? '<i class="fas fa-lock meta-icon" title="Encrypted"></i>' : ''}
             </div>
          </div>
        `;
    }

    // New method to open item generically
    openItem(type, id) {
        if (type === 'book') {
            this.openBook(id);
        } else if (type === 'note') {
            this.openNote(id);
        } // Add other types if needed
    }

    toggleBookmark(itemId, itemType) {
        let item = null;
        if (itemType === 'book') {
            item = this.data.books.find(i => i.id === itemId);
        } else if (itemType === 'note') {
            item = this.data.notes.find(i => i.id === itemId);
        }

        if (item) {
            item.bookmarked = !item.bookmarked;
            item.lastModified = new Date().toISOString();
            this.saveData();
            this.loadPageContent(this.currentPage); // Refresh current page (likely bookmarks)
            this.showToast(item.bookmarked ? 'Item bookmarked' : 'Bookmark removed', 'success');
        }
    }


  // --- Utility Functions ---
  escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
   }

  stripHtml(html){
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 1 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // Today: Show time
        } else if (diffDays <= 1 && date.getDate() === now.getDate() - 1) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return date.toLocaleDateString([], { weekday: 'short' }); // Within a week: Show day name
        } else {
            return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }); // Older: Show full date
        }
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
}


  generateId() {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

    // Simple Toast implementation (can be replaced by uiModule.showToast later)
    showToast(message, type = 'info', duration = 3000) {
        // Fallback or initial implementation
        if (window.uiModule) {
            window.uiModule.showToast(message, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            // Basic alert fallback if UI module isn't ready
            // alert(`[${type.toUpperCase()}] ${message}`);
        }
    }
     // Simple Loading implementation (can be replaced by uiModule later)
    showLoading(message = 'Loading...') {
       if (window.uiModule) {
          window.uiModule.showLoading(message);
       } else {
          console.log(message);
          // Optionally add a very basic overlay if needed before UI module loads
       }
    }

    hideLoading() {
       if (window.uiModule) {
          window.uiModule.hideLoading();
       } else {
          console.log("Loading finished.");
       }
    }


  // --- Initialization Helper ---
  initializeDefaultTemplates() {
    // Moved to templates.js or keep here if it's core data setup
    console.log("Initializing default templates...");
     const defaultTemplates = [
       { id: this.generateId(), name: 'Meeting Notes', type: 'text', content: '# Meeting Notes\n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n## Discussion\n\n## Action Items', description: 'Standard meeting notes format' },
       { id: this.generateId(), name: 'Daily Journal', type: 'text', content: '# Journal - {{date}}\n\n## Highlights\n\n## Challenges\n\n## Gratitude', description: 'A simple daily journal entry' }
     ];
     this.data.templates = defaultTemplates;
     // Don't save here, let the initial saveData handle it if needed
  }

  // --- Global Update ---
  updateUI() {
    // This is called after data changes (save, delete, etc.)
    console.log("Updating global UI elements...");
    window.dashboardModule?.updateStats(); // Update stats on dashboard & sidebar
    window.profileModule?.updateSidebarProfile(); // Update sidebar avatar/name

    // Optionally: Refresh parts of the current page if necessary,
    // but usually loadPageContent handles this when navigating or after major actions.
    // Example: if (this.currentPage === 'tags') this.loadTagsPage(document.getElementById('tagsPage'));
  }

   searchByTag(tagName) {
      this.showPage('search');
      // Set the tag filter in the search module and perform search
      if (window.searchModule) {
         // Need a method in searchModule to set filter and search by tag
         window.searchModule.searchWithTagFilter(tagName);
      } else {
         this.showToast(`Cannot search by tag: Search module not loaded.`, 'error');
      }
   }
}

// Instantiate the App AFTER the DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
   app = new ShiroNotes();
   window.app = app; // Make it globally accessible
}); 
