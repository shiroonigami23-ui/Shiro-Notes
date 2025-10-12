// ===== Rich Text Editor Functionality =====

class RichTextEditor {
    constructor() {
        this.editor = document.getElementById('noteEditor');
        this.currentNote = null;
        this.init();
    }

    init() {
        this.setupToolbar();
        this.setupHotkeys();
        this.setupInsertions();
    }

    setupToolbar() {
        // Format buttons
        document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                this.execCommand(command);
                btn.classList.toggle('active');
            });
        });

        // Font family
        document.getElementById('fontFamily')?.addEventListener('change', (e) => {
            this.execCommand('fontName', e.target.value);
        });

        // Font size
        document.getElementById('fontSize')?.addEventListener('change', (e) => {
            this.execCommand('fontSize', e.target.value);
        });

        // Text color
        document.getElementById('textColor')?.addEventListener('change', (e) => {
            this.execCommand('foreColor', e.target.value);
        });

        // Background color
        document.getElementById('bgColor')?.addEventListener('change', (e) => {
            this.execCommand('backColor', e.target.value);
        });

        // Save button
        document.getElementById('saveNoteBtn')?.addEventListener('click', () => {
            this.saveNote();
        });

        // Bookmark button
        document.getElementById('bookmarkNoteBtn')?.addEventListener('click', () => {
            this.toggleBookmark();
        });

        // Share button
        document.getElementById('shareNoteBtn')?.addEventListener('click', () => {
            this.showExportModal();
        });

        // Encrypt button
        document.getElementById('encryptNoteBtn')?.addEventListener('click', () => {
            this.toggleEncryption();
        });

        // Auto-save
        this.editor?.addEventListener('input', () => {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => {
                this.saveNote(true);
            }, 2000);
        });
    }

    setupHotkeys() {
        this.editor?.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCommand('underline');
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveNote();
                        break;
                }
            }
        });
    }

    setupInsertions() {
        // Insert Image
        document.getElementById('insertImageBtn')?.addEventListener('click', () => {
            this.insertImage();
        });

        // Insert Table
        document.getElementById('insertTableBtn')?.addEventListener('click', () => {
            this.insertTable();
        });

        // Insert Link
        document.getElementById('insertLinkBtn')?.addEventListener('click', () => {
            this.insertLink();
        });

        // Insert Code
        document.getElementById('insertCodeBtn')?.addEventListener('click', () => {
            this.insertCode();
        });
    }

    execCommand(command, value = null) {
        document.execCommand(command, false, value);
        this.editor?.focus();
    }

    insertImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.margin = '1rem 0';
                
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(img);
                    range.collapse(false);
                } else {
                    this.editor.appendChild(img);
                }
            };
            reader.readAsDataURL(file);
        };
        
        input.click();
    }

    insertTable() {
        const rows = prompt('Number of rows:', '3');
        const cols = prompt('Number of columns:', '3');
        
        if (!rows || !cols) return;

        let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1rem 0;">';
        for (let i = 0; i < rows; i++) {
            tableHTML += '<tr>';
            for (let j = 0; j < cols; j++) {
                tableHTML += '<td style="border: 1px solid var(--border); padding: 0.5rem;" contenteditable="true">&nbsp;</td>';
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</table>';

        this.execCommand('insertHTML', tableHTML);
    }

    insertLink() {
        const url = prompt('Enter URL:');
        if (!url) return;

        const text = prompt('Enter link text:', url);
        if (!text) return;

        const link = `<a href="${url}" target="_blank" style="color: var(--primary); text-decoration: underline;">${text}</a>`;
        this.execCommand('insertHTML', link);
    }

    insertCode() {
        const code = prompt('Enter code:');
        if (!code) return;

        const codeBlock = `<pre style="background: var(--surface); padding: 1rem; border-radius: var(--radius-md); overflow-x: auto; font-family: var(--font-mono); margin: 1rem 0;"><code>${this.escapeHtml(code)}</code></pre>`;
        this.execCommand('insertHTML', codeBlock);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveNote(silent = false) {
        if (!app.currentNote) return;

        const { book, chapter, note } = app.currentNote;
        
        note.title = document.getElementById('noteTitle').value || 'Untitled Note';
        note.content = this.editor.innerHTML;
        note.modifiedAt = new Date().toISOString();

        app.saveData('books');
        app.updateStats();
        app.loadRecentActivity();

        if (!silent) {
            app.showToast('Note saved successfully', 'success');
        }
    }

    toggleBookmark() {
        if (!app.currentNote) return;

        const { note } = app.currentNote;
        note.bookmarked = !note.bookmarked;

        const btn = document.getElementById('bookmarkNoteBtn');
        const icon = btn.querySelector('i');
        icon.className = note.bookmarked ? 'fas fa-bookmark' : 'far fa-bookmark';

        app.saveData('books');
        app.showToast(note.bookmarked ? 'Bookmarked' : 'Bookmark removed', 'success');
    }

    toggleEncryption() {
        if (!app.currentNote) return;

        const { note } = app.currentNote;
        
        if (note.encrypted) {
            // Decrypt
            const modal = document.getElementById('encryptModal');
            document.getElementById('encryptModalTitle').textContent = 'Decrypt Note';
            document.getElementById('confirmEncryptBtn').textContent = 'Decrypt';
            modal.classList.add('active');

            document.getElementById('confirmEncryptBtn').onclick = () => {
                const password = document.getElementById('encryptPassword').value;
                if (!password) {
                    app.showToast('Please enter password', 'error');
                    return;
                }

                try {
                    const decrypted = CryptoJS.AES.decrypt(note.content, password).toString(CryptoJS.enc.Utf8);
                    if (!decrypted) throw new Error('Invalid password');
                    
                    note.content = decrypted;
                    note.encrypted = false;
                    this.editor.innerHTML = decrypted;
                    
                    document.getElementById('encryptNoteBtn').querySelector('i').className = 'fas fa-lock-open';
                    app.saveData('books');
                    app.updateStats();
                    modal.classList.remove('active');
                    document.getElementById('encryptPassword').value = '';
                    app.showToast('Note decrypted', 'success');
                } catch (error) {
                    app.showToast('Decryption failed - wrong password', 'error');
                }
            };
        } else {
            // Encrypt
            const modal = document.getElementById('encryptModal');
            document.getElementById('encryptModalTitle').textContent = 'Encrypt Note';
            document.getElementById('confirmEncryptBtn').textContent = 'Encrypt';
            modal.classList.add('active');

            document.getElementById('confirmEncryptBtn').onclick = () => {
                const password = document.getElementById('encryptPassword').value;
                if (!password) {
                    app.showToast('Please enter password', 'error');
                    return;
                }

                const encrypted = CryptoJS.AES.encrypt(note.content, password).toString();
                note.content = encrypted;
                note.encrypted = true;
                
                this.editor.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;"><i class="fas fa-lock" style="font-size: 3rem; margin-bottom: 1rem;"></i><br>This note is encrypted</p>';
                
                document.getElementById('encryptNoteBtn').querySelector('i').className = 'fas fa-lock';
                app.saveData('books');
                app.updateStats();
                modal.classList.remove('active');
                document.getElementById('encryptPassword').value = '';
                app.showToast('Note encrypted successfully', 'success');
            };
        }
    }

    showExportModal() {
        const modal = document.getElementById('exportModal');
        modal.classList.add('active');

        document.querySelectorAll('.export-option').forEach(option => {
            option.onclick = () => {
                const format = option.dataset.format;
                this.exportNote(format);
                modal.classList.remove('active');
            };
        });
    }

    exportNote(format) {
        if (!app.currentNote) return;

        const { note } = app.currentNote;
        const title = note.title || 'untitled';

        switch (format) {
            case 'pdf':
                this.exportAsPDF(title, note.content);
                break;
            case 'png':
            case 'jpg':
                this.exportAsImage(title, note.content, format);
                break;
            case 'txt':
                this.exportAsText(title, note.content);
                break;
        }
    }

    exportAsPDF(title, content) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Simple text export
        const text = this.stripHtml(content);
        const lines = doc.splitTextToSize(text, 180);
        
        doc.setFontSize(16);
        doc.text(title, 15, 20);
        
        doc.setFontSize(12);
        doc.text(lines, 15, 35);
        
        doc.save(`${title}.pdf`);
        app.showToast('Exported as PDF', 'success');
    }

    exportAsImage(title, content, format) {
        const container = document.createElement('div');
        container.style.cssText = `
            width: 800px;
            padding: 40px;
            background: white;
            color: black;
            font-family: var(--font-serif);
            position: absolute;
            left: -9999px;
        `;
        container.innerHTML = `<h1>${title}</h1><div>${content}</div>`;
        document.body.appendChild(container);

        html2canvas(container).then(canvas => {
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${title}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(container);
                app.showToast(`Exported as ${format.toUpperCase()}`, 'success');
            }, `image/${format}`);
        });
    }

    exportAsText(title, content) {
        const text = this.stripHtml(content);
        const blob = new Blob([`${title}\n\n${text}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        app.showToast('Exported as Text', 'success');
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
}

// Initialize editor
const richTextEditor = new RichTextEditor();
