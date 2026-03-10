// Editor Toolbar UI Module for Shiro Notes
class EditorToolbar {
    constructor(app) {
        this.app = app;
        this.toolbarElement = null; // Reference to the main toolbar container
    }
setEditor(editorElement) {
    // Find the toolbar *relative* to the editor element
    const toolbarEl = editorElement.closest('.editor-host').querySelector('.editor-toolbar');
    if (toolbarEl) {
        this.toolbarElement = toolbarEl;

        // Now that we have the toolbar, load its HTML and set up listeners
        this.loadToolbarHTML();
        this.setupToolbarEventListeners();
        this.initializeColorPickers();
    } else {
        console.error("Could not find a toolbar for this editor instance!");
    }
}
loadToolbarHTML() {
    if (!this.toolbarElement) return;
    this.toolbarElement.innerHTML = `
        <div class="toolbar-group">
            <button class="toolbar-btn" data-command="undo" title="Undo (Ctrl+Z)"><i class="fas fa-undo"></i></button>
            <button class="toolbar-btn" data-command="redo" title="Redo (Ctrl+Y)"><i class="fas fa-redo"></i></button>
        </div>
        <div class="toolbar-separator"></div>
        <div class="toolbar-group">
            <select class="toolbar-select" data-command="formatBlock" title="Headings">
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="blockquote">Quote</option>
            </select>
            <select class="toolbar-select" data-command="fontName" title="Font">
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="monospace">Monospace</option>
            </select>
            <select class="toolbar-select" data-command="fontSize" title="Font Size">
                <option value="2">10px</option>
                <option value="3" selected>12px</option>
                <option value="4">14px</option>
                <option value="5">18px</option>
                <option value="6">24px</option>
                <option value="7">32px</option>
            </select>
        </div>
        <div class="toolbar-separator"></div>
        <div class="toolbar-group">
            <button class="toolbar-btn" data-command="bold" title="Bold (Ctrl+B)"><i class="fas fa-bold"></i></button>
            <button class="toolbar-btn" data-command="italic" title="Italic (Ctrl+I)"><i class="fas fa-italic"></i></button>
            <button class="toolbar-btn" data-command="underline" title="Underline (Ctrl+U)"><i class="fas fa-underline"></i></button>
            <button class="toolbar-btn" data-command="strikeThrough" title="Strikethrough"><i class="fas fa-strikethrough"></i></button>
        </div>
        <div class="toolbar-group color-pickers">
            <button class="toolbar-btn color-btn" id="textColorBtn" title="Text Color">
                <i class="fas fa-font"></i>
                <span class="color-indicator" id="textColorIndicator"></span>
                <input type="color" id="textColorPicker" value="#000000">
            </button>
            <button class="toolbar-btn color-btn" id="bgColorBtn" title="Highlight Color">
                <i class="fas fa-highlighter"></i>
                <span class="color-indicator" id="bgColorIndicator"></span>
                <input type="color" id="bgColorPicker" value="#ffff00">
            </button>
        </div>
        <div class="toolbar-separator"></div>
        <div class="toolbar-group">
            <button class="toolbar-btn" data-command="justifyLeft" title="Align Left"><i class="fas fa-align-left"></i></button>
            <button class="toolbar-btn" data-command="justifyCenter" title="Align Center"><i class="fas fa-align-center"></i></button>
            <button class="toolbar-btn" data-command="justifyRight" title="Align Right"><i class="fas fa-align-right"></i></button>
            <button class="toolbar-btn" data-command="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
            <button class="toolbar-btn" data-command="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
            <button class="toolbar-btn" data-command="removeFormat" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
        </div>
        <div class="toolbar-separator"></div>
        <div class="toolbar-group">
            <button class="toolbar-btn" onclick="window.editorFeatures.insertLink()" title="Insert Link"><i class="fas fa-link"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.insertImage()" title="Insert Image"><i class="fas fa-image"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.insertTable()" title="Insert Table"><i class="fas fa-table"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.insertAudio()" title="Insert Audio"><i class="fas fa-file-audio"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.insertMath()" title="Insert Math"><i class="fas fa-square-root-alt"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.toggleEmojiPanel()" title="Emoji"><i class="fas fa-smile"></i></button>
        </div>
        <div class="toolbar-separator"></div>
        <div class="toolbar-group">
            <button class="toolbar-btn" id="dictationBtn" onclick="window.editorFeatures.toggleDictation()" title="Start Dictation"><i class="fas fa-microphone"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.findAndReplace()" title="Find & Replace"><i class="fas fa-search"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.toggleMarkdown()" title="Toggle Markdown"><i class="fab fa-markdown"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.showWordCount()" title="Content Statistics"><i class="fas fa-calculator"></i></button>
            <button class="toolbar-btn" onclick="window.editorFeatures.toggleFullscreen()" title="Full Screen"><i class="fas fa-expand"></i></button>
        </div>
    `;
}

    // --- Toolbar Initialization ---

    initializeToolbar(toolbarContainerElement) {
        this.toolbarElement = toolbarContainerElement;
        if (!this.toolbarElement) {
            console.error("Toolbar container element not found!");
            return;
        }
        this.setupToolbarEventListeners();
        this.initializeColorPickers(); // Set initial color indicators
    }

    setupToolbarEventListeners() {
        // --- Standard Button Commands ---
        this.toolbarElement.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent potential default actions
                const command = btn.getAttribute('data-command');
                const value = btn.getAttribute('data-value'); // For commands like formatBlock
                if (command) {
                    window.editorCore?.execCommand(command, value);
                    // Don't toggle 'active' here, let updateToolbarState handle it
                }
            });
        });

        // --- Select Dropdowns (Font Name, Size) ---
        this.toolbarElement.querySelectorAll('.toolbar-select[data-command]').forEach(select => {
            select.addEventListener('change', (e) => {
                const command = select.getAttribute('data-command');
                const value = e.target.value;
                if (command && value) {
                    window.editorCore?.execCommand(command, value);
                }
            });
        });

        // --- Color Pickers ---
        const textColorBtn = this.toolbarElement.querySelector('#textColorBtn');
        const textColorPicker = this.toolbarElement.querySelector('#textColorPicker');
        const bgColorBtn = this.toolbarElement.querySelector('#bgColorBtn');
        const bgColorPicker = this.toolbarElement.querySelector('#bgColorPicker');

        if (textColorBtn && textColorPicker) {
            textColorBtn.addEventListener('click', () => textColorPicker.click());
            textColorPicker.addEventListener('input', (e) => { // Use 'input' for live preview if desired
                window.editorCore?.execCommand('foreColor', e.target.value);
                this.updateColorIndicator('textColorIndicator', e.target.value);
            });
        }

        if (bgColorBtn && bgColorPicker) {
            bgColorBtn.addEventListener('click', () => bgColorPicker.click());
            bgColorPicker.addEventListener('input', (e) => {
                // Use hiliteColor for background/highlight
                 window.editorCore?.execCommand('hiliteColor', e.target.value);
                 // Note: Some browsers might use backColor, hiliteColor is more common for WYSIWYG
                this.updateColorIndicator('bgColorIndicator', e.target.value);
            });
        }

        // --- Buttons Calling Specific Feature Functions ---
        // These buttons don't use execCommand directly but call functions
        // in editor_features.js or the main editor module.
        // We assume those functions exist on window.editorFeatures or window.editorModule.
        const featureButtons = [
            { selector: '[onclick*="insertLink"]', func: () => window.editorFeatures?.insertLink() },
            { selector: '[onclick*="insertImage"]', func: () => window.editorFeatures?.insertImage() },
            { selector: '[onclick*="insertAudio"]', func: () => window.editorFeatures?.insertAudio() },
            { selector: '[onclick*="insertTable"]', func: () => window.editorFeatures?.insertTable() },
            { selector: '[onclick*="insertEmoji"]', func: () => window.editorFeatures?.toggleEmojiPanel() }, // Changed to toggle panel
            { selector: '[onclick*="insertMath"]', func: () => window.editorFeatures?.insertMath() },
            { selector: '[onclick*="toggleDictation"]', func: () => window.editorFeatures?.toggleDictation() },
            { selector: '[onclick*="findAndReplace"]', func: () => window.editorFeatures?.findAndReplace() },
            { selector: '[onclick*="toggleMarkdown"]', func: () => window.editorFeatures?.toggleMarkdown() },
            { selector: '[onclick*="toggleFullscreen"]', func: () => window.editorFeatures?.toggleFullscreen() },
            { selector: '[onclick*="showWordCount"]', func: () => window.editorFeatures?.showWordCount() },// Word count modal might stay in main module
            // Add other buttons calling specific functions here
        ];

        featureButtons.forEach(item => {
            const btn = this.toolbarElement.querySelector(item.selector);
            if (btn) {
                // Remove the old onclick attribute to prevent double execution
                btn.removeAttribute('onclick');
                // Add event listener
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    item.func();
                });
            }
        });
    }

     initializeColorPickers() {
        // Set initial indicator colors based on default picker values
        const textColorPicker = this.toolbarElement?.querySelector('#textColorPicker');
        const bgColorPicker = this.toolbarElement?.querySelector('#bgColorPicker');
        if (textColorPicker) {
            this.updateColorIndicator('textColorIndicator', textColorPicker.value);
        }
         if (bgColorPicker) {
            this.updateColorIndicator('bgColorIndicator', bgColorPicker.value);
        }
    }

    // --- Toolbar State Management ---

    updateToolbarState() {
        if (!this.toolbarElement || !window.editorCore?.currentEditor) return;

        const editor = window.editorCore.currentEditor;
        const selection = window.getSelection();

        // Check if the selection is actually inside the current editor
        let isInEditor = false;
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editor.contains(range.commonAncestorContainer)) {
                isInEditor = true;
            }
        }

        // --- Update Toggle Buttons (Bold, Italic, etc.) ---
        this.toolbarElement.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
            const command = btn.dataset.command;
            let isActive = false;
            if (isInEditor && command && document.queryCommandState) {
                try {
                     // Commands like undo/redo don't have a state, handle them if needed
                     if (['undo', 'redo'].includes(command)) {
                          isActive = false; // Or manage enabled/disabled state elsewhere
                     } else {
                         isActive = document.queryCommandState(command);
                     }
                } catch (error) {
                    // Some commands might throw errors in certain contexts
                    // console.warn(`Could not query state for command '${command}':`, error);
                    isActive = false;
                }
            }
            btn.classList.toggle('active', isActive);
        });

        // --- Update Select Dropdowns (Font Name, Size) ---
        this.toolbarElement.querySelectorAll('.toolbar-select[data-command]').forEach(select => {
            const command = select.dataset.command;
            let value = '';
            if (isInEditor && command && document.queryCommandValue) {
                 try {
                      value = document.queryCommandValue(command);
                      // Clean up browser inconsistencies (e.g., quotes around font names)
                      value = value.replace(/['"]/g, '');
                      // Handle font size (often returns 1-7, needs mapping if toolbar uses pt/px)
                      if (command === 'fontSize' && /^[1-7]$/.test(value)) {
                           // This assumes your select uses values 1-7
                           select.value = value;
                      } else if (value) {
                           // Attempt to find a matching option or set directly
                           const matchingOption = Array.from(select.options).find(opt => opt.value.toLowerCase() === value.toLowerCase());
                           select.value = matchingOption ? matchingOption.value : value;
                      } else {
                           select.value = select.options[0]?.value || ''; // Reset to default/first option
                      }
                 } catch (error) {
                    // console.warn(`Could not query value for command '${command}':`, error);
                     select.value = select.options[0]?.value || '';
                 }

            } else {
                 select.value = select.options[0]?.value || ''; // Reset if not in editor
            }
        });

        // --- Update Color Pickers ---
        if (isInEditor && document.queryCommandValue) {
            try {
                const foreColor = document.queryCommandValue('foreColor');
                const backColor = document.queryCommandValue('hiliteColor'); // Or 'backColor' depending on browser/execCommand used

                const textColorPicker = this.toolbarElement.querySelector('#textColorPicker');
                const bgColorPicker = this.toolbarElement.querySelector('#bgColorPicker');

                if (textColorPicker) {
                    const hexForeColor = this.rgbToHex(foreColor);
                    textColorPicker.value = hexForeColor;
                    this.updateColorIndicator('textColorIndicator', hexForeColor);
                }

                if (bgColorPicker) {
                    const hexBackColor = this.rgbToHex(backColor);
                    // Handle 'transparent' or default case for highlight
                     if (hexBackColor === '#transparent' || hexBackColor === '#000000' && backColor !== 'rgb(0, 0, 0)') { // Check if black is truly black or default
                         bgColorPicker.value = '#ffff00'; // Reset to default yellow or another suitable default
                         this.updateColorIndicator('bgColorIndicator', 'transparent');
                     } else {
                         bgColorPicker.value = hexBackColor;
                         this.updateColorIndicator('bgColorIndicator', hexBackColor);
                     }
                }

            } catch (error) {
                 console.warn("Could not query color values:", error);
                 // Optionally reset color pickers to default
            }
        } else {
             // Reset color pickers if not in editor
             this.initializeColorPickers();
        }
    }


    // --- Helper Functions ---

    updateColorIndicator(indicatorId, color) {
        const indicator = this.toolbarElement?.querySelector(`#${indicatorId}`);
        if (indicator) {
            indicator.style.backgroundColor = color === 'transparent' ? '' : color;
        }
    }

    // Helper to convert rgb(r, g, b) to #rrggbb hex
    rgbToHex(rgbColor) {
        if (!rgbColor || typeof rgbColor !== 'string') return '#000000'; // Default black

         // Handle keyword 'transparent'
         if (rgbColor.toLowerCase() === 'transparent') return '#transparent'; // Use a special value

        // Handle hex colors returned directly
        if (rgbColor.startsWith('#')) return rgbColor;

        // Handle RGB(A) strings
        const result = rgbColor.match(/\d+/g);
        if (result && result.length >= 3) {
            const r = parseInt(result[0], 10);
            const g = parseInt(result[1], 10);
            const b = parseInt(result[2], 10);
             // Ensure values are within 0-255
            const clamp = (val) => Math.min(255, Math.max(0, val));
            return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
        }

        // Handle integer color values (less common from queryCommandValue)
        if (!isNaN(rgbColor)) {
             const intColor = parseInt(rgbColor);
             const hex = intColor.toString(16).padStart(6, '0');
             // Often returns BGR, convert to RGB
             // return `#${hex.substring(4, 6)}${hex.substring(2, 4)}${hex.substring(0, 2)}`;
             return `#${hex}`; // Or just return raw hex if unsure about BGR
        }

        return '#000000'; // Default black if conversion fails
    }
}

// Instantiate and attach to window (or app instance)
if (window.app) {
    window.editorToolbar = new EditorToolbar(window.app);
} else {
    console.error("Main app instance not found for EditorToolbar initialization.");
             }
