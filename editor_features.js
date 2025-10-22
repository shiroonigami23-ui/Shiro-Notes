// Editor Features Implementation Module for Shiro Notes
class EditorFeatures {
    constructor(app) {
        this.app = app;
        this.recognition = null; // Speech recognition instance
        this.isDictating = false;
        this.currentEditorRange = null; // To restore selection after async ops or modals
        this.emojiCategories = { // Cache emojis
            smileys: ['😊', '😂', '🤣', '😁', '😆', '😅', '😄', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😭', '😢', '🥺', '🥱', '😴', '🥴', '😵'],
            people: ['👤', '👥', '👨', '👩', '👧', '👦', '👶', '🧑', '👱', '🧔', '👴', '👵', '👮', '👷', '💂', '🕵️', '🧑‍⚕️', '🧑‍🌾', '🧑‍🍳', '🧑‍🎓', '🧑‍🎤', '🧑‍🏫', '🧑‍🏭', '🧑‍💻', '🧑‍💼', '🧑‍🔧', '🧑‍🔬', '🧑‍🎨', '🧑‍🚒', '🧑‍✈️', '🧑‍🚀', '🧑‍⚖️', '🦸', '🦹', '🤴', '👸', '🧙', '🧚', '🧛', '🧜', '🧝'],
            nature: ['🌿', '🌱', '🌳', '🌲', '🌴', '🌵', '🌾', '🌻', '🌺', '🌸', '🌼', '🌷', '🥀', '🌹', '💐', '🍄', '🌰', '🎃', '🍁', '🍂', '🍃', '🌍', '🌕', '☀️', '⭐', '🌊', '🌬️', '🔥', '💧', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'],
            food: ['🍎', '🍌', '🍊', '🍋', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫒', '🌽', '🥕', '🫑', '🧄', '🧅', '🥔', '🥐', '🍞', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕'],
            activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '⛸️', '🏋️', '🤸', '🤺', '⛹️', '🤾', '🧗', '🏌️', '🧘', '🏄', '🏊', '🚣', '🏇'],
            travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '✈️', '🛫', '🛬', '🚀', '🛰️', '⛵', '🛥️', '🚤', '🛳️', '⛴️', '⚓', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️'],
            objects: ['💡', '🔌', '🔋', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '📱', '📞', '☎️', '📺', '📷', '📹', '🔭', '🔬', '📎', '✂️', '🔨', '🔧', '🔫', '💣', '🔪', '🛡️', '🔑', '💰', '💎', '🎁', '🎈', '🎉', '✉️', '📦', '🏷️', '📈', '📉', '📊', '🗑️', '📅', '🔔', '📢', '⏳', '💡'],
            symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '⚛️', '⚕️', '☢️', '☣️']
        };
    }

    // --- Feature Implementations ---

    insertLink() {
        this.saveSelection(); // Save selection before showing prompt
        const url = prompt('Enter URL (e.g., https://example.com):');
        if (!url) {
            this.restoreSelection();
            return;
        }

        // Basic URL validation
        let validUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('/')) {
            validUrl = 'https://' + url;
        }

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        const text = prompt('Enter link text (optional, uses selected text or URL if empty):', selectedText) || selectedText || url;

        this.restoreSelection(); // Restore selection before inserting HTML

        if (validUrl && window.editorCore) {
            const linkHTML = `<a href="${this.app.escapeHtml(validUrl)}" target="_blank" rel="noopener noreferrer">${this.app.escapeHtml(text)}</a>`;
            window.editorCore.execCommand('insertHTML', linkHTML);
        }
    }

    insertImage() {
        this.saveSelection();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) {
                this.restoreSelection();
                return;
            }

            // Optional: Check file size
            const maxSize = 5 * 1024 * 1024; // 5MB limit
            if (file.size > maxSize) {
                this.app.showToast(`Image size exceeds the limit (${maxSize / 1024 / 1024}MB).`, 'error');
                this.restoreSelection();
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                this.restoreSelection();
                if (window.editorCore) {
                    // Add styles for responsiveness and appearance
                    const imgHTML = `<img src="${event.target.result}" alt="${this.app.escapeHtml(file.name)}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block;">`;
                    window.editorCore.execCommand('insertHTML', imgHTML);
                }
            };
             reader.onerror = () => {
                 this.app.showToast('Error reading image file.', 'error');
                 this.restoreSelection();
             };
            reader.readAsDataURL(file);
        };

         // Handle cancellation of file picker
         input.addEventListener('cancel', () => {
             this.restoreSelection();
         });

        input.click();
    }

    insertAudio() {
        this.saveSelection();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) {
                this.restoreSelection();
                return;
            }

             // Optional: Check file size
            const maxSize = 10 * 1024 * 1024; // 10MB limit for audio
            if (file.size > maxSize) {
                this.app.showToast(`Audio file size exceeds the limit (${maxSize / 1024 / 1024}MB).`, 'error');
                this.restoreSelection();
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                this.restoreSelection();
                if (window.editorCore) {
                    const audioHTML = `<audio controls src="${event.target.result}" style="margin: 10px 0;">Your browser does not support the audio element.</audio>`;
                    window.editorCore.execCommand('insertHTML', audioHTML);
                }
            };
             reader.onerror = () => {
                 this.app.showToast('Error reading audio file.', 'error');
                 this.restoreSelection();
             };
            reader.readAsDataURL(file);
        };

         input.addEventListener('cancel', () => {
             this.restoreSelection();
         });

        input.click();
    }

    insertTable() {
        this.saveSelection();
        const rowsStr = prompt('Enter number of rows (e.g., 3):', '3');
        const colsStr = prompt('Enter number of columns (e.g., 3):', '3');
        this.restoreSelection();

        const rows = parseInt(rowsStr);
        const cols = parseInt(colsStr);

        if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0 && window.editorCore) {
            let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid var(--color-border);">';
            for (let i = 0; i < rows; i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < cols; j++) {
                    // Add padding and border to cells
                    tableHTML += `<td style="border: 1px solid var(--color-border); padding: var(--space-2);">&nbsp;</td>`;
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</table><p>&nbsp;</p>'; // Add space after table
            window.editorCore.execCommand('insertHTML', tableHTML);
        } else {
            this.app.showToast('Invalid table dimensions.', 'warning');
        }
    }

    // --- Emoji Panel ---
    toggleEmojiPanel() {
        const sidebar = document.getElementById('editorSidebar');
        const panel = document.getElementById('emojiPanel');
        const editorContainer = window.editorCore?.currentEditor?.closest('.editor-container');

        if (!sidebar || !panel || !editorContainer) return;

        if (sidebar.classList.contains('hidden') || panel.style.display === 'none') {
            // Show the panel
            sidebar.classList.remove('hidden');
            // Hide other panels if they exist
            Array.from(sidebar.querySelectorAll('.sidebar-panel')).forEach(p => p.style.display = 'none');
            panel.style.display = 'block';
            this.loadEmojiCategory('smileys'); // Load default category
            editorContainer.classList.add('sidebar-visible'); // Add class to adjust layout if needed
        } else {
            // Hide the panel
            sidebar.classList.add('hidden');
            panel.style.display = 'none';
            editorContainer.classList.remove('sidebar-visible');
        }
    }

    loadEmojiCategory(category) {
        const emojiGrid = document.getElementById('emojiGrid');
        if (!emojiGrid) return;

        const emojis = this.emojiCategories[category] || [];
        emojiGrid.innerHTML = emojis.map(emoji =>
            `<button class="emoji-btn" title="${emoji}">${emoji}</button>`
        ).join('');

        // Add event listeners to new buttons
        emojiGrid.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => this.insertSelectedEmoji(btn.textContent));
        });

         // Update active category button
         const catButtonsContainer = document.querySelector('.emoji-categories');
         if(catButtonsContainer){
             catButtonsContainer.querySelectorAll('.emoji-cat-btn').forEach(btn => {
                 btn.classList.toggle('active', btn.dataset.category === category);
             });
         }
    }

     setupEmojiPanelListeners() {
         const panel = document.getElementById('emojiPanel');
         if(!panel) return;

         panel.querySelectorAll('.emoji-cat-btn').forEach(btn => {
             // Remove old listener before adding new one
             btn.replaceWith(btn.cloneNode(true));
         });
          panel.querySelectorAll('.emoji-cat-btn').forEach(btn => {
             btn.addEventListener('click', () => {
                 const category = btn.dataset.category;
                 this.loadEmojiCategory(category);
             });
         });
     }


    insertSelectedEmoji(emoji) {
        if (window.editorCore) {
            window.editorCore.execCommand('insertHTML', emoji);
        }
    }


    insertMath() {
        this.saveSelection();
        // Placeholder for a potential Math editor (e.g., MathJax, KaTeX input)
        const equation = prompt('Enter LaTeX equation (e.g., E=mc^2):');
        this.restoreSelection();
        if (equation && window.editorCore) {
            // Simple span for now, could be enhanced with rendering libraries
            const mathHTML = `<span class="math-equation" contenteditable="false" style="background: var(--color-secondary); padding: 2px 5px; border-radius: var(--radius-sm); font-family: var(--font-family-mono); cursor: pointer;" title="LaTeX: ${this.app.escapeHtml(equation)}">\\(${this.app.escapeHtml(equation)}\\)</span>&nbsp;`;
            window.editorCore.execCommand('insertHTML', mathHTML);
        }
    }

    // --- Dictation ---
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API not supported in this browser.");
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // Keep listening
        this.recognition.interimResults = true; // Show results as they come
        this.recognition.lang = navigator.language || 'en-US'; // Use browser language

        let final_transcript = '';
        let interim_transcript = '';
        const editor = window.editorCore?.currentEditor;
        // Create a temporary span to show interim results without modifying history constantly
        let interimSpan = null;

        this.recognition.onresult = (event) => {
             interim_transcript = '';
             for (let i = event.resultIndex; i < event.results.length; ++i) {
                 if (event.results[i].isFinal) {
                     final_transcript += event.results[i][0].transcript;
                 } else {
                     interim_transcript += event.results[i][0].transcript;
                 }
             }

             // Insert final transcript into the editor
             if (final_transcript && editor) {
                 this.restoreSelection(); // Restore cursor position
                 document.execCommand('insertText', false, final_transcript.trim() + ' ');
                 this.saveSelection(); // Save new cursor position
                 final_transcript = ''; // Reset final transcript
                 window.editorCore?.saveHistory(); // Save after final insertion
             }

             // Display interim transcript visually without adding to content
             if (interim_transcript && editor) {
                 if (!interimSpan) {
                     interimSpan = document.createElement('span');
                     interimSpan.style.color = 'var(--color-text-secondary)';
                     interimSpan.style.opacity = '0.7';
                      // Try inserting at selection
                      const selection = window.getSelection();
                      if (selection.rangeCount > 0) {
                           const range = selection.getRangeAt(0).cloneRange();
                           range.collapse(false); // Collapse to the end of selection
                           range.insertNode(interimSpan);
                           this.saveSelection(); // Save range around the interim span
                      } else {
                         editor.appendChild(interimSpan); // Fallback append
                      }
                 }
                 interimSpan.textContent = interim_transcript;
             } else if (interimSpan) {
                 // Remove interim span if transcript becomes empty
                  if(interimSpan.parentNode) interimSpan.parentNode.removeChild(interimSpan);
                 interimSpan = null;
                 this.restoreSelection(); // Restore selection after removing span
             }
        };


        this.recognition.onend = () => {
            console.log("Speech recognition ended.");
            // Remove interim span if it's still there
             if (interimSpan && interimSpan.parentNode) {
                 interimSpan.parentNode.removeChild(interimSpan);
                 interimSpan = null;
                 this.restoreSelection(); // Restore cursor
             }
            if (this.isDictating) { // Restart if we are still supposed to be dictating
                console.log("Restarting recognition...");
                try {
                     this.recognition.start();
                } catch(e) {
                     console.error("Error restarting recognition:", e);
                     this.stopDictation(); // Stop if restart fails
                }
            } else {
                this.updateDictationButtonUI(); // Update UI if stopped manually
            }
        };

        this.recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
             let errorMsg = event.error;
             if (event.error === 'no-speech') {
                 errorMsg = 'No speech detected. Microphone might be muted.';
             } else if (event.error === 'audio-capture') {
                 errorMsg = 'Microphone error. Check permissions and hardware.';
             } else if (event.error === 'not-allowed') {
                 errorMsg = 'Microphone permission denied.';
             }
            this.app.showToast(`Dictation Error: ${errorMsg}`, 'error');
            this.stopDictation(); // Stop dictation on error
        };

        return true;
    }

    toggleDictation() {
        if (this.isDictating) {
            this.stopDictation();
        } else {
            if (!this.recognition) {
                 if (!this.setupSpeechRecognition()) {
                      this.app.showToast('Speech recognition is not available on this browser.', 'error');
                      return;
                 }
            }
            // Check microphone permission
            navigator.mediaDevices.getUserMedia({ audio: true })
               .then(stream => {
                   stream.getTracks().forEach(track => track.stop()); // Immediately stop the track after permission check
                   this.startDictation();
               })
               .catch(err => {
                   console.error("Microphone permission error:", err);
                   this.app.showToast('Microphone access denied. Please grant permission.', 'error');
                   this.isDictating = false; // Ensure state is correct
                   this.updateDictationButtonUI();
               });
        }
    }

    startDictation() {
         if (!this.recognition || this.isDictating) return;
        console.log("Starting dictation...");
        this.saveSelection(); // Save cursor position before starting
        try {
            this.recognition.start();
            this.isDictating = true;
            this.updateDictationButtonUI();
            this.app.showToast('🎙️ Listening... Speak now.', 'info', 5000); // Longer duration
        } catch(e) {
             console.error("Error starting recognition:", e);
             this.app.showToast('Could not start dictation.', 'error');
             this.isDictating = false;
             this.updateDictationButtonUI();
        }
    }

    stopDictation() {
        console.log("Stopping dictation...");
        this.isDictating = false; // Set flag *before* stopping recognition
        if (this.recognition) {
            try {
                 this.recognition.stop(); // This will trigger the 'onend' event
            } catch(e) {
                 console.error("Error stopping recognition:", e);
                 // Force UI update even if stop fails
                  this.updateDictationButtonUI();
            }
        } else {
             // If recognition wasn't even initialized, just update UI
             this.updateDictationButtonUI();
        }
         // Restore selection *after* stopping, in case interim span needs cleanup
         this.restoreSelection();
        this.app.showToast('Dictation stopped.', 'info', 1500);
    }

    updateDictationButtonUI() {
        const dictationBtn = document.getElementById('dictationBtn'); // Assumes this ID exists
        if (!dictationBtn) return;

        if (this.isDictating) {
            dictationBtn.classList.add('active'); // Use 'active' like other toggles
            dictationBtn.title = "Stop Dictation";
            dictationBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>'; // Change icon
        } else {
            dictationBtn.classList.remove('active');
            dictationBtn.title = "Start Dictation";
            dictationBtn.innerHTML = '<i class="fas fa-microphone"></i>'; // Restore icon
        }
    }

    // --- Find & Replace ---
    findAndReplace() {
        this.saveSelection(); // Save selection before modal

        const modal = document.createElement('div');
        modal.className = 'modal-overlay visible'; // Show immediately
        modal.innerHTML = `
          <div class="modal-content find-replace-modal">
            <div class="modal-header">
              <h3>Find & Replace</h3>
              <button class="close-btn">&times;</button>
            </div>
            <div class="find-replace-body">
              <div class="form-group">
                <label for="findInput">Find</label>
                <input type="text" id="findInput" class="form-control">
              </div>
              <div class="form-group">
                <label for="replaceInput">Replace with</label>
                <input type="text" id="replaceInput" class="form-control">
              </div>
            </div>
            <div class="find-replace-footer">
              <label id="matchCaseToggle">
                <input type="checkbox" id="matchCase"> Match Case
              </label>
              <div class="find-replace-actions">
                <button class="btn btn--primary" id="replaceAllBtn">Replace All</button>
                <button class="btn btn--secondary" id="closeFindReplaceBtn">Close</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

         const findInput = modal.querySelector('#findInput');
         const replaceInput = modal.querySelector('#replaceInput');
         const matchCaseCheckbox = modal.querySelector('#matchCase');
         const replaceAllButton = modal.querySelector('#replaceAllBtn');
         const closeButton = modal.querySelector('.close-btn');
         const closeFooterButton = modal.querySelector('#closeFindReplaceBtn');


        const closeModal = () => {
             modal.remove();
             this.restoreSelection();
        };

        closeButton.addEventListener('click', closeModal);
        closeFooterButton.addEventListener('click', closeModal);

        replaceAllButton.addEventListener('click', () => {
            const findText = findInput.value;
            const replaceText = replaceInput.value;
            const matchCase = matchCaseCheckbox.checked;
            const editor = window.editorCore?.currentEditor;

            if (!findText || !editor) return;

            let content = editor.innerHTML;
            const flags = matchCase ? 'g' : 'gi';
            // Escape special regex characters in findText
            const escapedFindText = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedFindText, flags);

            let replacementCount = 0;
             // Perform replacement, ensuring we don't replace inside HTML tags
             // This is a simplified approach; complex HTML might require a more robust parser
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
             const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
             let node;
             while(node = walker.nextNode()) {
                 const text = node.nodeValue;
                 const newNodeValue = text.replace(regex, (match) => {
                     replacementCount++;
                     return replaceText;
                 });
                 if (newNodeValue !== text) {
                     node.nodeValue = newNodeValue;
                 }
             }
             editor.innerHTML = tempDiv.innerHTML;


            if (replacementCount > 0) {
                 window.editorCore?.saveHistory(); // Save changes
                 this.app.showToast(`Replaced ${replacementCount} occurrence(s).`, 'success');
             } else {
                 this.app.showToast('Text not found.', 'info');
             }

            closeModal();
        });

         // Focus the find input
         setTimeout(() => findInput.focus(), 100);
    }

    // --- Markdown Toggle ---
    toggleMarkdown() {
        const editor = window.editorCore?.currentEditor;
        if (!editor) return;

        const isMarkdown = editor.classList.contains('markdown-mode');
        let content;

        try {
            if (isMarkdown) {
                // Convert markdown to HTML
                content = this.markdownToHtml(editor.innerText); // Use innerText from markdown mode
                editor.innerHTML = content; // Set as HTML
                editor.classList.remove('markdown-mode');
                 editor.setAttribute('contenteditable', 'true'); // Ensure it's editable as HTML
                this.app.showToast('Switched to Rich Text Mode', 'success');
            } else {
                // Convert HTML to markdown
                content = this.htmlToMarkdown(editor.innerHTML);
                editor.innerText = content; // Set as plain text
                editor.classList.add('markdown-mode');
                // Consider making it non-editable in pure markdown mode or using a textarea
                 editor.setAttribute('contenteditable', 'plaintext-only'); // Or just true, depends on desired behavior
                this.app.showToast('Switched to Markdown Mode', 'info');
            }
             window.editorCore?.saveHistory(); // Save the new state
        } catch (error) {
            console.error("Error toggling markdown:", error);
            this.app.showToast("Could not convert content.", "error");
            // Revert potentially broken state
             editor.innerHTML = isMarkdown ? content : this.htmlToMarkdown(editor.innerHTML); // Attempt revert
        }
    }

    // Basic Markdown to HTML (Extend as needed)
    markdownToHtml(md) {
        // Basic conversions - consider a library like Marked.js for robustness
        md = md.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        md = md.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        md = md.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        md = md.replace(/^\* (.*$)/gm, '<ul><li>$1</li></ul>'); // Basic lists need more work
        md = md.replace(/^1\. (.*$)/gm, '<ol><li>$1</li></ol>'); // Basic lists need more work
        md = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        md = md.replace(/\*(.*?)\*/g, '<em>$1</em>');
        md = md.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1">'); // Basic image
        md = md.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>'); // Link
        md = md.replace(/\n\n/g, '</p><p>'); // Paragraphs
        md = md.replace(/\n/g, '<br>'); // Line breaks (careful with this one)
        // Clean up basic list conversions
        md = md.replace(/<\/ul>\s?<ul>/g, '');
        md = md.replace(/<\/ol>\s?<ol>/g, '');
        return `<p>${md}</p>`; // Wrap in paragraph
    }

    // Basic HTML to Markdown (Extend as needed)
    htmlToMarkdown(html) {
         // Basic conversions - consider a library like Turndown for robustness
         html = html.replace(/<br\s*\/?>/gi, '\n');
         html = html.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
         html = html.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
         html = html.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
         html = html.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
         html = html.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
         html = html.replace(/<b>(.*?)<\/b>/gi, '**$1**');
         html = html.replace(/<em>(.*?)<\/em>/gi, '*$1*');
         html = html.replace(/<i>(.*?)<\/i>/gi, '*$1*');
         html = html.replace(/<ul>(.*?)<\/ul>/gis, (match, content) => this.convertList(content, '*'));
         html = html.replace(/<ol>(.*?)<\/ol>/gis, (match, content) => this.convertList(content, '1.'));
         html = html.replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
         html = html.replace(/<img src="([^"]+)" alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
         // Strip remaining tags
         html = html.replace(/<[^>]+>/g, '');
         // Clean up extra newlines
         html = html.replace(/\n{3,}/g, '\n\n');
         return html.trim();
    }

     convertList(htmlContent, prefix) {
         const items = htmlContent.match(/<li.*?>(.*?)<\/li>/gis) || [];
         return items.map(item => {
             const text = item.replace(/<li[^>]*>|<\/li>/gi, '').trim();
             // Basic recursive handling (needs improvement for nested lists)
             const nestedUl = text.match(/<ul>(.*?)<\/ul>/is);
             const nestedOl = text.match(/<ol>(.*?)<\/ol>/is);
             let mainText = text.replace(/<ul.*?<\/ul>|<ol.*?<\/ol>/gis, '').trim();
             mainText = this.htmlToMarkdown(mainText); // Convert content within li
             let nestedContent = '';
             if (nestedUl) {
                 nestedContent = '\n' + this.convertList(nestedUl[1], '*').split('\n').map(line => '  ' + line).join('\n');
             } else if (nestedOl) {
                 nestedContent = '\n' + this.convertList(nestedOl[1], '1.').split('\n').map(line => '  ' + line).join('\n');
             }
             return `${prefix} ${mainText}${nestedContent}`;
         }).join('\n') + '\n\n';
     }


    // --- Fullscreen ---
    toggleFullscreen() {
        const editorContainer = window.editorCore?.currentEditor?.closest('.editor-container');
        if (!editorContainer) return;

        editorContainer.classList.toggle('fullscreen');
        const isFullscreen = editorContainer.classList.contains('fullscreen');

        // Update button icon
        const btn = document.querySelector('[onclick*="toggleFullscreen"]'); // Find button reliably
        const icon = btn?.querySelector('i');
        if (icon) {
            icon.className = isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
        }
         if(btn) {
             btn.title = isFullscreen ? 'Exit Full Screen' : 'Full Screen';
         }

        // Prevent body scrolling when editor is fullscreen
        document.body.style.overflow = isFullscreen ? 'hidden' : '';
    }

    // --- Selection Helpers ---
    saveSelection() {
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                this.currentEditorRange = sel.getRangeAt(0).cloneRange();
            } else {
                 this.currentEditorRange = null;
            }
        } else {
             this.currentEditorRange = null;
        }
    }

    restoreSelection() {
        if (this.currentEditorRange && window.getSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.currentEditorRange);
             this.currentEditorRange = null; // Clear saved range after restoring
        }
         // Ensure editor has focus after restoring
         window.editorCore?.currentEditor?.focus();
    }

}

// Instantiate and attach to window (or app instance)
if (window.app) {
    window.editorFeatures = new EditorFeatures(window.app);
} else {
    console.error("Main app instance not found for EditorFeatures initialization.");
}
