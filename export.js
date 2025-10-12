// ===== Export Functionality =====

class ExportManager {
    constructor() {
        this.init();
    }

    init() {
        // Export functions are called from editor.js and other modules
    }

    exportToPDF(title, content) {
        if (typeof jsPDF === 'undefined') {
            app.showToast('PDF library not loaded', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text(title, 20, 20);
        
        // Content
        doc.setFontSize(12);
        const text = this.stripHtml(content);
        const lines = doc.splitTextToSize(text, 170);
        doc.text(lines, 20, 40);
        
        doc.save(`${title}.pdf`);
        app.showToast('Exported as PDF', 'success');
    }

    exportToImage(title, content, format = 'png') {
        if (typeof html2canvas === 'undefined') {
            app.showToast('Image export library not loaded', 'error');
            return;
        }

        const container = document.createElement('div');
        container.style.cssText = `
            width: 800px;
            padding: 40px;
            background: white;
            color: black;
            font-family: var(--font-serif);
            position: absolute;
            left: -9999px;
            top: 0;
        `;
        
        container.innerHTML = `
            <h1 style="margin-bottom: 20px; font-size: 32px;">${title}</h1>
            <div style="line-height: 1.6;">${content}</div>
        `;
        
        document.body.appendChild(container);

        html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2
        }).then(canvas => {
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

    exportToText(title, content) {
        const text = this.stripHtml(content);
        const fullText = `${title}\n${'='.repeat(title.length)}\n\n${text}`;
        
        const blob = new Blob([fullText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        app.showToast('Exported as Text', 'success');
    }

    exportBook(bookId, format = 'pdf') {
        const book = app.data.books.find(b => b.id === bookId);
        if (!book) return;

        let content = `<h1>${book.title}</h1>`;
        
        book.chapters.forEach(chapter => {
            content += `<h2>${chapter.title}</h2>`;
            chapter.notes.forEach(note => {
                content += `<h3>${note.title}</h3>`;
                content += note.content;
            });
        });

        switch (format) {
            case 'pdf':
                this.exportToPDF(book.title, content);
                break;
            case 'png':
            case 'jpg':
                this.exportToImage(book.title, content, format);
                break;
            case 'txt':
                this.exportToText(book.title, content);
                break;
        }
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    shareEncryptedNote(noteContent, password) {
        const encrypted = cryptoManager.encryptText(noteContent, password);
        if (!encrypted) {
            app.showToast('Encryption failed', 'error');
            return;
        }

        const message = btoa(JSON.stringify({
            encrypted: encrypted,
            app: 'Shiro Notes',
            timestamp: new Date().toISOString()
        }));

        const shareText = `Encrypted message from Shiro Notes:\n\n${message}\n\nUse the same password to decrypt.`;
        
        cryptoManager.copyToClipboard(shareText);
        app.showToast('Encrypted message copied to clipboard', 'success');
    }

    decryptSharedMessage(message, password) {
        try {
            const data = JSON.parse(atob(message));
            const decrypted = cryptoManager.decryptText(data.encrypted, password);
            
            if (decrypted) {
                return decrypted;
            } else {
                app.showToast('Decryption failed - wrong password', 'error');
                return null;
            }
        } catch (error) {
            app.showToast('Invalid message format', 'error');
            return null;
        }
    }
}

// Initialize export manager
const exportManager = new ExportManager();
