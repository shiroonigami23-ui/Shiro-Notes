// Export Module for Shiro Notes
class ExportModule {
  constructor(app) {
    this.app = app;
  }

  // Enhanced PDF Export with styling
  async exportToPDF(type = 'all', options = {}) {
    try {
      const defaultOptions = {
        format: 'A4',
        orientation: 'portrait',
        includeImages: true,
        includeStyles: true,
        pageNumbers: true,
        tableOfContents: type === 'books'
      };
      
      const config = { ...defaultOptions, ...options };
      
      // Create content based on type
      let content = '';
      let title = 'Shiro Notes Export';
      
      switch (type) {
        case 'books':
          content = this.generateBooksContent(config);
          title = 'Books Export';
          break;
        case 'notes':
          content = this.generateNotesContent(config);
          title = 'Notes Export';
          break;
        case 'all':
          content = this.generateAllContent(config);
          title = 'Complete Export';
          break;
        default:
          throw new Error('Invalid export type');
      }
      
      // Generate PDF using browser print functionality
      await this.generatePDFFromHTML(content, title, config);
      
    } catch (error) {
      console.error('PDF export error:', error);
      this.app.showToast('Failed to export PDF: ' + error.message, 'error');
    }
  }

  generateBooksContent(config) {
    const books = this.app.data.books.filter(book => !book.encrypted);
    
    if (books.length === 0) {
      return '<div class="no-content">No unencrypted books to export</div>';
    }
    
    let content = '';
    
    // Table of Contents
    if (config.tableOfContents && books.length > 1) {
      content += '<div class="table-of-contents"><h2>Table of Contents</h2><ul>';
      books.forEach((book, index) => {
        content += `<li><a href="#book-${index}">${this.app.escapeHtml(book.title)}</a></li>`;
      });
      content += '</ul></div><div class="page-break"></div>';
    }
    
    // Books content
    books.forEach((book, index) => {
      content += `<div class="book" id="book-${index}">`;
      content += `<h1 class="book-title">${this.app.escapeHtml(book.title)}</h1>`;
      
      if (book.description) {
        content += `<div class="book-description">${this.app.escapeHtml(book.description)}</div>`;
      }
      
      content += `<div class="book-meta">`;
      content += `<p><strong>Created:</strong> ${new Date(book.created).toLocaleDateString()}</p>`;
      content += `<p><strong>Last Modified:</strong> ${new Date(book.lastModified).toLocaleDateString()}</p>`;
      if (book.tags && book.tags.length > 0) {
        content += `<p><strong>Tags:</strong> ${book.tags.map(tag => this.app.escapeHtml(tag)).join(', ')}</p>`;
      }
      content += `</div>`;
      
      // Chapters
      if (book.chapters && book.chapters.length > 0) {
        book.chapters.forEach((chapter, chapterIndex) => {
          content += `<div class="chapter">`;
          content += `<h2 class="chapter-title">${this.app.escapeHtml(chapter.title)}</h2>`;
          content += `<div class="chapter-content">${chapter.content || ''}</div>`;
          content += `</div>`;
        });
      }
      
      content += `</div>`;
      
      // Page break between books
      if (index < books.length - 1) {
        content += '<div class="page-break"></div>';
      }
    });
    
    return content;
  }

  generateNotesContent(config) {
    const notes = this.app.data.notes.filter(note => !note.encrypted && note.type === 'text');
    
    if (notes.length === 0) {
      return '<div class="no-content">No unencrypted text notes to export</div>';
    }
    
    let content = '<div class="notes-export">';
    content += '<h1>Notes Export</h1>';
    
    notes.forEach((note, index) => {
      content += `<div class="note">`;
      content += `<h2 class="note-title">${this.app.escapeHtml(note.title)}</h2>`;
      
      content += `<div class="note-meta">`;
      content += `<p><strong>Created:</strong> ${new Date(note.created).toLocaleDateString()}</p>`;
      content += `<p><strong>Last Modified:</strong> ${new Date(note.lastModified).toLocaleDateString()}</p>`;
      if (note.tags && note.tags.length > 0) {
        content += `<p><strong>Tags:</strong> ${note.tags.map(tag => this.app.escapeHtml(tag)).join(', ')}</p>`;
      }
      content += `</div>`;
      
      content += `<div class="note-content">${note.content || ''}</div>`;
      content += `</div>`;
      
      if (index < notes.length - 1) {
        content += '<hr class="note-separator">';
      }
    });
    
    content += '</div>';
    return content;
  }

  generateAllContent(config) {
    let content = '<div class="complete-export">';
    content += '<h1>Shiro Notes - Complete Export</h1>';
    content += `<p class="export-info">Exported on ${new Date().toLocaleString()}</p>`;
    
    // Summary
    content += '<div class="export-summary">';
    content += '<h2>Summary</h2>';
    content += '<ul>';
    content += `<li>Books: ${this.app.data.books.filter(b => !b.encrypted).length}</li>`;
    content += `<li>Notes: ${this.app.data.notes.filter(n => !n.encrypted && n.type === 'text').length}</li>`;
    content += `<li>Audio Notes: ${this.app.data.notes.filter(n => n.type === 'audio').length}</li>`;
    content += '</ul>';
    content += '</div>';
    
    content += '<div class="page-break"></div>';
    
    // Books
    if (this.app.data.books.filter(b => !b.encrypted).length > 0) {
      content += this.generateBooksContent(config);
      content += '<div class="page-break"></div>';
    }
    
    // Notes
    if (this.app.data.notes.filter(n => !n.encrypted && n.type === 'text').length > 0) {
      content += this.generateNotesContent(config);
    }
    
    content += '</div>';
    return content;
  }

  async generatePDFFromHTML(content, title, config) {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          ${this.getPDFStyles(config)}
        </style>
      </head>
      <body>
        <div class="pdf-container">
          ${content}
          ${config.pageNumbers ? '<div class="page-footer">Page <span class="page-number"></span></div>' : ''}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    this.app.showToast('PDF generation started - check your downloads', 'success');
  }

  getPDFStyles(config) {
    return `
      @page {
        size: ${config.format};
        margin: 2cm;
      }
      
      body {
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #000;
        margin: 0;
        padding: 0;
      }
      
      .pdf-container {
        max-width: 100%;
      }
      
      h1 {
        font-size: 24pt;
        font-weight: bold;
        margin-bottom: 20pt;
        page-break-after: avoid;
      }
      
      h2 {
        font-size: 18pt;
        font-weight: bold;
        margin-top: 20pt;
        margin-bottom: 10pt;
        page-break-after: avoid;
      }
      
      h3 {
        font-size: 14pt;
        font-weight: bold;
        margin-top: 15pt;
        margin-bottom: 8pt;
      }
      
      p {
        margin-bottom: 10pt;
        text-align: justify;
      }
      
      .book-title {
        text-align: center;
        border-bottom: 2pt solid #000;
        padding-bottom: 10pt;
      }
      
      .book-description {
        font-style: italic;
        margin-bottom: 20pt;
        text-align: center;
      }
      
      .book-meta,
      .note-meta {
        background-color: #f5f5f5;
        padding: 10pt;
        border-left: 4pt solid #666;
        margin-bottom: 20pt;
        font-size: 10pt;
      }
      
      .chapter {
        margin-bottom: 30pt;
      }
      
      .chapter-title {
        border-bottom: 1pt solid #ccc;
        padding-bottom: 5pt;
      }
      
      .chapter-content {
        margin-top: 15pt;
      }
      
      .note {
        margin-bottom: 30pt;
      }
      
      .note-title {
        color: #333;
      }
      
      .note-separator {
        border: none;
        border-top: 1pt solid #ccc;
        margin: 30pt 0;
      }
      
      .table-of-contents {
        margin-bottom: 30pt;
      }
      
      .table-of-contents h2 {
        text-align: center;
      }
      
      .table-of-contents ul {
        list-style-type: none;
        padding: 0;
      }
      
      .table-of-contents li {
        margin-bottom: 5pt;
        padding-left: 20pt;
      }
      
      .table-of-contents a {
        text-decoration: none;
        color: #000;
      }
      
      .export-summary {
        background-color: #f9f9f9;
        padding: 15pt;
        border-radius: 5pt;
        margin-bottom: 20pt;
      }
      
      .export-info {
        text-align: right;
        font-style: italic;
        color: #666;
        margin-bottom: 30pt;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      .no-content {
        text-align: center;
        font-style: italic;
        color: #666;
        padding: 50pt 0;
      }
      
      .page-footer {
        position: fixed;
        bottom: 1cm;
        right: 1cm;
        font-size: 10pt;
        color: #666;
      }
      
      /* Handle images */
      img {
        max-width: 100%;
        height: auto;
        page-break-inside: avoid;
      }
      
      /* Table styling */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15pt;
        page-break-inside: avoid;
      }
      
      table, th, td {
        border: 1pt solid #000;
      }
      
      th, td {
        padding: 5pt;
        text-align: left;
      }
      
      th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      
      /* Code blocks */
      pre, code {
        font-family: 'Courier New', monospace;
        background-color: #f5f5f5;
        padding: 5pt;
        border-radius: 2pt;
      }
      
      pre {
        white-space: pre-wrap;
        page-break-inside: avoid;
      }
    `;
  }

  // EPUB Export
  async exportToEPUB(bookId = null) {
    try {
      let books;
      if (bookId) {
        const book = this.app.data.books.find(b => b.id === bookId && !b.encrypted);
        if (!book) {
          throw new Error('Book not found or encrypted');
        }
        books = [book];
      } else {
        books = this.app.data.books.filter(b => !b.encrypted);
      }
      
      if (books.length === 0) {
        throw new Error('No unencrypted books to export');
      }
      
      const zip = new JSZip();
      
      // Create EPUB structure
      this.createEPUBStructure(zip, books);
      
      // Generate and download EPUB
      const blob = await zip.generateAsync({ type: 'blob' });
      this.downloadFile(blob, books.length === 1 ? `${books[0].title}.epub` : 'ShiroNotes_Books.epub');
      
      this.app.showToast('EPUB exported successfully', 'success');
      
    } catch (error) {
      console.error('EPUB export error:', error);
      this.app.showToast('EPUB export failed: ' + error.message, 'error');
    }
  }

  createEPUBStructure(zip, books) {
    // META-INF/container.xml
    zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
    
    // mimetype
    zip.file('mimetype', 'application/epub+zip');
    
    // OEBPS/content.opf
    const manifestItems = books.map((book, index) => 
      `<item id="chapter${index}" href="chapter${index}.xhtml" media-type="application/xhtml+xml"/>`
    ).join('\n    ');
    
    const spineItems = books.map((book, index) => 
      `<itemref idref="chapter${index}"/>`
    ).join('\n    ');
    
    zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">shiro-notes-${Date.now()}</dc:identifier>
    <dc:title>Shiro Notes Export</dc:title>
    <dc:creator>Shiro Notes</dc:creator>
    <dc:language>en</dc:language>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    ${manifestItems}
  </manifest>
  <spine>
    <itemref idref="nav"/>
    ${spineItems}
  </spine>
</package>`);
    
    // OEBPS/nav.xhtml
    const navItems = books.map((book, index) => 
      `<li><a href="chapter${index}.xhtml">${this.app.escapeHtml(book.title)}</a></li>`
    ).join('\n        ');
    
    zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${navItems}
    </ol>
  </nav>
</body>
</html>`);
    
    // Book chapters
    books.forEach((book, index) => {
      const chaptersContent = book.chapters ? book.chapters.map(chapter => 
        `<h2>${this.app.escapeHtml(chapter.title)}</h2>\n${chapter.content || ''}`
      ).join('\n') : '';
      
      const bookContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.app.escapeHtml(book.title)}</title>
  <style>
    body { font-family: serif; line-height: 1.6; margin: 2em; }
    h1 { text-align: center; margin-bottom: 2em; }
    h2 { margin-top: 2em; margin-bottom: 1em; }
    p { text-align: justify; }
  </style>
</head>
<body>
  <h1>${this.app.escapeHtml(book.title)}</h1>
  ${book.description ? `<p><em>${this.app.escapeHtml(book.description)}</em></p>` : ''}
  ${chaptersContent}
</body>
</html>`;
      
      zip.file(`OEBPS/chapter${index}.xhtml`, bookContent);
    });
  }

  // HTML Export
  async exportToHTML(type = 'all') {
    try {
      let content = '';
      let filename = 'shiro-notes.html';
      
      switch (type) {
        case 'books':
          content = this.generateBooksHTML();
          filename = 'shiro-books.html';
          break;
        case 'notes':
          content = this.generateNotesHTML();
          filename = 'shiro-notes.html';
          break;
        default:
          content = this.generateCompleteHTML();
          filename = 'shiro-complete.html';
      }
      
      const blob = new Blob([content], { type: 'text/html' });
      this.downloadFile(blob, filename);
      
      this.app.showToast('HTML exported successfully', 'success');
      
    } catch (error) {
      console.error('HTML export error:', error);
      this.app.showToast('HTML export failed: ' + error.message, 'error');
    }
  }

  generateCompleteHTML() {
    const books = this.app.data.books.filter(b => !b.encrypted);
    const notes = this.app.data.notes.filter(n => !n.encrypted && n.type === 'text');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shiro Notes - Complete Export</title>
  <style>
    ${this.getHTMLStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Shiro Notes - Complete Export</h1>
      <p class="export-info">Exported on ${new Date().toLocaleString()}</p>
    </header>
    
    <nav class="table-of-contents">
      <h2>Table of Contents</h2>
      <ul>
        ${books.length > 0 ? '<li><a href="#books">Books</a></li>' : ''}
        ${notes.length > 0 ? '<li><a href="#notes">Notes</a></li>' : ''}
      </ul>
    </nav>
    
    ${books.length > 0 ? `
    <section id="books">
      <h2>Books</h2>
      ${this.generateBooksHTMLContent(books)}
    </section>
    ` : ''}
    
    ${notes.length > 0 ? `
    <section id="notes">
      <h2>Notes</h2>
      ${this.generateNotesHTMLContent(notes)}
    </section>
    ` : ''}
    
    <footer>
      <p>Generated by Shiro Notes</p>
    </footer>
  </div>
</body>
</html>`;
  }

  generateBooksHTML() {
    const books = this.app.data.books.filter(b => !b.encrypted);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shiro Notes - Books Export</title>
  <style>
    ${this.getHTMLStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Books Export</h1>
      <p class="export-info">Exported on ${new Date().toLocaleString()}</p>
    </header>
    
    ${this.generateBooksHTMLContent(books)}
    
    <footer>
      <p>Generated by Shiro Notes</p>
    </footer>
  </div>
</body>
</html>`;
  }

  generateNotesHTML() {
    const notes = this.app.data.notes.filter(n => !n.encrypted && n.type === 'text');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shiro Notes - Notes Export</title>
  <style>
    ${this.getHTMLStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Notes Export</h1>
      <p class="export-info">Exported on ${new Date().toLocaleString()}</p>
    </header>
    
    ${this.generateNotesHTMLContent(notes)}
    
    <footer>
      <p>Generated by Shiro Notes</p>
    </footer>
  </div>
</body>
</html>`;
  }

  generateBooksHTMLContent(books) {
    return books.map(book => `
      <article class="book">
        <header class="book-header">
          <h2>${this.app.escapeHtml(book.title)}</h2>
          ${book.description ? `<p class="book-description">${this.app.escapeHtml(book.description)}</p>` : ''}
          <div class="book-meta">
            <span><strong>Created:</strong> ${new Date(book.created).toLocaleDateString()}</span>
            <span><strong>Modified:</strong> ${new Date(book.lastModified).toLocaleDateString()}</span>
            ${book.tags && book.tags.length > 0 ? `<span><strong>Tags:</strong> ${book.tags.map(tag => this.app.escapeHtml(tag)).join(', ')}</span>` : ''}
          </div>
        </header>
        
        ${book.chapters && book.chapters.length > 0 ? `
        <div class="chapters">
          ${book.chapters.map(chapter => `
          <section class="chapter">
            <h3>${this.app.escapeHtml(chapter.title)}</h3>
            <div class="chapter-content">${chapter.content || ''}</div>
          </section>
          `).join('')}
        </div>
        ` : ''}
      </article>
    `).join('');
  }

  generateNotesHTMLContent(notes) {
    return notes.map(note => `
      <article class="note">
        <header class="note-header">
          <h3>${this.app.escapeHtml(note.title)}</h3>
          <div class="note-meta">
            <span><strong>Created:</strong> ${new Date(note.created).toLocaleDateString()}</span>
            <span><strong>Modified:</strong> ${new Date(note.lastModified).toLocaleDateString()}</span>
            ${note.tags && note.tags.length > 0 ? `<span><strong>Tags:</strong> ${note.tags.map(tag => this.app.escapeHtml(tag)).join(', ')}</span>` : ''}
          </div>
        </header>
        <div class="note-content">${note.content || ''}</div>
      </article>
    `).join('');
  }

  getHTMLStyles() {
    return `
      body {
        font-family: 'Times New Roman', serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #fff;
      }
      
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      header {
        text-align: center;
        margin-bottom: 3rem;
        border-bottom: 2px solid #333;
        padding-bottom: 2rem;
      }
      
      h1 {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        color: #2c3e50;
      }
      
      h2 {
        font-size: 2rem;
        margin-top: 2rem;
        margin-bottom: 1rem;
        color: #34495e;
        border-bottom: 1px solid #bdc3c7;
        padding-bottom: 0.5rem;
      }
      
      h3 {
        font-size: 1.5rem;
        margin-top: 1.5rem;
        margin-bottom: 0.8rem;
        color: #2c3e50;
      }
      
      .export-info {
        font-style: italic;
        color: #7f8c8d;
        margin-bottom: 0;
      }
      
      .table-of-contents {
        background-color: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 3rem;
      }
      
      .table-of-contents h2 {
        margin-top: 0;
        text-align: center;
      }
      
      .table-of-contents ul {
        list-style-type: none;
        padding: 0;
      }
      
      .table-of-contents li {
        margin-bottom: 0.5rem;
      }
      
      .table-of-contents a {
        text-decoration: none;
        color: #3498db;
        font-weight: 500;
      }
      
      .table-of-contents a:hover {
        text-decoration: underline;
      }
      
      .book, .note {
        margin-bottom: 3rem;
        padding: 2rem;
        border: 1px solid #ecf0f1;
        border-radius: 8px;
        background-color: #fdfdfd;
      }
      
      .book-header, .note-header {
        margin-bottom: 2rem;
      }
      
      .book-description {
        font-style: italic;
        color: #7f8c8d;
        font-size: 1.1rem;
        margin-bottom: 1rem;
      }
      
      .book-meta, .note-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.9rem;
        color: #7f8c8d;
        border-top: 1px solid #ecf0f1;
        padding-top: 1rem;
      }
      
      .chapter {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background-color: #f8f9fa;
        border-radius: 6px;
        border-left: 4px solid #3498db;
      }
      
      .chapter h3 {
        margin-top: 0;
        color: #2c3e50;
      }
      
      .chapter-content, .note-content {
        margin-top: 1rem;
      }
      
      .note {
        border-left: 4px solid #e74c3c;
      }
      
      img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 1rem 0;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      
      table, th, td {
        border: 1px solid #bdc3c7;
      }
      
      th, td {
        padding: 0.75rem;
        text-align: left;
      }
      
      th {
        background-color: #ecf0f1;
        font-weight: 600;
      }
      
      pre, code {
        font-family: 'Courier New', monospace;
        background-color: #f4f4f4;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.9rem;
      }
      
      pre {
        white-space: pre-wrap;
        overflow-x: auto;
      }
      
      blockquote {
        margin: 1rem 0;
        padding: 1rem;
        background-color: #f8f9fa;
        border-left: 4px solid #95a5a6;
        font-style: italic;
      }
      
      footer {
        text-align: center;
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid #bdc3c7;
        color: #7f8c8d;
        font-size: 0.9rem;
      }
      
      @media (max-width: 768px) {
        .container {
          padding: 1rem;
        }
        
        h1 {
          font-size: 2rem;
        }
        
        h2 {
          font-size: 1.5rem;
        }
        
        .book-meta, .note-meta {
          flex-direction: column;
          gap: 0.5rem;
        }
      }
    `;
  }

  // Data Backup
  async backupData() {
    try {
      const backupData = {
        version: '1.0',
        exported: new Date().toISOString(),
        app: 'Shiro Notes',
        data: this.app.data
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const filename = `shiro-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      this.downloadFile(blob, filename);
      this.app.showToast('Backup created successfully', 'success');
      
    } catch (error) {
      console.error('Backup error:', error);
      this.app.showToast('Backup failed: ' + error.message, 'error');
    }
  }

  // Restore Data
  async restoreData() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const text = await file.text();
          const backupData = JSON.parse(text);
          
          // Validate backup format
          if (!backupData.version || !backupData.data) {
            throw new Error('Invalid backup format');
          }
          
          // Confirm restore
          if (!confirm('This will replace all current data. Are you sure you want to restore from backup?')) {
            return;
          }
          
          // Restore data
          this.app.data = backupData.data;
          this.app.saveData();
          this.app.updateUI();
          
          this.app.showToast('Data restored successfully', 'success');
          
          // Reload the page to refresh everything
          setTimeout(() => location.reload(), 1000);
          
        } catch (error) {
          console.error('Restore error:', error);
          this.app.showToast('Restore failed: ' + error.message, 'error');
        }
      };
      
      input.click();
      
    } catch (error) {
      console.error('Restore error:', error);
      this.app.showToast('Restore failed: ' + error.message, 'error');
    }
  }

  // Text Export
  async exportToText(type = 'all') {
    try {
      let content = '';
      let filename = 'shiro-notes.txt';
      
      switch (type) {
        case 'books':
          content = this.generateBooksText();
          filename = 'shiro-books.txt';
          break;
        case 'notes':
          content = this.generateNotesText();
          filename = 'shiro-notes.txt';
          break;
        default:
          content = this.generateCompleteText();
          filename = 'shiro-complete.txt';
      }
      
      const blob = new Blob([content], { type: 'text/plain' });
      this.downloadFile(blob, filename);
      
      this.app.showToast('Text file exported successfully', 'success');
      
    } catch (error) {
      console.error('Text export error:', error);
      this.app.showToast('Text export failed: ' + error.message, 'error');
    }
  }

  generateCompleteText() {
    const books = this.app.data.books.filter(b => !b.encrypted);
    const notes = this.app.data.notes.filter(n => !n.encrypted && n.type === 'text');
    
    let content = 'SHIRO NOTES - COMPLETE EXPORT\n';
    content += '='.repeat(50) + '\n\n';
    content += `Exported on: ${new Date().toLocaleString()}\n\n`;
    
    if (books.length > 0) {
      content += this.generateBooksText();
      content += '\n\n';
    }
    
    if (notes.length > 0) {
      content += this.generateNotesText();
    }
    
    return content;
  }

  generateBooksText() {
    const books = this.app.data.books.filter(b => !b.encrypted);
    
    let content = 'BOOKS\n';
    content += '='.repeat(20) + '\n\n';
    
    books.forEach((book, index) => {
      content += `${index + 1}. ${book.title}\n`;
      content += '-'.repeat(book.title.length + 3) + '\n';
      
      if (book.description) {
        content += `Description: ${book.description}\n`;
      }
      
      content += `Created: ${new Date(book.created).toLocaleDateString()}\n`;
      content += `Last Modified: ${new Date(book.lastModified).toLocaleDateString()}\n`;
      
      if (book.tags && book.tags.length > 0) {
        content += `Tags: ${book.tags.join(', ')}\n`;
      }
      
      content += '\n';
      
      if (book.chapters && book.chapters.length > 0) {
        book.chapters.forEach((chapter, chapterIndex) => {
          content += `  Chapter ${chapterIndex + 1}: ${chapter.title}\n`;
          content += '  ' + '-'.repeat(chapter.title.length + 12) + '\n';
          
          if (chapter.content) {
            // Strip HTML tags for plain text
            const plainContent = chapter.content.replace(/<[^>]*>/g, '');
            content += '  ' + plainContent.replace(/\n/g, '\n  ') + '\n';
          }
          
          content += '\n';
        });
      }
      
      content += '\n';
    });
    
    return content;
  }

  generateNotesText() {
    const notes = this.app.data.notes.filter(n => !n.encrypted && n.type === 'text');
    
    let content = 'NOTES\n';
    content += '='.repeat(20) + '\n\n';
    
    notes.forEach((note, index) => {
      content += `${index + 1}. ${note.title}\n`;
      content += '-'.repeat(note.title.length + 3) + '\n';
      
      content += `Created: ${new Date(note.created).toLocaleDateString()}\n`;
      content += `Last Modified: ${new Date(note.lastModified).toLocaleDateString()}\n`;
      
      if (note.tags && note.tags.length > 0) {
        content += `Tags: ${note.tags.join(', ')}\n`;
      }
      
      content += '\n';
      
      if (note.content) {
        // Strip HTML tags for plain text
        const plainContent = note.content.replace(/<[^>]*>/g, '');
        content += plainContent + '\n';
      }
      
      content += '\n' + '-'.repeat(50) + '\n\n';
    });
    
    return content;
  }

  // Utility method for file download
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Load export page
  loadExportPage(page) {
    page.innerHTML = `
      <div class="export-container">
        <h1>Export &amp; Backup</h1>
        
        <div class="export-sections">
          <!-- PDF Export -->
          <div class="export-section">
            <div class="section-header">
              <h3><i class="fas fa-file-pdf"></i> PDF Export</h3>
              <p>Export your content as formatted PDF documents</p>
            </div>
            <div class="export-options">
              <button class="export-btn" onclick="exportModule.exportToPDF('all')">
                <i class="fas fa-file-pdf"></i>
                <div>
                  <strong>Complete PDF</strong>
                  <small>Export all books and notes</small>
                </div>
              </button>
              <button class="export-btn" onclick="exportModule.exportToPDF('books')">
                <i class="fas fa-book"></i>
                <div>
                  <strong>Books Only</strong>
                  <small>Export all books with chapters</small>
                </div>
              </button>
              <button class="export-btn" onclick="exportModule.exportToPDF('notes')">
                <i class="fas fa-sticky-note"></i>
                <div>
                  <strong>Notes Only</strong>
                  <small>Export all text notes</small>
                </div>
              </button>
            </div>
          </div>
          
          <!-- E-book Export -->
          <div class="export-section">
            <div class="section-header">
              <h3><i class="fas fa-book-open"></i> E-book Export</h3>
              <p>Create e-books in standard formats</p>
            </div>
            <div class="export-options">
              <button class="export-btn" onclick="exportModule.exportToEPUB()">
                <i class="fas fa-book"></i>
                <div>
                  <strong>EPUB Format</strong>
                  <small>Standard e-book format</small>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Web Export -->
          <div class="export-section">
            <div class="section-header">
              <h3><i class="fas fa-code"></i> Web Export</h3>
              <p>Export as web-friendly formats</p>
            </div>
            <div class="export-options">
              <button class="export-btn" onclick="exportModule.exportToHTML('all')">
                <i class="fas fa-file-code"></i>
                <div>
                  <strong>Complete HTML</strong>
                  <small>Styled web page</small>
                </div>
              </button>
              <button class="export-btn" onclick="exportModule.exportToText('all')">
                <i class="fas fa-file-alt"></i>
                <div>
                  <strong>Plain Text</strong>
                  <small>Simple text format</small>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Data Backup -->
          <div class="export-section">
            <div class="section-header">
              <h3><i class="fas fa-shield-alt"></i> Data Backup</h3>
              <p>Backup and restore your complete data</p>
            </div>
            <div class="export-options">
              <button class="export-btn primary" onclick="exportModule.backupData()">
                <i class="fas fa-download"></i>
                <div>
                  <strong>Create Backup</strong>
                  <small>Full data backup (JSON)</small>
                </div>
              </button>
              <button class="export-btn secondary" onclick="exportModule.restoreData()">
                <i class="fas fa-upload"></i>
                <div>
                  <strong>Restore Backup</strong>
                  <small>Restore from backup file</small>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <div class="export-info">
          <div class="info-card">
            <h4><i class="fas fa-info-circle"></i> Export Information</h4>
            <ul>
              <li>Encrypted items are not included in exports for security</li>
              <li>PDF exports maintain formatting and styling</li>
              <li>EPUB format is compatible with most e-readers</li>
              <li>Backups include all data including encrypted items</li>
              <li>Audio recordings are included in JSON backups only</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize export module
const exportModule = new ExportModule(app);
window.exportModule = exportModule;

// Include JSZip for EPUB creation
if (typeof JSZip === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  document.head.appendChild(script);
}

// Add export-specific styles
const exportStyles = `
.export-container {
  max-width: 1000px;
  margin: 0 auto;
}

.export-sections {
  display: grid;
  gap: var(--space-8);
  margin-bottom: var(--space-8);
}

.export-section {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  border: 1px solid var(--color-card-border);
}

.section-header {
  margin-bottom: var(--space-6);
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xl);
  color: var(--color-text);
}

.section-header p {
  color: var(--color-text-secondary);
  margin: 0;
}

.export-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
}

.export-btn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-normal);
  text-align: left;
  width: 100%;
}

.export-btn:hover {
  background-color: var(--color-secondary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.export-btn i {
  font-size: var(--font-size-2xl);
  color: var(--color-primary);
  flex-shrink: 0;
}

.export-btn strong {
  display: block;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.export-btn small {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.export-btn.primary {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.export-btn.primary:hover {
  background-color: var(--color-primary-hover);
}

.export-btn.primary i,
.export-btn.primary strong,
.export-btn.primary small {
  color: white;
}

.export-btn.secondary {
  background-color: var(--color-warning);
  color: white;
  border-color: var(--color-warning);
}

.export-btn.secondary:hover {
  background-color: #c0832a;
}

.export-btn.secondary i,
.export-btn.secondary strong,
.export-btn.secondary small {
  color: white;
}

.export-info {
  margin-top: var(--space-8);
}

.info-card {
  background-color: var(--color-bg-1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

.info-card h4 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  color: var(--color-primary);
}

.info-card ul {
  margin: 0;
  padding-left: var(--space-6);
}

.info-card li {
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
}

/* Responsive Design */
@media (max-width: 768px) {
  .export-options {
    grid-template-columns: 1fr;
  }
  
  .export-btn {
    padding: var(--space-3);
  }
  
  .export-btn i {
    font-size: var(--font-size-xl);
  }
}
`;

// Inject export styles
const exportStyleSheet = document.createElement('style');
exportStyleSheet.textContent = exportStyles;
document.head.appendChild(exportStyleSheet);