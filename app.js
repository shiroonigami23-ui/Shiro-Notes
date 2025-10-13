
class ShiroNotes {
  constructor() {
    this.data = {
      books: [],
      notes: [],
      events: [],
      settings: {
        theme: 'auto',
        autoLock: false,
        lockTimeout: 300000, // 5 minutes
        passcode: null,
        profile: {
          name: '',
          email: '',
          bio: '',
          avatar: null
        }
      },
      bookmarks: [],
      tags: [],
      templates: []
    };
    
    this.currentPage = 'dashboard';
    this.isLocked = false;
    this.lockTimer = null;
    this.sidebarCollapsed = false;
    
    this.init();
  }
  
  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.initializeTheme();
    this.checkLockStatus();
    this.updateUI();
    this.showToast('Welcome to Shiro Notes!', 'success');
  }
  
  // Data Management
  async loadData() {
    try {
      const savedData = localStorage.getItem('shiroNotesData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        this.data = { ...this.data, ...parsedData };
      }
      
      // Initialize default templates if none exist
      if (this.data.templates.length === 0) {
        this.initializeDefaultTemplates();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Error loading data', 'error');
    }
  }
  
  saveData() {
    try {
      localStorage.setItem('shiroNotesData', JSON.stringify(this.data));
    } catch (error) {
      console.error('Error saving data:', error);
      this.showToast('Error saving data', 'error');
    }
  }
  
  // Theme Management
  initializeTheme() {
    const theme = this.data.settings.theme;
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    } else {
      this.setTheme(theme);
    }
  }
  
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('themeToggle').querySelector('i');
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
  
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    this.data.settings.theme = newTheme;
    this.saveData();
  }
  
  // Lock Management
  
  
  // Navigation
  showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // Remove active state from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = pageId;
      
      // Update breadcrumb
      const breadcrumb = document.getElementById('breadcrumb');
      breadcrumb.textContent = this.getPageTitle(pageId);
      
      // Set active nav item
      const navItem = document.querySelector(`[data-page="${pageId}"]`);
      if (navItem) {
        navItem.classList.add('active');
      }
      
      // Load page content
      this.loadPageContent(pageId);
    }
    
    // Close mobile sidebar
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }
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
      export: 'Export',
      security: 'Security',
      profile: 'Profile'
    };
    return titles[pageId] || pageId;
  }
  
  loadPageContent(pageId) {
    const page = document.getElementById(pageId + 'Page');
    
    switch (pageId) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'books':
        this.loadBooksPage(page);
        break;
      case 'notes':
        this.loadNotesPage(page);
        break;
      case 'canvas':
        this.loadCanvasPage(page);
        break;
      case 'audio':
        this.loadAudioPage(page);
        break;
      case 'search':
        this.loadSearchPage(page);
        break;
      case 'bookmarks':
        this.loadBookmarksPage(page);
        break;
      case 'tags':
        this.loadTagsPage(page);
        break;
      case 'templates':
        this.loadTemplatesPage(page);
        break;
      case 'scheduler':
        this.loadSchedulerPage(page);
        break;
      case 'export':
        exportModule.loadExportPage(page);
        break;
      case 'security':
        this.loadSecurityPage(page);
        break;
      case 'profile':
        this.loadProfilePage(page);
        break;
    }
  }
  
  // Dashboard
  loadDashboard() {
    this.updateStats();
    this.loadRecentBooks();
    this.loadRecentNotes();
  }
  
  updateStats() {
    document.getElementById('totalBooks').textContent = this.data.books.length;
    document.getElementById('totalNotes').textContent = this.data.notes.length;
    document.getElementById('totalEvents').textContent = this.data.events.length;
    document.getElementById('encryptedItems').textContent = this.getEncryptedItemsCount();
    
    // Update sidebar counts
    document.getElementById('booksCount').textContent = this.data.books.length;
    document.getElementById('notesCount').textContent = this.data.notes.length;
  }
  
  getEncryptedItemsCount() {
    let count = 0;
    count += this.data.books.filter(book => book.encrypted).length;
    count += this.data.notes.filter(note => note.encrypted).length;
    return count;
  }
  
  loadRecentBooks() {
    const container = document.getElementById('recentBooks');
    const recentBooks = this.data.books
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 3);
    
    if (recentBooks.length === 0) {
      container.innerHTML = '<p class="text-center text-secondary">No books yet. Create your first book!</p>';
      return;
    }
    
    container.innerHTML = recentBooks.map(book => `
      <div class="recent-item" onclick="app.openBook('${book.id}')">
        <div class="item-icon">
          <i class="fas fa-book"></i>
        </div>
        <div class="item-content">
          <h4>${this.escapeHtml(book.title)}</h4>
          <p>${this.escapeHtml(book.description || 'No description')}</p>
          <small>Modified ${this.formatDate(book.lastModified)}</small>
        </div>
        ${book.encrypted ? '<i class="fas fa-lock item-lock"></i>' : ''}
      </div>
    `).join('');
  }
  
  loadRecentNotes() {
    const container = document.getElementById('recentNotes');
    const recentNotes = this.data.notes
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 3);
    
    if (recentNotes.length === 0) {
      container.innerHTML = '<p class="text-center text-secondary">No notes yet. Create your first note!</p>';
      return;
    }
    
    container.innerHTML = recentNotes.map(note => `
      <div class="recent-item" onclick="app.openNote('${note.id}')">
        <div class="item-icon">
          <i class="fas fa-sticky-note"></i>
        </div>
        <div class="item-content">
          <h4>${this.escapeHtml(note.title)}</h4>
          <p>${this.escapeHtml(this.stripHtml(note.content).substring(0, 100))}...</p>
          <small>Modified ${this.formatDate(note.lastModified)}</small>
        </div>
        ${note.encrypted ? '<i class="fas fa-lock item-lock"></i>' : ''}
      </div>
    `).join('');
  }
  
  // Page loaders (basic structure)
  loadBooksPage(page) {
    page.innerHTML = `
      <div class="page-header">
        <h1>Books</h1>
        <button class="btn btn--primary" onclick="app.createBook()">
          <i class="fas fa-plus"></i> New Book
        </button>
      </div>
      <div class="books-grid" id="booksGrid">
        ${this.data.books.length === 0 ? 
          '<div class="empty-state"><i class="fas fa-book"></i><h3>No books yet</h3><p>Create your first book to get started</p></div>' :
          this.data.books.map(book => this.createBookCard(book)).join('')
        }
      </div>
    `;
  }
  
  loadNotesPage(page) {
    page.innerHTML = `
      <div class="page-header">
        <h1>All Notes</h1>
        <button class="btn btn--primary" onclick="app.createNote()">
          <i class="fas fa-plus"></i> New Note
        </button>
      </div>
      <div class="notes-grid" id="notesGrid">
        ${this.data.notes.length === 0 ? 
          '<div class="empty-state"><i class="fas fa-sticky-note"></i><h3>No notes yet</h3><p>Create your first note to get started</p></div>' :
          this.data.notes.map(note => this.createNoteCard(note)).join('')
        }
      </div>
    `;
  }
  
  // In app.js
loadCanvasPage(page) {
    page.innerHTML = `
      <div class="canvas-container">
        <div class="canvas-toolbar">
          <div class="tool-group">
            <button class="tool-btn active" data-tool="pen" title="Pen (P)"><i class="fas fa-pen"></i></button>
            <button class="tool-btn" data-tool="brush" title="Brush (B)"><i class="fas fa-paint-brush"></i></button>
            <button class="tool-btn" data-tool="eraser" title="Eraser (E)"><i class="fas fa-eraser"></i></button>
          </div>
          <div class="tool-group">
            <button class="tool-btn" data-tool="line" title="Line (L)"><i class="fas fa-minus"></i></button>
            <button class="tool-btn" data-tool="rectangle" title="Rectangle (R)"><i class="far fa-square"></i></button>
            <button class="tool-btn" data-tool="circle" title="Circle (C)"><i class="far fa-circle"></i></button>
            <button class="tool-btn" data-tool="arrow" title="Arrow"><i class="fas fa-arrow-right"></i></button>
          </div>
          <div class="tool-group">
            <label for="fillShapeToggle" class="toolbar-label" title="Fill shapes with the selected color">
              <input type="checkbox" id="fillShapeToggle"> Fill
            </label>
          </div>
          <div class="tool-group">
            <input type="color" id="canvasColor" value="#000000" title="Color">
            <input type="range" id="canvasSize" min="1" max="50" value="2" title="Size">
          </div>
          <div class="tool-group">
            <button class="tool-btn" onclick="canvasModule.undo()" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i></button>
            <button class="tool-btn" onclick="canvasModule.redo()" title="Redo (Ctrl+Y)"><i class="fas fa-redo"></i></button>
            <button class="tool-btn" onclick="canvasModule.clear()" title="Clear Canvas"><i class="fas fa-trash"></i></button>
          </div>
          <div class="tool-group">
            <button class="tool-btn" onclick="canvasModule.toggleGrid()" title="Toggle Grid (G)"><i class="fas fa-th"></i></button>
            <button class="tool-btn" onclick="canvasModule.showLayersPanel()" title="Manage Layers"><i class="fas fa-layer-group"></i></button>
          </div>
          <div class="tool-group">
            <button class="tool-btn" onclick="canvasModule.zoomIn()" title="Zoom In"><i class="fas fa-search-plus"></i></button>
            <button class="tool-btn" onclick="canvasModule.zoomOut()" title="Zoom Out"><i class="fas fa-search-minus"></i></button>
            <button class="tool-btn" onclick="canvasModule.resetZoom()" title="Reset View"><i class="fas fa-expand-arrows-alt"></i></button>
          </div>
          <div class="tool-group">
            <button class="btn btn--secondary btn--sm" onclick="canvasModule.loadImage()"><i class="fas fa-upload"></i> Image</button>
            <button class="btn btn--primary btn--sm" onclick="canvasModule.saveCanvas()"><i class="fas fa-save"></i> Save</button>
          </div>
        </div>
        <div class="canvas-wrapper">
          <canvas id="drawingCanvas"></canvas>
        </div>
      </div>
    `;
    
    // Initialize canvas after DOM update
    setTimeout(() => {
      if (window.canvasModule) {
        canvasModule.initCanvas();
      }
    }, 100);
}

  
  loadAudioPage(page) {
    page.innerHTML = `
      <div class="audio-container">
        <div class="audio-recorder">
          <h2>Voice Recorder</h2>
          <div class="recorder-display">
            <div class="waveform" id="waveform"></div>
            <div class="timer" id="recordingTimer">00:00</div>
          </div>
          <div class="recorder-controls">
            <button class="record-btn" id="recordBtn" onclick="audioModule.toggleRecording()">
              <i class="fas fa-microphone"></i>
            </button>
            <button class="btn btn--secondary" id="stopBtn" onclick="audioModule.stopRecording()" disabled>
              <i class="fas fa-stop"></i> Stop
            </button>
            <button class="btn btn--secondary" id="playBtn" onclick="audioModule.playRecording()" disabled>
              <i class="fas fa-play"></i> Play
            </button>
          </div>
        </div>
        <div class="audio-library">
          <h3>Audio Library</h3>
          <div id="audioList">
            ${this.data.notes.filter(note => note.type === 'audio').length === 0 ? 
              '<p class="text-center text-secondary">No audio recordings yet</p>' :
              this.data.notes.filter(note => note.type === 'audio').map(audio => this.createAudioCard(audio)).join('')
            }
          </div>
        </div>
      </div>
    `;
    
    // Initialize audio module
    setTimeout(() => {
      if (window.audioModule) {
        audioModule.init();
      }
    }, 100);
  }
  
  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
  
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }
  
  generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Toast notifications
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
      <i class="toast-icon ${icons[type]}"></i>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('visible'), 100);
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  // Event listeners
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.getAttribute('data-page');
        this.showPage(page);
      });
    });
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      this.toggleMobileSidebar();
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    
    // Quick note
    document.getElementById('quickNote').addEventListener('click', () => {
      this.showQuickNote();
    });
    
    // Full screen
    document.getElementById('fullScreenBtn').addEventListener('click', () => {
      this.toggleFullScreen();
    });
    
    // Lock screen
    this.setupLockScreen();
    
    // Quick search
    document.getElementById('quickSearch').addEventListener('input', (e) => {
      this.handleQuickSearch(e.target.value);
    });
    
    // Activity tracking for auto-lock
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        this.resetLockTimer();
      }, { passive: true });
    });
    
    // Quick actions
    document.querySelectorAll('.quick-action[data-action]').forEach(action => {
      action.addEventListener('click', (e) => {
        const actionType = action.getAttribute('data-action');
        this.handleQuickAction(actionType);
      });
    });
  }
  
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (this.isLocked) return;
      
      // Ctrl/Cmd + key combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            this.showQuickNote();
            break;
          case 'b':
            e.preventDefault();
            this.showPage('books');
            break;
          case 'f':
            e.preventDefault();
            document.getElementById('quickSearch').focus();
            break;
          case 'l':
            e.preventDefault();
            this.lockApp();
            break;
        }
      }
      
      // Escape key
      if (e.key === 'Escape') {
        this.closeModals();
      }
    });
  }
  
  // UI Helper methods
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  
  toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
  }
  
  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
  }
  
  showQuickNote() {
    const popup = document.getElementById('quickNotePopup');
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('visible'), 10);
    
    // Setup quick note handlers
    document.getElementById('closeQuickNote').onclick = () => this.hideQuickNote();
    document.getElementById('cancelQuickNote').onclick = () => this.hideQuickNote();
    document.getElementById('saveQuickNote').onclick = () => this.saveQuickNote();
  }
  
  hideQuickNote() {
    const popup = document.getElementById('quickNotePopup');
    popup.classList.remove('visible');
    setTimeout(() => {
      popup.classList.add('hidden');
      document.getElementById('quickNoteTitle').value = '';
      document.getElementById('quickNoteContent').value = '';
    }, 300);
  }
  
  saveQuickNote() {
    const title = document.getElementById('quickNoteTitle').value || 'Quick Note';
    const content = document.getElementById('quickNoteContent').value;
    
    if (!content.trim()) {
      this.showToast('Please enter some content', 'warning');
      return;
    }
    
    const note = {
      id: this.generateId(),
      title,
      content,
      type: 'text',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: [],
      bookmarked: false,
      encrypted: false
    };
    
    this.data.notes.push(note);
    this.saveData();
    this.updateUI();
    this.hideQuickNote();
    this.showToast('Note saved successfully!', 'success');
  }
  
  toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      document.getElementById('fullScreenBtn').innerHTML = '<i class="fas fa-compress"></i>';
    } else {
      document.exitFullscreen();
      document.getElementById('fullScreenBtn').innerHTML = '<i class="fas fa-expand"></i>';
    }
  }
  
  closeModals() {
    // Close quick note if open
    const quickNote = document.getElementById('quickNotePopup');
    if (quickNote.classList.contains('visible')) {
      this.hideQuickNote();
    }
  }
  
  handleQuickSearch(query) {
    if (query.length < 2) return;
    
    // This will be enhanced by the search module
    console.log('Quick search:', query);
  }
  
  handleQuickAction(action) {
    switch (action) {
      case 'newBook':
        this.createBook();
        break;
      case 'newNote':
        this.createNote();
        break;
      case 'newCanvas':
        this.showPage('canvas');
        break;
      case 'recordAudio':
        this.showPage('audio');
        break;
    }
  }
  
  updateUI() {
    this.updateStats();
    if (this.currentPage === 'dashboard') {
      this.loadDashboard();
    }
  }
  
  // Placeholder methods for other modules to implement
  createBook() {
    this.showToast('Book creation will be implemented in the editor module', 'info');
    this.showPage('books');
  }
  
  createNote() {
    this.showToast('Note creation will be implemented in the editor module', 'info');
    this.showPage('notes');
  }
  
  openBook(bookId) {
    console.log('Opening book:', bookId);
    this.showToast('Book editing will be implemented in the editor module', 'info');
  }
  
  // In app.js

  openNote(noteId) {
    console.log('Opening note:', noteId);
    this.showToast('Note editing will be implemented in the editor module', 'info');
  }

  // ===================================================================
  // == PASTE THE NEW SECURE DELETE FUNCTION HERE ======================
  // ===================================================================
  async deleteItem(itemId, itemType) {
    let item;
    let itemIndex;
    let dataArray;

    if (itemType === 'book') {
        dataArray = this.data.books;
    } else { // 'note', 'audio', etc.
        dataArray = this.data.notes;
    }

    itemIndex = dataArray.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
        this.showToast('Item not found.', 'error');
        return;
    }
    item = dataArray[itemIndex];

    // If item is encrypted, require Master Password
    if (item.encrypted) {
        if (!this.data.settings.masterPasswordHash) {
            this.showToast('A Master Password is required to delete encrypted items. Please set one in Security.', 'error');
            return;
        }

        const password = prompt("This item is encrypted. Please enter your Master Password to delete it:");
        if (!password) return; // User cancelled

        try {
            const enteredHash = await cryptoModule.hash(password);
            if (enteredHash !== this.data.settings.masterPasswordHash) {
                this.showToast('Incorrect Master Password. Deletion cancelled.', 'error');
                return;
            }
        } catch (e) {
            this.showToast('Could not verify password. Deletion cancelled.', 'error');
            return;
        }
    }
    // Standard confirmation for unencrypted items
    else if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
        return;
    }

    // Proceed with deletion
    dataArray.splice(itemIndex, 1);
    this.saveData();
    this.updateUI();
    this.showToast('Item deleted successfully.', 'success');
    
    // Refresh the current page view to show the item is gone
    this.loadPageContent(this.currentPage);
  }
  
  createBookCard(book) {
  let coverHtml = '';
  // Default to a book icon if cover is missing for older books
  const cover = book.cover || { type: 'icon', value: 'fas fa-book' };

  if (cover.type === 'image') {
    coverHtml = `<img src="${cover.value}" alt="Cover">`;
  } else if (cover.type === 'emoji') {
    coverHtml = `<span class="book-cover-emoji">${cover.value}</span>`;
  } else { // 'icon' is the default
    coverHtml = `<i class="${cover.value}"></i>`;
  }

  return `
    <div class="book-card" onclick="app.openBook('${book.id}')">
      <div class="book-cover">
        ${coverHtml}
      </div>
      <div class="book-info">
        <h3>${this.escapeHtml(book.title)}</h3>
        <p>${this.escapeHtml(book.description || 'No description')}</p>
        <small>Modified ${this.formatDate(book.lastModified)}</small>
      </div>
      ${book.encrypted ? '<div class="book-lock"><i class="fas fa-lock"></i></div>' : ''}
    </div>
  `;
}

  
  createNoteCard(note) {
    return `
      <div class="note-card" onclick="app.openNote('${note.id}')">
        <div class="note-header">
          <h4>${this.escapeHtml(note.title)}</h4>
          ${note.encrypted ? '<i class="fas fa-lock"></i>' : ''}
        </div>
        <div class="note-content">
          <p>${this.escapeHtml(this.stripHtml(note.content).substring(0, 150))}...</p>
        </div>
        <div class="note-footer">
          <small>Modified ${this.formatDate(note.lastModified)}</small>
          ${note.bookmarked ? '<i class="fas fa-bookmark"></i>' : ''}
        </div>
      </div>
    `;
  }
  
  createAudioCard(audio) {
    return `
      <div class="audio-card">
        <div class="audio-info">
          <h4>${this.escapeHtml(audio.title)}</h4>
          <small>Recorded ${this.formatDate(audio.created)}</small>
        </div>
        <div class="audio-controls">
          <button class="btn btn--sm" onclick="audioModule.playAudio('${audio.id}')">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
    `;
  }
  
  initializeDefaultTemplates() {
    const defaultTemplates = [
      {
        id: this.generateId(),
        name: 'Meeting Notes',
        type: 'text',
        content: `# Meeting Notes\n\n**Date:** \n**Attendees:** \n**Agenda:** \n\n## Discussion Points\n\n## Action Items\n\n## Next Steps\n`,
        description: 'Template for meeting notes'
      },
      {
        id: this.generateId(),
        name: 'Project Plan',
        type: 'text',
        content: `# Project Plan\n\n**Project Name:** \n**Start Date:** \n**End Date:** \n**Team Members:** \n\n## Objectives\n\n## Milestones\n\n## Resources Needed\n\n## Risks & Mitigation\n`,
        description: 'Template for project planning'
      },
      {
        id: this.generateId(),
        name: 'Daily Journal',
        type: 'text',
        content: `# Daily Journal - {{date}}\n\n## What I accomplished today:\n\n## What I learned:\n\n## What I'm grateful for:\n\n## Tomorrow's priorities:\n`,
        description: 'Template for daily journaling'
      }
    ];
    
    this.data.templates = defaultTemplates;
    this.saveData();
  }
  
  // Additional placeholder page loaders
  loadSearchPage(page) {
    page.innerHTML = `
      <div class="search-container">
        <div class="search-header">
          <h1>Advanced Search</h1>
          <div class="search-box">
            <input type="text" placeholder="Search notes, books, and more..." id="advancedSearch">
            <button class="search-btn"><i class="fas fa-search"></i></button>
          </div>
        </div>
        <div class="search-filters">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="books">Books</button>
          <button class="filter-btn" data-filter="notes">Notes</button>
          <button class="filter-btn" data-filter="audio">Audio</button>
        </div>
        <div class="search-results" id="searchResults">
          <p class="text-center text-secondary">Enter a search term to begin</p>
        </div>
      </div>
    `;
  }
  
  loadBookmarksPage(page) {
    const bookmarkedItems = [
      ...this.data.books.filter(book => book.bookmarked),
      ...this.data.notes.filter(note => note.bookmarked)
    ].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    
    page.innerHTML = `
      <div class="bookmarks-container">
        <h1>Bookmarks</h1>
        <div class="bookmarks-list">
          ${bookmarkedItems.length === 0 ? 
            '<div class="empty-state"><i class="fas fa-bookmark"></i><h3>No bookmarks yet</h3><p>Bookmark your favorite items to find them here</p></div>' :
            bookmarkedItems.map(item => this.createBookmarkCard(item)).join('')
          }
        </div>
      </div>
    `;
  }
  
  loadTagsPage(page) {
    const allTags = this.getAllTags();
    
    page.innerHTML = `
      <div class="tags-container">
        <h1>Tags</h1>
        <div class="tags-cloud">
          ${allTags.length === 0 ? 
            '<div class="empty-state"><i class="fas fa-tags"></i><h3>No tags yet</h3><p>Tags will appear here as you create content</p></div>' :
            allTags.map(tag => `<span class="tag-bubble" onclick="app.searchByTag('${tag.name}')">${tag.name} (${tag.count})</span>`).join('')
          }
        </div>
      </div>
    `;
  }
  
  loadTemplatesPage(page) {
    page.innerHTML = `
      <div class="templates-container">
        <div class="page-header">
          <h1>Templates</h1>
          <button class="btn btn--primary" onclick="app.createTemplate()">
            <i class="fas fa-plus"></i> New Template
          </button>
        </div>
        <div class="templates-grid">
          ${this.data.templates.map(template => this.createTemplateCard(template)).join('')}
        </div>
      </div>
    `;
  }
  
  loadSchedulerPage(page) {
    page.innerHTML = `
      <div class="scheduler-container">
        <div class="scheduler-header">
          <h1>Calendar</h1>
          <div class="view-controls">
            <button class="btn btn--secondary btn--sm active" data-view="month">Month</button>
            <button class="btn btn--secondary btn--sm" data-view="week">Week</button>
            <button class="btn btn--secondary btn--sm" data-view="day">Day</button>
          </div>
          <button class="btn btn--primary" onclick="schedulerModule.createEvent()">
            <i class="fas fa-plus"></i> New Event
          </button>
        </div>
        <div class="calendar-wrapper" id="calendarWrapper">
          <!-- Calendar will be rendered here -->
        </div>
      </div>
    `;
  }
  
  loadExportPage(page) {
    page.innerHTML = `
      <div class="export-container">
        <h1>Export &amp; Share</h1>
        <div class="export-options">
          <div class="export-section">
            <h3>Export Books</h3>
            <div class="export-formats">
              <button class="export-btn" onclick="exportModule.exportToPDF('books')">
                <i class="fas fa-file-pdf"></i> Export as PDF
              </button>
              <button class="export-btn" onclick="exportModule.exportToEPUB()">
                <i class="fas fa-book"></i> Export as EPUB
              </button>
              <button class="export-btn" onclick="exportModule.exportToHTML()">
                <i class="fas fa-code"></i> Export as HTML
              </button>
            </div>
          </div>
          <div class="export-section">
            <h3>Backup Data</h3>
            <div class="backup-options">
              <button class="export-btn" onclick="exportModule.backupData()">
                <i class="fas fa-download"></i> Download Backup
              </button>
              <button class="export-btn" onclick="exportModule.restoreData()">
                <i class="fas fa-upload"></i> Restore Backup
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
loadSecurityPage(page) {
    const hasMasterPassword = !!this.data.settings.masterPasswordHash;

    page.innerHTML = `
      <div class="security-container">
        <div class="page-header">
            <h1>Master Password & Encryption</h1>
            <p>Set one strong password to encrypt and decrypt all your sensitive data.</p>
        </div>
        <div class="security-grid">
            <div class="security-card">
                <div class="card-header">
                    <i class="fas fa-key"></i>
                    <h3>Master Password</h3>
                </div>
                <div class="card-body">
                    <p>
                        This single password is the key to all your encrypted items.
                        <strong>If you forget it, your encrypted data cannot be recovered.</strong>
                    </p>
                    <div class="setting-item">
                        <span>Status</span>
                        <span class="badge ${hasMasterPassword ? 'status--success' : 'status--error'}">
                            ${hasMasterPassword ? 'Set' : 'Not Set'}
                        </span>
                    </div>
                    <button class="btn btn--primary" onclick="securityModule.setupMasterPassword()">
                        ${hasMasterPassword ? 'Change Master Password' : 'Set Master Password'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    `;
}

  
  loadProfilePage(page) {
    page.innerHTML = `
      <div class="profile-container">
        <h1>Profile</h1>
        <div class="profile-content">
          <div class="profile-avatar-section">
            <div class="profile-avatar-large" id="profileAvatarLarge">
              ${this.data.settings.profile.avatar ? 
                `<img src="${this.data.settings.profile.avatar}" alt="Profile">` :
                '<i class="fas fa-user"></i>'
              }
            </div>
            <button class="btn btn--secondary" onclick="profileModule.changeAvatar()">
              Change Avatar
            </button>
          </div>
          <div class="profile-form">
            <div class="form-group">
              <label>Name</label>
              <input type="text" value="${this.data.settings.profile.name}" placeholder="Your name" onchange="profileModule.updateProfile('name', this.value)">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" value="${this.data.settings.profile.email}" placeholder="your@email.com" onchange="profileModule.updateProfile('email', this.value)">
            </div>
            <div class="form-group">
              <label>Bio</label>
              <textarea placeholder="Tell us about yourself..." onchange="profileModule.updateProfile('bio', this.value)">${this.data.settings.profile.bio}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Helper methods for template cards
  createBookmarkCard(item) {
    const isBook = item.chapters !== undefined;
    return `
      <div class="bookmark-card" onclick="app.${isBook ? 'openBook' : 'openNote'}('${item.id}')">
        <div class="bookmark-icon">
          <i class="fas fa-${isBook ? 'book' : 'sticky-note'}"></i>
        </div>
        <div class="bookmark-content">
          <h4>${this.escapeHtml(item.title)}</h4>
          <p>${this.escapeHtml(isBook ? item.description : this.stripHtml(item.content).substring(0, 100))}...</p>
          <small>Modified ${this.formatDate(item.lastModified)}</small>
        </div>
      </div>
    `;
  }
  
  getAllTags() {
    const tagCount = {};
    
    // Count tags from all items
    [...this.data.books, ...this.data.notes].forEach(item => {
      if (item.tags) {
        item.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagCount).map(([name, count]) => ({ name, count }));
  }
  
  createTemplateCard(template) {
    return `
      <div class="template-card" onclick="app.useTemplate('${template.id}')">
        <div class="template-header">
          <h4>${this.escapeHtml(template.name)}</h4>
          <div class="template-actions">
            <button class="btn btn--sm" onclick="event.stopPropagation(); app.editTemplate('${template.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn--sm" onclick="event.stopPropagation(); app.deleteTemplate('${template.id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="template-content">
          <p>${this.escapeHtml(template.description)}</p>
        </div>
      </div>
    `;
  }
  
  // Placeholder methods for template management
  createTemplate() {
    this.showToast('Template creation will be implemented', 'info');
  }
  
  useTemplate(templateId) {
    this.showToast('Template usage will be implemented', 'info');
  }
  
  editTemplate(templateId) {
    this.showToast('Template editing will be implemented', 'info');
  }
  
  deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template?')) {
      this.data.templates = this.data.templates.filter(t => t.id !== templateId);
      this.saveData();
      this.loadTemplatesPage(document.getElementById('templatesPage'));
      this.showToast('Template deleted', 'success');
    }
  }
  
  searchByTag(tagName) {
    this.showPage('search');
    // This will be enhanced by the search module
    this.showToast(`Searching for tag: ${tagName}`, 'info');
  }
  
  toggleAutoLock(enabled) {
    this.data.settings.autoLock = enabled;
    this.saveData();
    if (enabled) {
      this.resetLockTimer();
    } else {
      clearTimeout(this.lockTimer);
    }
    this.showToast(`Auto-lock ${enabled ? 'enabled' : 'disabled'}`, 'success');
  }
}

// Initialize the application
const app = new ShiroNotes();

// Make app globally available
window.app = app;