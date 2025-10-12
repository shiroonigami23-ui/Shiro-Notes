// ===== Shiro Notes - Main Application Logic =====

class ShiroNotes {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentBook = null;
        this.currentNote = null;
        this.currentCanvas = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.checkLockScreen();
        this.updateStats();
        this.loadRecentActivity();
    }

    // ===== Data Management =====
    loadData() {
        this.data = {
            user: JSON.parse(localStorage.getItem('shiro_user')) || {
                name: 'Student',
                email: '',
                bio: '',
                avatar: 'assets/default-avatar.png'
            },
            books: JSON.parse(localStorage.getItem('shiro_books')) || [],
            folders: JSON.parse(localStorage.getItem('shiro_folders')) || [],
            tags: JSON.parse(localStorage.getItem('shiro_tags')) || [],
            drawings: JSON.parse(localStorage.getItem('shiro_drawings')) || [],
            events: JSON.parse(localStorage.getItem('shiro_events')) || [],
            settings: JSON.parse(localStorage.getItem('shiro_settings')) || {
                theme: 'light',
                passcode: null,
                autoLock: false
            }
        };
    }

    saveData(key) {
        localStorage.setItem(`shiro_${key}`, JSON.stringify(this.data[key]));
    }

    // ===== Event Listeners =====
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                if (page) {
                    this.showPage(page);
                }
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('open');
            });
        }

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Dashboard actions
        document.getElementById('newBookBtn')?.addEventListener('click', () => this.createBook());
        document.getElementById('newNoteBtn')?.addEventListener('click', () => this.createQuickNote());
        document.getElementById('createBookBtn')?.addEventListener('click', () => this.createBook());
        
        // Profile
        document.getElementById('saveProfileBtn')?.addEventListener('click', () => this.saveProfile());
        document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => {
            document.getElementById('avatarUpload').click();
        });
        document.getElementById('avatarUpload')?.addEventListener('change', (e) => this.uploadAvatar(e));
        document.getElementById('chooseAvatarBtn')?.addEventListener('click', () => this.showAvatarModal());

        // Settings
        document.getElementById('themeSelect')?.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });
        document.getElementById('setPasscodeBtn')?.addEventListener('click', () => this.setPasscode());
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportAllData());
        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            document.getElementById('importDataInput').click();
        });
        document.getElementById('importDataInput')?.addEventListener('change', (e) => this.importData(e));

        // Search
        document.getElementById('globalSearch')?.addEventListener('input', (e) => {
            this.globalSearch(e.target.value);
        });
        document.getElementById('bookSearch')?.addEventListener('input', (e) => {
            this.filterBooks(e.target.value);
        });
        document.getElementById('bookSort')?.addEventListener('change', (e) => {
            this.sortBooks(e.target.value);
        });

        // Folders and Tags
        document.getElementById('createFolderBtn')?.addEventListener('click', () => this.createFolder());
        document.getElementById('createTagBtn')?.addEventListener('click', () => this.createTag());

        // Modal handlers
        document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        });

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    // ===== Lock Screen =====
    checkLockScreen() {
        const passcode = this.data.settings.passcode;
        const lockScreen = document.getElementById('lockScreen');
        
        if (passcode) {
            lockScreen.classList.remove('hidden');
            document.getElementById('appContainer').style.display = 'none';
            this.setupLockScreen();
        } else {
            lockScreen.classList.add('hidden');
            document.getElementById('appContainer').style.display = 'flex';
        }
    }

    setupLockScreen() {
        const input = document.getElementById('passcodeInput');
        const dots = document.querySelectorAll('.passcode-dots .dot');
        const unlockBtn = document.getElementById('unlockBtn');

        input.addEventListener('input', (e) => {
            const value = e.target.value;
            dots.forEach((dot, i) => {
                if (i < value.length) {
                    dot.classList.add('filled');
                } else {
                    dot.classList.remove('filled');
                }
            });
        });

        unlockBtn.addEventListener('click', () => {
            if (input.value === this.data.settings.passcode) {
                document.getElementById('lockScreen').classList.add('hidden');
                document.getElementById('appContainer').style.display = 'flex';
                input.value = '';
                dots.forEach(dot => dot.classList.remove('filled'));
            } else {
                this.showToast('Incorrect passcode', 'error');
                input.value = '';
                dots.forEach(dot => dot.classList.remove('filled'));
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                unlockBtn.click();
            }
        });
    }

    // ===== Navigation =====
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page
        const page = document.getElementById(`${pageName}Page`);
        if (page) {
            page.classList.add('active');
        }

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

        this.currentPage = pageName;

        // Load page data
        switch (pageName) {
            case 'books':
                this.loadBooks();
                break;
            case 'folders':
                this.loadFolders();
                break;
            case 'tags':
                this.loadTags();
                break;
            case 'encrypted':
                this.loadEncrypted();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // ===== Theme Management =====
    toggleTheme() {
        const body = document.body;
        const icon = document.querySelector('#themeToggle i');
        
        if (body.classList.contains('light-theme')) {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            this.data.settings.theme = 'dark';
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            this.data.settings.theme = 'light';
        }
        
        this.saveData('settings');
    }

    setTheme(theme) {
        const body = document.body;
        const icon = document.querySelector('#themeToggle i');
        
        body.classList.remove('light-theme', 'dark-theme');
        
        if (theme === 'dark') {
            body.classList.add('dark-theme');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else if (theme === 'light') {
            body.classList.add('light-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        } else if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
            icon.classList.toggle('fa-sun', prefersDark);
            icon.classList.toggle('fa-moon', !prefersDark);
        }
        
        this.data.settings.theme = theme;
        this.saveData('settings');
    }

    // ===== Books Management =====
    createBook() {
        const title = prompt('Enter book title:');
        if (!title) return;

        const book = {
            id: Date.now().toString(),
            title: title,
            icon: 'fa-book',
            color: this.getRandomGradient(),
            chapters: [],
            encrypted: false,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        this.data.books.push(book);
        this.saveData('books');
        this.loadBooks();
        this.updateStats();
        this.showToast('Book created successfully', 'success');
    }

    loadBooks() {
        const container = document.getElementById('booksList');
        if (!container) return;

        if (this.data.books.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <p>No books yet</p>
                    <button class="btn-primary" onclick="app.createBook()">Create Your First Book</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.books.map(book => `
            <div class="book-card" onclick="app.openBook('${book.id}')">
                <div class="book-cover" style="background: ${book.color}">
                    <i class="fas ${book.icon}"></i>
                    ${book.encrypted ? '<span class="encrypted-badge"><i class="fas fa-lock"></i></span>' : ''}
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <div class="book-meta">
                        <span><i class="fas fa-file-alt"></i> ${book.chapters.length} chapters</span>
                        <span><i class="fas fa-clock"></i> ${this.formatDate(book.modifiedAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openBook(bookId) {
        const book = this.data.books.find(b => b.id === bookId);
        if (!book) return;

        this.currentBook = book;
        document.getElementById('bookTitle').textContent = book.title;
        this.loadChapters();
        this.showPage('bookDetail');
    }

    loadChapters() {
        const container = document.getElementById('chaptersList');
        if (!container || !this.currentBook) return;

        const addChapterBtn = document.getElementById('addChapterBtn');
        if (addChapterBtn) {
            addChapterBtn.onclick = () => this.createChapter();
        }

        if (this.currentBook.chapters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>No chapters yet</p>
                    <button class="btn-primary" onclick="app.createChapter()">Add First Chapter</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.currentBook.chapters.map(chapter => `
            <div class="chapter-item" onclick="app.openChapter('${chapter.id}')">
                <div class="chapter-info">
                    <i class="fas fa-file-alt"></i>
                    <div>
                        <h4>${chapter.title}</h4>
                        <p style="font-size: 0.875rem; color: var(--text-secondary)">
                            ${chapter.notes.length} notes • ${this.formatDate(chapter.modifiedAt)}
                        </p>
                    </div>
                </div>
                <div class="chapter-actions">
                    ${chapter.encrypted ? '<i class="fas fa-lock" style="color: var(--warning)"></i>' : ''}
                    <button class="icon-btn" onclick="event.stopPropagation(); app.deleteChapter('${chapter.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    createChapter() {
        if (!this.currentBook) return;

        const title = prompt('Enter chapter title:');
        if (!title) return;

        const chapter = {
            id: Date.now().toString(),
            title: title,
            notes: [],
            encrypted: false,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        this.currentBook.chapters.push(chapter);
        this.currentBook.modifiedAt = new Date().toISOString();
        this.saveData('books');
        this.loadChapters();
        this.showToast('Chapter created successfully', 'success');
    }

    openChapter(chapterId) {
        if (!this.currentBook) return;

        const chapter = this.currentBook.chapters.find(c => c.id === chapterId);
        if (!chapter) return;

        // For simplicity, open the first note or create one
        if (chapter.notes.length > 0) {
            this.openNote(this.currentBook.id, chapterId, chapter.notes[0].id);
        } else {
            const note = {
                id: Date.now().toString(),
                title: 'Untitled Note',
                content: '',
                encrypted: false,
                bookmarked: false,
                tags: [],
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            };
            chapter.notes.push(note);
            this.saveData('books');
            this.openNote(this.currentBook.id, chapterId, note.id);
        }
    }

    deleteChapter(chapterId) {
        if (!this.currentBook) return;
        if (!confirm('Are you sure you want to delete this chapter?')) return;

        const index = this.currentBook.chapters.findIndex(c => c.id === chapterId);
        if (index > -1) {
            this.currentBook.chapters.splice(index, 1);
            this.currentBook.modifiedAt = new Date().toISOString();
            this.saveData('books');
            this.loadChapters();
            this.showToast('Chapter deleted', 'success');
        }
    }

    openNote(bookId, chapterId, noteId) {
        const book = this.data.books.find(b => b.id === bookId);
        if (!book) return;

        const chapter = book.chapters.find(c => c.id === chapterId);
        if (!chapter) return;

        const note = chapter.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNote = { book, chapter, note };
        
        // Load note in editor
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteEditor').innerHTML = note.content || '';
        
        // Update bookmark button
        const bookmarkBtn = document.getElementById('bookmarkNoteBtn');
        if (bookmarkBtn) {
            const icon = bookmarkBtn.querySelector('i');
            icon.className = note.bookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';
        }

        // Setup editor back button
        document.getElementById('editorBackBtn').onclick = () => {
            this.openBook(bookId);
        };

        this.showPage('editor');
    }

    createQuickNote() {
        const title = prompt('Enter note title:');
        if (!title) return;

        // Create a default book if none exists
        if (this.data.books.length === 0) {
            this.data.books.push({
                id: Date.now().toString(),
                title: 'Quick Notes',
                icon: 'fa-sticky-note',
                color: this.getRandomGradient(),
                chapters: [],
                encrypted: false,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            });
        }

        const book = this.data.books[0];
        
        // Create a default chapter if none exists
        if (book.chapters.length === 0) {
            book.chapters.push({
                id: Date.now().toString(),
                title: 'Notes',
                notes: [],
                encrypted: false,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString()
            });
        }

        const chapter = book.chapters[0];
        
        const note = {
            id: Date.now().toString(),
            title: title,
            content: '',
            encrypted: false,
            bookmarked: false,
            tags: [],
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        chapter.notes.push(note);
        this.saveData('books');
        this.openNote(book.id, chapter.id, note.id);
        this.showToast('Note created successfully', 'success');
    }

    // ===== Folders & Tags =====
    createFolder() {
        const name = prompt('Enter folder name:');
        if (!name) return;

        const folder = {
            id: Date.now().toString(),
            name: name,
            items: [],
            createdAt: new Date().toISOString()
        };

        this.data.folders.push(folder);
        this.saveData('folders');
        this.loadFolders();
        this.showToast('Folder created successfully', 'success');
    }

    loadFolders() {
        const container = document.getElementById('foldersList');
        if (!container) return;

        if (this.data.folders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder"></i>
                    <p>No folders yet</p>
                    <button class="btn-primary" onclick="app.createFolder()">Create Your First Folder</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.folders.map(folder => `
            <div class="folder-card" onclick="app.openFolder('${folder.id}')">
                <i class="fas fa-folder"></i>
                <h3>${folder.name}</h3>
                <p>${folder.items.length} items</p>
            </div>
        `).join('');
    }

    createTag() {
        const name = prompt('Enter tag name:');
        if (!name) return;

        const tag = {
            id: Date.now().toString(),
            name: name,
            color: this.getRandomColor(),
            createdAt: new Date().toISOString()
        };

        this.data.tags.push(tag);
        this.saveData('tags');
        this.loadTags();
        this.showToast('Tag created successfully', 'success');
    }

    loadTags() {
        const container = document.getElementById('tagsList');
        if (!container) return;

        if (this.data.tags.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>No tags yet</p>
                    <button class="btn-primary" onclick="app.createTag()">Create Your First Tag</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.tags.map(tag => `
            <div class="tag-card" onclick="app.openTag('${tag.id}')">
                <i class="fas fa-tag" style="color: ${tag.color}"></i>
                <h3>${tag.name}</h3>
            </div>
        `).join('');
    }

    // ===== Profile =====
    loadProfile() {
        document.getElementById('profileAvatar').src = this.data.user.avatar;
        document.getElementById('userName').value = this.data.user.name || '';
        document.getElementById('userEmail').value = this.data.user.email || '';
        document.getElementById('userBio').value = this.data.user.bio || '';
    }

    saveProfile() {
        this.data.user.name = document.getElementById('userName').value;
        this.data.user.email = document.getElementById('userEmail').value;
        this.data.user.bio = document.getElementById('userBio').value;
        
        this.saveData('user');
        this.updateProfileDisplay();
        this.showToast('Profile saved successfully', 'success');
    }

    updateProfileDisplay() {
        document.getElementById('sidebarAvatar').src = this.data.user.avatar;
        document.getElementById('topBarAvatar').src = this.data.user.avatar;
        document.getElementById('sidebarName').textContent = this.data.user.name;
    }

    uploadAvatar(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            this.data.user.avatar = event.target.result;
            this.saveData('user');
            this.updateProfileDisplay();
            document.getElementById('profileAvatar').src = event.target.result;
            this.showToast('Avatar uploaded successfully', 'success');
        };
        reader.readAsDataURL(file);
    }

    showAvatarModal() {
        const modal = document.getElementById('avatarModal');
        const grid = document.getElementById('avatarGrid');
        
        const avatars = [
            'assets/avatar1.png',
            'assets/avatar2.png',
            'assets/avatar3.png',
            'assets/avatar4.png',
            'assets/avatar5.png',
            'assets/avatar6.png',
            'assets/avatar7.png',
            'assets/avatar8.png'
        ];

        grid.innerHTML = avatars.map(avatar => `
            <div class="avatar-option" onclick="app.selectAvatar('${avatar}')">
                <img src="${avatar}" alt="Avatar" onerror="this.src='assets/default-avatar.png'">
            </div>
        `).join('');

        modal.classList.add('active');
    }

    selectAvatar(avatar) {
        this.data.user.avatar = avatar;
        this.saveData('user');
        this.updateProfileDisplay();
        document.getElementById('profileAvatar').src = avatar;
        document.getElementById('avatarModal').classList.remove('active');
        this.showToast('Avatar changed successfully', 'success');
    }

    // ===== Settings =====
    loadSettings() {
        document.getElementById('themeSelect').value = this.data.settings.theme || 'light';
    }

    setPasscode() {
        const passcode = prompt('Enter a 6-digit passcode:');
        if (!passcode || passcode.length !== 6 || !/^\d+$/.test(passcode)) {
            this.showToast('Please enter a valid 6-digit passcode', 'error');
            return;
        }

        this.data.settings.passcode = passcode;
        this.saveData('settings');
        this.showToast('Passcode set successfully', 'success');
    }

    // ===== Stats & Activity =====
    updateStats() {
        let totalNotes = 0;
        this.data.books.forEach(book => {
            book.chapters.forEach(chapter => {
                totalNotes += chapter.notes.length;
            });
        });

        let totalEncrypted = 0;
        this.data.books.forEach(book => {
            if (book.encrypted) totalEncrypted++;
            book.chapters.forEach(chapter => {
                if (chapter.encrypted) totalEncrypted++;
                chapter.notes.forEach(note => {
                    if (note.encrypted) totalEncrypted++;
                });
            });
        });

        document.getElementById('totalBooks').textContent = this.data.books.length;
        document.getElementById('totalNotes').textContent = totalNotes;
        document.getElementById('totalDrawings').textContent = this.data.drawings.length;
        document.getElementById('totalEncrypted').textContent = totalEncrypted;
    }

    loadRecentActivity() {
        const container = document.getElementById('recentList');
        if (!container) return;

        const recent = [];
        
        this.data.books.forEach(book => {
            book.chapters.forEach(chapter => {
                chapter.notes.forEach(note => {
                    recent.push({
                        type: 'note',
                        title: note.title,
                        subtitle: `${book.title} / ${chapter.title}`,
                        date: note.modifiedAt,
                        id: note.id,
                        bookId: book.id,
                        chapterId: chapter.id
                    });
                });
            });
        });

        recent.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No recent activity</p>
                    <button class="btn-primary" onclick="app.showPage('books')">Create Your First Book</button>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.slice(0, 10).map(item => `
            <div class="chapter-item" onclick="app.openNote('${item.bookId}', '${item.chapterId}', '${item.id}')">
                <div class="chapter-info">
                    <i class="fas fa-file-alt"></i>
                    <div>
                        <h4>${item.title}</h4>
                        <p style="font-size: 0.875rem; color: var(--text-secondary)">${item.subtitle}</p>
                    </div>
                </div>
                <span style="font-size: 0.875rem; color: var(--text-secondary)">${this.formatDate(item.date)}</span>
            </div>
        `).join('');
    }

    loadEncrypted() {
        const container = document.getElementById('encryptedList');
        if (!container) return;

        const encrypted = [];

        this.data.books.forEach(book => {
            book.chapters.forEach(chapter => {
                chapter.notes.forEach(note => {
                    if (note.encrypted) {
                        encrypted.push({
                            type: 'note',
                            title: note.title,
                            subtitle: `${book.title} / ${chapter.title}`,
                            id: note.id,
                            bookId: book.id,
                            chapterId: chapter.id
                        });
                    }
                });
            });
        });

        if (encrypted.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <p>No encrypted items</p>
                </div>
            `;
            return;
        }

        container.innerHTML = encrypted.map(item => `
            <div class="encrypted-item" onclick="app.openNote('${item.bookId}', '${item.chapterId}', '${item.id}')">
                <div>
                    <h4>${item.title}</h4>
                    <p style="font-size: 0.875rem; color: var(--text-secondary)">${item.subtitle}</p>
                </div>
                <i class="fas fa-lock"></i>
            </div>
        `).join('');
    }

    // ===== Search & Filter =====
    globalSearch(query) {
        if (!query) {
            this.loadRecentActivity();
            return;
        }

        const results = [];
        query = query.toLowerCase();

        this.data.books.forEach(book => {
            if (book.title.toLowerCase().includes(query)) {
                results.push({
                    type: 'book',
                    title: book.title,
                    id: book.id
                });
            }

            book.chapters.forEach(chapter => {
                if (chapter.title.toLowerCase().includes(query)) {
                    results.push({
                        type: 'chapter',
                        title: chapter.title,
                        subtitle: book.title,
                        bookId: book.id,
                        id: chapter.id
                    });
                }

                chapter.notes.forEach(note => {
                    if (note.title.toLowerCase().includes(query) || 
                        note.content.toLowerCase().includes(query)) {
                        results.push({
                            type: 'note',
                            title: note.title,
                            subtitle: `${book.title} / ${chapter.title}`,
                            id: note.id,
                            bookId: book.id,
                            chapterId: chapter.id
                        });
                    }
                });
            });
        });

        console.log('Search results:', results);
    }

    filterBooks(query) {
        const books = query ? 
            this.data.books.filter(b => b.title.toLowerCase().includes(query.toLowerCase())) :
            this.data.books;

        const container = document.getElementById('booksList');
        if (books.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No books found</p></div>';
            return;
        }

        container.innerHTML = books.map(book => `
            <div class="book-card" onclick="app.openBook('${book.id}')">
                <div class="book-cover" style="background: ${book.color}">
                    <i class="fas ${book.icon}"></i>
                    ${book.encrypted ? '<span class="encrypted-badge"><i class="fas fa-lock"></i></span>' : ''}
                </div>
                <div class="book-info">
                    <h3 class="book-title">${book.title}</h3>
                    <div class="book-meta">
                        <span><i class="fas fa-file-alt"></i> ${book.chapters.length} chapters</span>
                        <span><i class="fas fa-clock"></i> ${this.formatDate(book.modifiedAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    sortBooks(sortBy) {
        const books = [...this.data.books];

        switch(sortBy) {
            case 'name':
                books.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'created':
                books.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'recent':
            default:
                books.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
                break;
        }

        this.data.books = books;
        this.loadBooks();
    }

    // ===== Data Import/Export =====
    exportAllData() {
        const data = {
            user: this.data.user,
            books: this.data.books,
            folders: this.data.folders,
            tags: this.data.tags,
            drawings: this.data.drawings,
            events: this.data.events,
            settings: this.data.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shiro-notes-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully', 'success');
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (confirm('This will replace all current data. Continue?')) {
                    this.data = {
                        user: data.user || this.data.user,
                        books: data.books || [],
                        folders: data.folders || [],
                        tags: data.tags || [],
                        drawings: data.drawings || [],
                        events: data.events || [],
                        settings: data.settings || this.data.settings
                    };

                    Object.keys(this.data).forEach(key => {
                        this.saveData(key);
                    });

                    this.updateProfileDisplay();
                    this.updateStats();
                    this.loadRecentActivity();
                    
                    this.showToast('Data imported successfully', 'success');
                }
            } catch (error) {
                this.showToast('Invalid data file', 'error');
            }
        };
        reader.readAsText(file);
    }

    // ===== Utility Functions =====
    getRandomGradient() {
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
        ];
        return gradients[Math.floor(Math.random() * gradients.length)];
    }

    getRandomColor() {
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#fa709a', '#fee140', '#30cfd0', '#330867'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// ===== Initialize App =====
const app = new ShiroNotes();

// Make functions globally accessible
window.showPage = (page) => app.showPage(page);
window.app = app;

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
