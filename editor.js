// Rich Text Editor Module for Shiro Notes
class EditorModule {

  constructor(app) {
    this.app = app;
    this.currentEditor = null;
    this.currentItem = null;
    this.autoSaveTimer = null;
    this.isEditing = false;
    this.editorHistory = [];
    this.historyIndex = -1;
    this.recognition = null;
    this.isDictating = false;
  }


  // Create rich text editor
  // In editor.js

  // In editor.js
// REPLACE your existing createEditor function with this complete version.

  createEditor(container, content = '', options = {}) {
    const editorId = 'editor_' + Date.now();
    
    container.innerHTML = `
      <div class="editor-container" id="${editorId}">
        <div class="editor-toolbar">
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="undo" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i></button>
            <button class="toolbar-btn" data-command="redo" title="Redo (Ctrl+Y)"><i class="fas fa-redo"></i></button>
          </div>
          <div class="toolbar-separator"></div>
          <div class="toolbar-group">
            <select class="toolbar-select" data-command="fontName" title="Font Family">
              <option value="Arial">Arial</option><option value="Verdana">Verdana</option><option value="Georgia">Georgia</option><option value="Garamond">Garamond</option><option value="Courier New">Courier New</option><option value="Trebuchet MS">Trebuchet MS</option><option value="Century Gothic">Century Gothic</option><option value="Lucida Console">Lucida Console</option><option value="Tahoma">Tahoma</option><option value="Comic Sans MS">Comic Sans MS</option>
            </select>
            <select class="toolbar-select" data-command="fontSize" title="Font Size">
              <option value="1">8pt</option><option value="2">10pt</option><option value="3">12pt</option><option value="4">14pt</option><option value="5">16pt</option><option value="6">18pt</option><option value="7">22pt</option><option value="8">24pt</option><option value="9">28pt</option><option value="10">32pt</option><option value="11">36pt</option><option value="12">40pt</option>
            </select>
          </div>
          <div class="toolbar-separator"></div>
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="bold" title="Bold (Ctrl+B)"><i class="fas fa-bold"></i></button>
            <button class="toolbar-btn" data-command="italic" title="Italic (Ctrl+I)"><i class="fas fa-italic"></i></button>
            <button class="toolbar-btn" data-command="underline" title="Underline (Ctrl+U)"><i class="fas fa-underline"></i></button>
            <button class="toolbar-btn" data-command="strikeThrough" title="Strikethrough"><i class="fas fa-strikethrough"></i></button>
            <button class="toolbar-btn" data-command="subscript" title="Subscript"><i class="fas fa-subscript"></i></button>
            <button class="toolbar-btn" data-command="superscript" title="Superscript"><i class="fas fa-superscript"></i></button>
          </div>
          <div class="toolbar-separator"></div>
          <div class="toolbar-group">
            <div class="color-picker-container">
              <button class="toolbar-btn color-btn" id="textColorBtn" title="Text Color"><i class="fas fa-font"></i><span class="color-indicator" id="textColorIndicator"></span></button>
              <input type="color" id="textColorPicker" value="#000000" style="display: none;">
            </div>
            <div class="color-picker-container">
              <button class="toolbar-btn color-btn" id="bgColorBtn" title="Highlight Color"><i class="fas fa-highlighter"></i><span class="color-indicator" id="bgColorIndicator"></span></button>
              <input type="color" id="bgColorPicker" value="#ffff00" style="display: none;">
            </div>
            <button class="toolbar-btn" data-command="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
          </div>
          <div class="toolbar-separator"></div>
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="justifyLeft" title="Align Left"><i class="fas fa-align-left"></i></button>
            <button class="toolbar-btn" data-command="justifyCenter" title="Align Center"><i class="fas fa-align-center"></i></button>
            <button class="toolbar-btn" data-command="justifyRight" title="Align Right"><i class="fas fa-align-right"></i></button>
            <button class="toolbar-btn" data-command="justifyFull" title="Justify"><i class="fas fa-align-justify"></i></button>
          </div>
          <div class="toolbar-separator"></div>
          <div class="toolbar-group">
            <button class="toolbar-btn" data-command="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
            <button class="toolbar-btn" data-command="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
            <button class="toolbar-btn" data-command="outdent" title="Decrease Indent"><i class="fas fa-outdent"></i></button>
            <button class="toolbar-btn" data-command="indent" title="Increase Indent"><i class="fas fa-indent"></i></button>
          </div>
          <div class="toolbar-separator"></div>
          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editorModule.insertLink()" title="Insert Link"><i class="fas fa-link"></i></button>
            <button class="toolbar-btn" onclick="editorModule.insertImage()" title="Insert Image"><i class="fas fa-image"></i></button>
            <button class="toolbar-btn" onclick="editorModule.insertAudio()" title="Insert Audio File"><i class="fas fa-file-audio"></i></button>
            <button class="toolbar-btn" onclick="editorModule.insertTable()" title="Insert Table"><i class="fas fa-table"></i></button>
            <button class="toolbar-btn" data-command="insertHorizontalRule" title="Insert Horizontal Rule"><i class="fas fa-minus"></i></button>
            <button class="toolbar-btn" data-command="formatBlock" data-value="blockquote" title="Blockquote"><i class="fas fa-quote-left"></i></button>
            <button class="toolbar-btn" onclick="editorModule.insertEmoji()" title="Insert Emoji"><i class="fas fa-smile"></i></button>
            <button class="toolbar-btn" onclick="editorModule.insertMath()" title="Insert Math"><i class="fas fa-square-root-alt"></i></button>
            <button class="toolbar-btn" id="dictationBtn" onclick="editorModule.toggleDictation()" title="Start Dictation"><i class="fas fa-microphone"></i></button>
          </div>
          <div class="toolbar-separator"></div>
          <div class="toolbar-group">
            <button class="toolbar-btn" onclick="editorModule.findAndReplace()" title="Find & Replace (Ctrl+F)"><i class="fas fa-search"></i></button>
            <button class="toolbar-btn" onclick="editorModule.toggleMarkdown()" title="Markdown Mode"><i class="fab fa-markdown"></i></button>
            <button class="toolbar-btn" onclick="editorModule.toggleFullscreen()" title="Full Screen"><i class="fas fa-expand"></i></button>
            <button class="toolbar-btn" onclick="editorModule.showWordCount()" title="Word Count"><i class="fas fa-file-word"></i></button>
          </div>
        </div>
        
        <div class="editor-content-wrapper">
          <div class="editor-content" contenteditable="true" id="editorContent">
            ${content}
          </div>
          <div class="editor-sidebar hidden" id="editorSidebar">
            <div class="sidebar-panel" id="emojiPanel">
              <h4>Emojis</h4>
              <div class="emoji-categories">
                <button class="emoji-cat-btn active" data-category="smileys">😊</button>
                <button class="emoji-cat-btn" data-category="people">👤</button>
                <button class="emoji-cat-btn" data-category="nature">🌿</button>
                <button class="emoji-cat-btn" data-category="food">🍎</button>
                <button class="emoji-cat-btn" data-category="activities">⚽</button>
                <button class="emoji-cat-btn" data-category="travel">🚗</button>
                <button class="emoji-cat-btn" data-category="objects">💡</button>
                <button class="emoji-cat-btn" data-category="symbols">❤️</button>
              </div>
              <div class="emoji-grid" id="emojiGrid">
                </div>
            </div>
          </div>
        </div>
        
        <div class="editor-status-bar">
          <div class="status-left">
            <span id="wordCount">0 words</span>
            <span id="charCount">0 characters</span>
          </div>
          <div class="status-right">
            <span id="autoSaveStatus">Auto-saved</span>
            <div class="editor-actions">
              <button class="btn btn--sm btn--secondary" onclick="editorModule.saveItem()">Save</button>
              <button class="btn btn--sm btn--secondary" onclick="editorModule.closeEditor()">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.currentEditor = document.getElementById('editorContent');
    this.setupEditorEvents(editorId);
    this.loadEmojis();
    this.updateWordCount();
    this.startAutoSave();
    
    return editorId;
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      let final_transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
        }
      }
      
      if (final_transcript) {
          this.currentEditor.focus();
          document.execCommand('insertText', false, final_transcript.trim() + ' ');
      }
    };

    this.recognition.onend = () => {
      if (this.isDictating) {
        this.recognition.start();
      }
    };
    
    this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        this.app.showToast(`Error: ${event.error}`, 'error');
        this.isDictating = false; // Ensure we stop on error
        this.updateDictationButtonUI();
    };
  }

  toggleDictation() {
    if (this.isDictating) {
      this.stopDictation();
    } else {
      if (!this.recognition) {
        this.setupSpeechRecognition();
      }
      
      if (this.recognition) {
        this.startDictation();
      } else {
        this.app.showToast('Speech recognition is not supported by your browser.', 'error');
      }
    }
  }

  startDictation() {
    this.isDictating = true;
    this.recognition.start();
    this.updateDictationButtonUI();
    this.app.showToast('Listening...', 'info');
  }

  stopDictation() {
    // This flag is the key. We set it to false *before* stopping.
    this.isDictating = false; 
    if (this.recognition) {
        this.recognition.stop();
    }
    this.updateDictationButtonUI();
    this.app.showToast('Dictation stopped.', 'info', 1500);
  }

  // A new helper function to keep the UI in sync
  updateDictationButtonUI() {
    const dictationBtn = document.getElementById('dictationBtn');
    if (!dictationBtn) return;

    if (this.isDictating) {
      dictationBtn.classList.add('recording');
      dictationBtn.title = "Stop Dictation";
    } else {
      dictationBtn.classList.remove('recording');
      dictationBtn.title = "Start Dictation";
    }
  }
  

  findAndReplace() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
      <div class="modal-content find-replace-modal">
        <div class="modal-header">
          <h3>Find & Replace</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="find-replace-body">
          <div class="form-group">
            <label>Find</label>
            <input type="text" id="findInput" class="form-control">
          </div>
          <div class="form-group">
            <label>Replace with</label>
            <input type="text" id="replaceInput" class="form-control">
          </div>
        </div>
        <div class="find-replace-footer">
          <label id="matchCaseToggle">
            <input type="checkbox" id="matchCase"> Match Case
          </label>
          <div class="find-replace-actions">
            <button class="btn btn--secondary" id="replaceAllBtn">Replace All</button>
            <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('replaceAllBtn').onclick = () => {
      const findText = document.getElementById('findInput').value;
      const replaceText = document.getElementById('replaceInput').value;
      const matchCase = document.getElementById('matchCase').checked;

      if (!findText) return;

      let content = this.currentEditor.innerHTML;
      const flags = matchCase ? 'g' : 'gi';
      const regex = new RegExp(findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), flags);
      
      this.currentEditor.innerHTML = content.replace(regex, replaceText);
      this.app.showToast('Replacement complete!', 'success');
      modal.remove();
    };
  }

  setupEditorEvents(editorId) {
    const container = document.getElementById(editorId);
    const toolbar = container.querySelector('.editor-toolbar');
    const content = container.querySelector('.editor-content');
    
    // Toolbar button events
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (btn) {
        e.preventDefault();
        const command = btn.getAttribute('data-command');
        if (command) {
          this.execCommand(command);
          btn.classList.toggle('active');
        }
      }
    });
    
    // Color picker events
    const textColorBtn = container.querySelector('#textColorBtn');
    const textColorPicker = container.querySelector('#textColorPicker');
    const bgColorBtn = container.querySelector('#bgColorBtn');
    const bgColorPicker = container.querySelector('#bgColorPicker');
    
    textColorBtn.addEventListener('click', () => textColorPicker.click());
    textColorPicker.addEventListener('change', (e) => {
      this.execCommand('foreColor', e.target.value);
      document.getElementById('textColorIndicator').style.backgroundColor = e.target.value;
    });
    
    bgColorBtn.addEventListener('click', () => bgColorPicker.click());
    bgColorPicker.addEventListener('change', (e) => {
      this.execCommand('hiliteColor', e.target.value);
      document.getElementById('bgColorIndicator').style.backgroundColor = e.target.value;
    });
    
    // Content events
    content.addEventListener('input', () => {
      this.updateWordCount();
      this.scheduleAutoSave();
      this.saveHistory();
    });
    
    content.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
    
        content.addEventListener('keyup', () =>
    this.updateToolbarState());
        content.addEventListener('click', () =>
    this.updateToolbarState());
        document.addEventListener('selectionchange', () =>
    this.updateToolbarState());
    
    // Font controls
    container.querySelectorAll('.toolbar-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const command = select.getAttribute('data-command');
        this.execCommand(command, e.target.value);
      });
    });
  }

  execCommand(command, value = null) {
    document.execCommand(command, false, value);
    this.currentEditor.focus();
  }

  handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
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
        case 'z':
          e.preventDefault();
          this.execCommand('undo');
          break;
        case 'y':
          e.preventDefault();
          this.execCommand('redo');
          break;
        case 's':
          e.preventDefault();
          this.saveItem();
          break;
      }
    }
    
    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      this.execCommand('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
    }
  }
  
  updateToolbarState() {
    if (!this.currentEditor) return;

    const selection = window.getSelection();
    if (!selection.rangeCount || !this.currentEditor.contains(selection.anchorNode)) {
      document.querySelectorAll('.toolbar-btn.active').forEach(btn => btn.classList.remove('active'));
      return;
    }

    // Update state for toggle buttons
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      const command = btn.dataset.command;
      if (document.queryCommandState(command)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update state for select dropdowns
    document.querySelectorAll('.toolbar-select[data-command]').forEach(select => {
        const command = select.dataset.command;
        const value = document.queryCommandValue(command);
        select.value = value.replace(/['"]/g, '');
    });

    // == ADD THIS NEW SECTION FOR COLORS ==
    const rgbToHex = (rgb) => {
        let hex = Number(rgb).toString(16);
        if (hex.length < 2) {
             hex = "0" + hex;
        }
        return hex;
    };

    const fullColorToHex = (rgbStr) => {
        if (!rgbStr || !rgbStr.startsWith('rgb')) return rgbStr; // Return as is if not rgb
        const rgb = rgbStr.match(/\d+/g);
        if (!rgb) return '#000000';
        return "#" + rgbToHex(rgb[0]) + rgbToHex(rgb[1]) + rgbToHex(rgb[2]);
    };

    // Update Text Color
    const foreColor = document.queryCommandValue('foreColor');
    const textColorPicker = document.getElementById('textColorPicker');
    const textColorIndicator = document.getElementById('textColorIndicator');
    if (textColorPicker && textColorIndicator) {
        const hexColor = fullColorToHex(foreColor);
        textColorPicker.value = hexColor;
        textColorIndicator.style.backgroundColor = hexColor;
    }

    // Update Highlight Color
    const backColor = document.queryCommandValue('hiliteColor');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const bgColorIndicator = document.getElementById('bgColorIndicator');
    if (bgColorPicker && bgColorIndicator) {
        // 'transparent' is a valid value we should handle
        if (backColor === 'transparent' || backColor.includes('0,0,0,0')) {
             bgColorPicker.value = '#ffff00'; // Default highlight
             bgColorIndicator.style.backgroundColor = 'transparent';
        } else {
            const hexColor = fullColorToHex(backColor);
            bgColorPicker.value = hexColor;
            bgColorIndicator.style.backgroundColor = hexColor;
        }
    }
  }

  // Emoji functionality
  loadEmojis() {
    const emojiCategories = {
      smileys: ['😊', '😂', '🤣', '😁', '😆', '😅', '😄', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
      people: ['👤', '👥', '👨', '👩', '👧', '👦', '👶', '🧓', '👴', '👵', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹'],
      nature: ['🌿', '🌱', '🌳', '🌲', '🌴', '🌵', '🌾', '🌻', '🌺', '🌸', '🌼', '🌷', '🥀', '🌹', '💐', '🍄', '🌰', '🎃', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨'],
      food: ['🍎', '🍌', '🍊', '🍋', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫒', '🌽', '🥕', '🫑', '🧄'],
      activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽'],
      travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '✈️', '🛫', '🛬', '🪂', '💺', '🚀'],
      objects: ['💡', '🔌', '🔋', '🪫', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💾', '💿', '📀', '📱', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰'],
      symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎']
    };
    
    const emojiGrid = document.getElementById('emojiGrid');
    if (!emojiGrid) return;
    
    // Load default category
    this.showEmojiCategory('smileys', emojiCategories);
    
    // Setup category buttons
    document.querySelectorAll('.emoji-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.getAttribute('data-category');
        this.showEmojiCategory(category, emojiCategories);
      });
    });
  }
  
  showEmojiCategory(category, emojiCategories) {
    const emojiGrid = document.getElementById('emojiGrid');
    if (!emojiGrid) return;
    
    const emojis = emojiCategories[category] || [];
    emojiGrid.innerHTML = emojis.map(emoji => 
      `<button class="emoji-btn" onclick="editorModule.insertEmoji('${emoji}')">${emoji}</button>`
    ).join('');
  }

  insertEmoji(emoji = null) {
    if (emoji) {
      this.execCommand('insertHTML', emoji);
      return;
    }
    
    // Toggle emoji panel
    const sidebar = document.getElementById('editorSidebar');
    const panel = document.getElementById('emojiPanel');
    
    if (sidebar.classList.contains('hidden')) {
      sidebar.classList.remove('hidden');
      panel.style.display = 'block';
    } else {
      sidebar.classList.add('hidden');
    }
  }

  // Link insertion
  insertLink() {
    const url = prompt('Enter URL:');
    const text = prompt('Enter link text:') || url;
    
    if (url) {
      const linkHTML = `<a href="${url}" target="_blank">${text}</a>`;
      this.execCommand('insertHTML', linkHTML);
    }
  }

  // Table insertion
  insertTable() {
    const rows = parseInt(prompt('Number of rows:') || '3');
    const cols = parseInt(prompt('Number of columns:') || '3');
    
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
    
    for (let i = 0; i < rows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHTML += '<td style="padding: 8px; border: 1px solid #ccc;">Cell</td>';
      }
      tableHTML += '</tr>';
    }
    
    tableHTML += '</table>';
    this.execCommand('insertHTML', tableHTML);
  }

  // Math equation insertion (placeholder)
  insertMath() {
    const equation = prompt('Enter LaTeX equation (e.g., x^2 + y^2 = z^2):');
    if (equation) {
      const mathHTML = `<span class="math-equation" style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">${equation}</span>`;
      this.execCommand('insertHTML', mathHTML);
    }
  }

  // ===============================================
  // == PASTE THE NEW FUNCTIONS STARTING HERE ======
  // ===============================================
  insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataURL = event.target.result;
            const imgHTML = `<img src="${dataURL}" alt="${file.name}" style="max-width: 100%; height: auto; border-radius: 8px;">`;
            this.execCommand('insertHTML', imgHTML);
        };
        reader.readAsDataURL(file);
    };
    input.click();
  }

  insertAudio() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataURL = event.target.result;
            const audioHTML = `<audio controls src="${dataURL}">Your browser does not support the audio element.</audio>`;
            this.execCommand('insertHTML', audioHTML);
        };
        reader.readAsDataURL(file);
    };
    input.click();
  }
  // Markdown toggle
  toggleMarkdown() {
    const content = this.currentEditor.innerHTML;
    const isMarkdown = this.currentEditor.classList.contains('markdown-mode');
    
    if (isMarkdown) {
      // Convert markdown to HTML (simplified)
      this.currentEditor.innerHTML = this.markdownToHtml(content);
      this.currentEditor.classList.remove('markdown-mode');
      this.app.showToast('Converted to rich text', 'success');
    } else {
      // Convert HTML to markdown (simplified)
      this.currentEditor.innerHTML = this.htmlToMarkdown(content);
      this.currentEditor.classList.add('markdown-mode');
      this.app.showToast('Converted to markdown', 'success');
    }
  }
  
  markdownToHtml(markdown) {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br>');
  }
  
  htmlToMarkdown(html) {
    return html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      .replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<br>/g, '\n')
      .replace(/<[^>]+>/g, '');
  }

  // Fullscreen toggle
  toggleFullscreen() {
    const container = this.currentEditor.closest('.editor-container');
    container.classList.toggle('fullscreen');
    
    const btn = container.querySelector('[onclick="editorModule.toggleFullscreen()"]');
    const icon = btn.querySelector('i');
    
    if (container.classList.contains('fullscreen')) {
      icon.className = 'fas fa-compress';
      document.body.style.overflow = 'hidden';
    } else {
      icon.className = 'fas fa-expand';
      document.body.style.overflow = 'auto';
    }
  }

  // Word count
  updateWordCount() {
    if (!this.currentEditor) return;
    
    const text = this.currentEditor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    const wordCountEl = document.getElementById('wordCount');
    const charCountEl = document.getElementById('charCount');
    
    if (wordCountEl) wordCountEl.textContent = `${words} words`;
    if (charCountEl) charCountEl.textContent = `${chars} characters`;
  }
  
  showWordCount() {
    if (!this.currentEditor) return;
    
    const text = this.currentEditor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.split(/[.!?]+/).filter(s => s.length > 0).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Document Statistics</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Words:</span>
              <span class="stat-value">${words}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Characters:</span>
              <span class="stat-value">${chars}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Characters (no spaces):</span>
              <span class="stat-value">${charsNoSpaces}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Sentences:</span>
              <span class="stat-value">${sentences}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Paragraphs:</span>
              <span class="stat-value">${paragraphs}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
  }

  // Auto-save functionality
  startAutoSave() {
    this.scheduleAutoSave();
  }
  
  scheduleAutoSave() {
    clearTimeout(this.autoSaveTimer);
    this.updateAutoSaveStatus('Saving...');
    
    this.autoSaveTimer = setTimeout(() => {
      this.autoSave();
    }, 2000); // Auto-save after 2 seconds of inactivity
  }
  
  autoSave() {
    if (this.currentItem && this.currentEditor) {
      this.currentItem.content = this.currentEditor.innerHTML;
      this.currentItem.lastModified = new Date().toISOString();
      this.app.saveData();
      this.updateAutoSaveStatus('Auto-saved');
    }
  }
  
  updateAutoSaveStatus(status) {
    const statusEl = document.getElementById('autoSaveStatus');
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.className = status === 'Saving...' ? 'saving' : 'saved';
    }
  }

  // History management
  saveHistory() {
    if (!this.currentEditor) return;
    
    const content = this.currentEditor.innerHTML;
    
    // Don't save if content hasn't changed
    if (this.editorHistory.length > 0 && this.editorHistory[this.historyIndex] === content) {
      return;
    }
    
    // Remove any history after current index
    this.editorHistory = this.editorHistory.slice(0, this.historyIndex + 1);
    
    // Add new state
    this.editorHistory.push(content);
    this.historyIndex++;
    
    // Limit history size
    if (this.editorHistory.length > 50) {
      this.editorHistory.shift();
      this.historyIndex--;
    }
  }

  // Item management
  editBook(bookId) {
    const book = this.app.data.books.find(b => b.id === bookId);
    if (!book) return;
    
    this.currentItem = book;
    this.showBookEditor(book);
  }
  
  editNote(noteId) {
    const note = this.app.data.notes.find(n => n.id === noteId);
    if (!note) return;
    
    this.currentItem = note;
    this.showNoteEditor(note);
  }

  showBookEditor(book) {
    const page = document.getElementById('booksPage');
    page.innerHTML = `
      <div class="book-editor">
        <div class="book-header">
    <button class="btn btn--secondary" onclick="editorModule.showCoverModal('${book.id}')">
        <i class="fas fa-image"></i> Change Cover
      </button>
          <input type="text" class="book-title-input" value="${this.app.escapeHtml(book.title)}" placeholder="Book title..." onchange="editorModule.updateBookTitle(this.value)">
          <div class="book-actions">
            <button class="btn btn--secondary" onclick="editorModule.addChapter()">Add Chapter</button>
            <button class="btn btn--secondary" onclick="editorModule.saveItem()">Save</button>
            <button class="btn btn--secondary" onclick="app.showPage('books')">Close</button>
          </div>
        </div>
        
        <div class="book-content">
          <div class="chapters-sidebar">
            <h3>Chapters</h3>
            <div class="chapters-list" id="chaptersList">
              ${book.chapters ? book.chapters.map((chapter, index) => `
                <div class="chapter-item ${index === 0 ? 'active' : ''}" onclick="editorModule.selectChapter(${index})">
                  <span class="chapter-title">${this.app.escapeHtml(chapter.title)}</span>
                  <button class="chapter-delete" onclick="event.stopPropagation(); editorModule.deleteChapter(${index})">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `).join('') : '<p class="empty-state">No chapters yet</p>'}
            </div>
          </div>
          
          <div class="chapter-editor" id="chapterEditor">
            ${book.chapters && book.chapters.length > 0 ? 
              `<input type="text" class="chapter-title-input" value="${this.app.escapeHtml(book.chapters[0].title)}" placeholder="Chapter title..." onchange="editorModule.updateChapterTitle(0, this.value)">
               <div id="chapterContent"></div>` :
              '<div class="empty-chapter">Select a chapter to edit or create a new one</div>'
            }
          </div>
        </div>
      </div>
    `;
    
    if (book.chapters && book.chapters.length > 0) {
      const contentDiv = document.getElementById('chapterContent');
      this.createEditor(contentDiv, book.chapters[0].content || '');
      this.currentChapterIndex = 0;
    }
  }
  
showNoteEditor(note) {
    const page = document.getElementById('notesPage');
    page.innerHTML = `
      <div class="note-editor">
        <div class="note-header">
          <input type="text" class="note-title-input" value="${this.app.escapeHtml(note.title)}" placeholder="Note title..." onchange="editorModule.updateNoteTitle(this.value)">
          <div class="note-meta">
            <input type="text" class="note-tags" value="${note.tags ? note.tags.join(', ') : ''}" placeholder="Tags (comma separated)..." onchange="editorModule.updateNoteTags(this.value)">
            <label class="checkbox-label">
              <input type="checkbox" ${note.bookmarked ? 'checked' : ''} onchange="editorModule.toggleBookmark(this.checked)">
              Bookmark
            </label>
            <label class="checkbox-label">
              <input type="checkbox" ${note.encrypted ? 'checked' : ''} onchange="editorModule.toggleEncryption(this.checked)">
              Encrypt
            </label>
          </div>
          <div class="note-actions">
            <button class="btn btn--secondary" onclick="autoEncryption.autoEncryptAndShare(editorModule.currentItem, false)">
              <i class="fas fa-share-alt"></i> Share
            </button>
            
            <button class="btn btn--secondary btn--danger" onclick="autoEncryption.autoEncryptAndShare(editorModule.currentItem, true)">
              <i class="fas fa-fire"></i> Share & Destroy
            </button>
            <button class="btn btn--secondary" onclick="editorModule.saveItem()">Save</button>
            <button class="btn btn--secondary" onclick="app.showPage('notes')">Close</button>
          </div>
        </div>
        
        <div class="note-content" id="noteContent">
          </div>
      </div>
    `;
    
    const contentDiv = document.getElementById('noteContent');
    this.createEditor(contentDiv, note.content || '');
}


  // Book management
  updateBookTitle(title) {
    if (this.currentItem) {
      this.currentItem.title = title;
      this.currentItem.lastModified = new Date().toISOString();
    }
  }
  
  addChapter() {
    if (!this.currentItem.chapters) {
      this.currentItem.chapters = [];
    }
    
    const chapter = {
      id: this.app.generateId(),
      title: `Chapter ${this.currentItem.chapters.length + 1}`,
      content: ''
    };
    
    this.currentItem.chapters.push(chapter);
    this.showBookEditor(this.currentItem);
  }
  
  selectChapter(index) {
    // Save current chapter content
    if (this.currentEditor && this.currentChapterIndex !== undefined) {
      this.currentItem.chapters[this.currentChapterIndex].content = this.currentEditor.innerHTML;
    }
    
    this.currentChapterIndex = index;
    const chapter = this.currentItem.chapters[index];
    
    // Update UI
    document.querySelectorAll('.chapter-item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
    
    // Update editor
    document.querySelector('.chapter-title-input').value = chapter.title;
    const contentDiv = document.getElementById('chapterContent');
    contentDiv.innerHTML = '';
    this.createEditor(contentDiv, chapter.content || '');
  }
  
  updateChapterTitle(index, title) {
    if (this.currentItem.chapters && this.currentItem.chapters[index]) {
      this.currentItem.chapters[index].title = title;
      this.currentItem.lastModified = new Date().toISOString();
    }
  }
  
  deleteChapter(index) {
    if (confirm('Are you sure you want to delete this chapter?')) {
      this.currentItem.chapters.splice(index, 1);
      this.showBookEditor(this.currentItem);
    }
  }

  // Note management

  updateNoteTitle(title) {
    if (this.currentItem) {
      this.currentItem.title = title;
      this.currentItem.lastModified = new Date().toISOString();
    }
  }

  // ===================================================================
  // == PASTE THE NEW FUNCTIONS HERE ===================================
  // ===================================================================
  showCoverModal(bookId) {
    const book = this.app.data.books.find(b => b.id === bookId);
    if (!book) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Choose Book Cover</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="cover-options">
            <h4>Default Icons</h4>
            <div class="icon-grid">
              ${['fas fa-book', 'fas fa-feather-alt', 'fas fa-lightbulb', 'fas fa-brain', 'fas fa-atom', 'fas fa-flask', 'fas fa-code', 'fas fa-briefcase', 'fas fa-heart', 'fas fa-star', 'fas fa-leaf', 'fas fa-compass'].map(icon => `
                <button class="icon-choice" data-type="icon" data-value="${icon}"><i class="${icon}"></i></button>
              `).join('')}
            </div>

            <h4>Emoji</h4>
            <div class="form-group">
              <input type="text" id="emojiInput" placeholder="Paste an emoji here..." maxlength="2">
              <button class="btn btn--secondary" id="setEmojiBtn">Set Emoji</button>
            </div>

            <h4>Upload Image</h4>
            <div class="form-group">
              <input type="file" id="coverUpload" accept="image/*">
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);

    // Event listeners for the modal
    modal.querySelectorAll('.icon-choice').forEach(btn => {
      btn.onclick = () => {
        book.cover = { type: 'icon', value: btn.dataset.value };
        this.app.saveData();
        this.app.loadBooksPage(document.getElementById('booksPage'));
        this.showBookEditor(book);
        modal.remove();
      };
    });
    
    modal.querySelector('#setEmojiBtn').onclick = () => {
      const emoji = modal.querySelector('#emojiInput').value;
      if (emoji) {
        book.cover = { type: 'emoji', value: emoji };
        this.app.saveData();
        this.app.loadBooksPage(document.getElementById('booksPage'));
        this.showBookEditor(book);
        modal.remove();
      }
    };
    
    modal.querySelector('#coverUpload').onchange = (e) => this.handleCoverUpload(e, book, modal);
  }

  handleCoverUpload(event, book, modal) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      book.cover = { type: 'image', value: e.target.result };
      this.app.saveData();
      this.app.loadBooksPage(document.getElementById('booksPage'));
      this.showBookEditor(book);
      modal.remove();
    };
    reader.readAsDataURL(file);
  }
  // ===================================================================
  // == END OF NEW FUNCTIONS ===========================================
  // ===================================================================

  updateNoteTags(tagsString) {

    if (this.currentItem) {
      this.currentItem.tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      this.currentItem.lastModified = new Date().toISOString();
    }
  }
  
  toggleBookmark(bookmarked) {
    if (this.currentItem) {
      this.currentItem.bookmarked = bookmarked;
      this.currentItem.lastModified = new Date().toISOString();
    }
  }
  
  toggleEncryption(encrypted) {
    if (this.currentItem) {
      this.currentItem.encrypted = encrypted;
      this.currentItem.lastModified = new Date().toISOString();
      
      if (encrypted) {
        this.app.showToast('Item will be encrypted when saved', 'info');
      }
    }
  }

  // Save and close
  saveItem() {
    if (!this.currentItem) return;
    
    // Save current editor content
    if (this.currentEditor) {
      if (this.currentItem.chapters && this.currentChapterIndex !== undefined) {
        this.currentItem.chapters[this.currentChapterIndex].content = this.currentEditor.innerHTML;
      } else {
        this.currentItem.content = this.currentEditor.innerHTML;
      }
    }
    
    this.currentItem.lastModified = new Date().toISOString();
    this.app.saveData();
    this.app.updateUI();
    this.updateAutoSaveStatus('Saved');
    this.app.showToast('Item saved successfully', 'success');
  }
  
  closeEditor() {
    this.saveItem();
    this.currentEditor = null;
    this.currentItem = null;
    this.isEditing = false;
    clearTimeout(this.autoSaveTimer);
    
    // Exit fullscreen if active
    const fullscreenEl = document.querySelector('.editor-container.fullscreen');
    if (fullscreenEl) {
      fullscreenEl.classList.remove('fullscreen');
      document.body.style.overflow = 'auto';
    }
  }

  // Create new items
  createNewBook() {
    const book = {
      id: this.app.generateId(),
      title: 'New Book',
      description: '',
      cover: {
      type: 'icon', // 'icon', 'emoji', or 'image'
      value: 'fas fa-book' // Default icon
    },
      chapters: [],
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: [],
      bookmarked: false,
      encrypted: false
    };
    
    this.app.data.books.push(book);
    this.app.saveData();
    this.editBook(book.id);
  }
  
  createNewNote() {
    const note = {
      id: this.app.generateId(),
      title: 'New Note',
      content: '',
      type: 'text',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: [],
      bookmarked: false,
      encrypted: false
    };
    
    this.app.data.notes.push(note);
    this.app.saveData();
    this.editNote(note.id);
  }
}

// Initialize editor module
const editorModule = new EditorModule(app);
window.editorModule = editorModule;

// Override app methods to use editor
app.createBook = () => editorModule.createNewBook();
app.createNote = () => editorModule.createNewNote();
app.openBook = (bookId) => editorModule.editBook(bookId);
app.openNote = (noteId) => editorModule.editNote(noteId);

// Add editor-specific styles
const editorStyles = `
.editor-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  border: 1px solid var(--color-card-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background-color: var(--color-surface);
}

.editor-container.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  height: 100vh;
  border-radius: 0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-card-border);
  flex-wrap: wrap;
  gap: var(--space-1);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background-color: var(--color-border);
  margin: 0 var(--space-2);
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  color: var(--color-text);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  position: relative;
}

.toolbar-btn:hover {
  background-color: var(--color-secondary);
}

.toolbar-btn.active {
  background-color: var(--color-primary);
  color: white;
}

.toolbar-select {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.color-picker-container {
  position: relative;
}

.color-btn {
  position: relative;
}

.color-indicator {
  position: absolute;
  bottom: 2px;
  left: 2px;
  right: 2px;
  height: 3px;
  border-radius: 1px;
  background-color: currentColor;
}

.editor-content-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-content {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
  outline: none;
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--color-text);
  background-color: var(--color-surface);
}

.editor-content.markdown-mode {
  font-family: monospace;
  background-color: var(--color-background);
}

.editor-sidebar {
  width: 300px;
  background-color: var(--color-background);
  border-left: 1px solid var(--color-card-border);
  overflow-y: auto;
}

.sidebar-panel {
  padding: var(--space-4);
}

.emoji-categories {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.emoji-cat-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: var(--color-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-cat-btn.active {
  background-color: var(--color-primary);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-1);
}

.emoji-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast);
}

.emoji-btn:hover {
  background-color: var(--color-secondary);
}

.editor-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-background);
  border-top: 1px solid var(--color-card-border);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.status-left {
  display: flex;
  gap: var(--space-4);
}

.status-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.editor-actions {
  display: flex;
  gap: var(--space-2);
}

#autoSaveStatus.saving {
  color: var(--color-warning);
}

#autoSaveStatus.saved {
  color: var(--color-success);
}

/* Book Editor Styles */
.book-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.book-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-card-border);
  background-color: var(--color-surface);
}

.book-title-input {
  flex: 1;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  border: none;
  background: transparent;
  color: var(--color-text);
  padding: var(--space-2);
  border-radius: var(--radius-base);
}

.book-title-input:focus {
  outline: 2px solid var(--color-primary);
  background-color: var(--color-background);
}

.book-actions {
  display: flex;
  gap: var(--space-2);
}

.book-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.chapters-sidebar {
  width: 300px;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-card-border);
  display: flex;
  flex-direction: column;
}

.chapters-sidebar h3 {
  padding: var(--space-4);
  margin: 0;
  border-bottom: 1px solid var(--color-card-border);
}

.chapters-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  border-radius: var(--radius-base);
  cursor: pointer;
  margin-bottom: var(--space-1);
  transition: background-color var(--transition-fast);
}

.chapter-item:hover {
  background-color: var(--color-secondary);
}

.chapter-item.active {
  background-color: var(--color-primary);
  color: white;
}

.chapter-title {
  flex: 1;
  font-size: var(--font-size-sm);
}

.chapter-delete {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  opacity: 0.7;
}

.chapter-delete:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.1);
}

.chapter-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chapter-title-input {
  padding: var(--space-4);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  border: none;
  border-bottom: 1px solid var(--color-card-border);
  background-color: var(--color-surface);
  color: var(--color-text);
}

.chapter-title-input:focus {
  outline: none;
  background-color: var(--color-background);
}

.empty-chapter {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-style: italic;
}

/* Note Editor Styles */
.note-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.note-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-card-border);
  background-color: var(--color-surface);
}

.note-title-input {
  width: 100%;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  border: none;
  background: transparent;
  color: var(--color-text);
  padding: var(--space-2);
  border-radius: var(--radius-base);
  margin-bottom: var(--space-3);
}

.note-title-input:focus {
  outline: 2px solid var(--color-primary);
  background-color: var(--color-background);
}

.note-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.note-tags {
  flex: 1;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background-color: var(--color-background);
  color: var(--color-text);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.note-actions {
  display: flex;
  gap: var(--space-2);
}

.note-content {
  flex: 1;
}

/* Statistics Modal */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-3);
  background-color: var(--color-background);
  border-radius: var(--radius-base);
}

.stat-label {
  font-weight: var(--font-weight-medium);
}

.stat-value {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

/* Responsive Design */
@media (max-width: 768px) {
  .editor-toolbar {
    padding: var(--space-2);
  }
  
  .toolbar-group {
    flex-wrap: wrap;
  }
  
  .editor-sidebar {
    width: 250px;
  }
  
  .book-content {
    flex-direction: column;
  }
  
  .chapters-sidebar {
    width: 100%;
    max-height: 200px;
  }
  
  .note-meta {
    flex-direction: column;
    align-items: stretch;
  }
}
`;

// Inject editor styles
const editorStyleSheet = document.createElement('style');
editorStyleSheet.textContent = editorStyles;
document.head.appendChild(editorStyleSheet);