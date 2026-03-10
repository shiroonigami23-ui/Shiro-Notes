// Dashboard Module for Shiro Notes
class DashboardModule {
  constructor(app) {
    this.app = app;
  }
loadDashboardContent(pageElement) {
    pageElement.innerHTML = `
    <div class="dashboard">
        <div class="dashboard-header">
            <h1>Dashboard</h1>
            <p>Welcome back, ${this.app.escapeHtml(this.app.data.settings.profile.name) || 'User'}!</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon bg-1"><i class="fas fa-book"></i></div>
                <div class="stat-content">
                    <h3 id="totalBooks">0</h3>
                    <p>Total Books</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-2"><i class="fas fa-sticky-note"></i></div>
                <div class="stat-content">
                    <h3 id="totalNotes">0</h3>
                    <p>Total Notes</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-3"><i class="fas fa-calendar-alt"></i></div>
                <div class="stat-content">
                    <h3 id="totalEvents">0</h3>
                    <p>Upcoming Events</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-4"><i class="fas fa-lock"></i></div>
                <div class="stat-content">
                    <h3 id="encryptedItems">0</h3>
                    <p>Encrypted Items</p>
                </div>
            </div>
        </div>

        <div class="dashboard-content">
            <div class="dashboard-section quick-actions-section">
                <div class="section-header"><h2>Quick Actions</h2></div>
                <div class="quick-actions">
                    <button class="quick-action" data-action="newBook"><i class="fas fa-book-medical"></i><span>New Book</span></button>
                    <button class="quick-action" data-action="newNote"><i class="fas fa-file-alt"></i><span>New Note</span></button>
                    <button class="quick-action" data-action="newCanvas"><i class="fas fa-paint-brush"></i><span>New Canvas</span></button>
                    <button class="quick-action" data-action="recordAudio"><i class="fas fa-microphone"></i><span>Record Audio</span></button>
                </div>
            </div>

            <div class="dashboard-section recent-books-section">
                <div class="section-header">
                    <h2>Recent Books</h2>
                    <button class="btn btn--secondary btn--sm" data-page="books">View All</button>
                </div>
                <div class="recent-items-list" id="recentBooks">
                    </div>
            </div>

            <div class="dashboard-section recent-notes-section">
                <div class="section-header">
                    <h2>Recent Notes</h2>
                    <button class="btn btn--secondary btn--sm" data-page="notes">View All</button>
                </div>
                <div class="recent-items-list" id="recentNotes">
                    </div>
            </div>
        </div>
    </div>
    `;
    // Now populate the data
    this.populateDashboardData();
}
  
populateDashboardData() {
    this.updateStats();
    this.loadRecentBooks();
    this.loadRecentNotes();
    this.setupDashboardEventListeners(); // Add listener setup
}


  // Update dashboard stats
  updateStats() {
    // Ensure elements exist before updating
    const totalBooksEl = document.getElementById('totalBooks');
    const totalNotesEl = document.getElementById('totalNotes');
    const totalEventsEl = document.getElementById('totalEvents');
    const encryptedItemsEl = document.getElementById('encryptedItems');
    const booksCountEl = document.getElementById('booksCount');
    const notesCountEl = document.getElementById('notesCount');

    if (totalBooksEl) totalBooksEl.textContent = this.app.data.books.length;
    if (totalNotesEl) totalNotesEl.textContent = this.app.data.notes.length;
    if (totalEventsEl) totalEventsEl.textContent = this.app.data.events.length;
    if (encryptedItemsEl) encryptedItemsEl.textContent = this.getEncryptedItemsCount();

    // Update sidebar counts
    if (booksCountEl) booksCountEl.textContent = this.app.data.books.length;
    if (notesCountEl) notesCountEl.textContent = this.app.data.notes.length;
  }

  // Count encrypted items
  getEncryptedItemsCount() {
    let count = 0;
    count += this.app.data.books.filter(book => book.encrypted).length;
    count += this.app.data.notes.filter(note => note.encrypted).length;
    // Add other types if they can be encrypted
    return count;
  }

  // Load recent books section
  loadRecentBooks() {
    const container = document.getElementById('recentBooks');
    if (!container) return; // Exit if container doesn't exist

    const recentBooks = this.app.data.books
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 3); // Show top 3

    if (recentBooks.length === 0) {
      container.innerHTML = '<p class="empty-state text-center text-secondary"><i class="fas fa-book"></i><br>No books yet.<br><button class="btn btn--primary btn--sm mt-4" onclick="window.editorModule?.createBook()">Create your first book!</button></p>';
      return;
    }

    container.innerHTML = recentBooks.map(book => `
      <div class="recent-item" onclick="app.openBook('${book.id}')" title="Open ${this.app.escapeHtml(book.title)}">
        <div class="item-icon bg-1">
          <i class="fas fa-book"></i>
        </div>
        <div class="item-content">
          <h4>${this.app.escapeHtml(book.title)}</h4>
          <p>${this.app.escapeHtml(book.description || 'No description').substring(0, 100)}${book.description && book.description.length > 100 ? '...' : ''}</p>
          <small>Modified ${this.app.formatDate(book.lastModified)}</small>
        </div>
        ${book.encrypted ? '<i class="fas fa-lock item-lock" title="Encrypted"></i>' : ''}
      </div>
    `).join('');
  }

  // Load recent notes section
  loadRecentNotes() {
    const container = document.getElementById('recentNotes');
    if (!container) return; // Exit if container doesn't exist

    const recentNotes = this.app.data.notes
      .filter(note => note.type !== 'audio') // Exclude audio notes from recent text notes
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 3); // Show top 3

    if (recentNotes.length === 0) {
      container.innerHTML = '<p class="empty-state text-center text-secondary"><i class="fas fa-sticky-note"></i><br>No notes yet.<br><button class="btn btn--primary btn--sm mt-4" onclick="window.editorModule?.createNote()">Create your first note!</button></p>';
      return;
    }

    container.innerHTML = recentNotes.map(note => `
      <div class="recent-item" onclick="app.openNote('${note.id}')" title="Open ${this.app.escapeHtml(note.title)}">
        <div class="item-icon bg-2">
          <i class="fas fa-sticky-note"></i>
        </div>
        <div class="item-content">
          <h4>${this.app.escapeHtml(note.title)}</h4>
          <p>${this.app.escapeHtml(this.app.stripHtml(note.content || '').substring(0, 100))}...</p>
          <small>Modified ${this.app.formatDate(note.lastModified)}</small>
        </div>
        ${note.encrypted ? '<i class="fas fa-lock item-lock" title="Encrypted"></i>' : ''}
      </div>
    `).join('');
  }

  // Setup event listeners specific to the dashboard
  setupDashboardEventListeners() {
    const dashboardPage = document.getElementById('dashboardPage');
    if (!dashboardPage) return;

    // Delegate quick action clicks
    const quickActionsContainer = dashboardPage.querySelector('.quick-actions');
    if (quickActionsContainer) {
      quickActionsContainer.addEventListener('click', (e) => {
        const actionButton = e.target.closest('.quick-action[data-action]');
        if (actionButton) {
          const actionType = actionButton.getAttribute('data-action');
          this.handleQuickAction(actionType);
        }
      });
    }

    // Delegate 'View All' button clicks
     const sectionHeaders = dashboardPage.querySelectorAll('.section-header');
     sectionHeaders.forEach(header => {
       const viewAllButton = header.querySelector('button[data-page]');
       if (viewAllButton) {
         // Check if listener already exists to prevent duplicates
         if (!viewAllButton.dataset.listenerAttached) {
           viewAllButton.addEventListener('click', (e) => {
             const page = e.target.closest('button').getAttribute('data-page');
             this.app.showPage(page);
           });
           viewAllButton.dataset.listenerAttached = 'true'; // Mark as attached
         }
       }
     });
  }

  // Handle quick actions from the dashboard
  handleQuickAction(action) {
    switch (action) {
      case 'newBook':
        window.editorModule?.createBook();
        break;
      case 'newNote':
        window.editorModule?.createNote();
        break;
      case 'newCanvas':
        this.app.showPage('canvas');
        break;
      case 'recordAudio':
        this.app.showPage('audio');
        break;
    }
  }
}

// Initialize the module and attach it to the window or app instance
// Ensure 'app' is globally available or passed correctly
if (window.app) {
    window.dashboardModule = new DashboardModule(window.app);
} else {
    console.error("Main app instance not found for DashboardModule initialization.");
}
