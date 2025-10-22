// Canvas Drawing Module Coordinator for Shiro Notes
class CanvasModule {
    constructor(app) {
        this.app = app;

        // Sub-module references (assuming global availability)
        // Ensure canvas_core.js, canvas_tools.js, canvas_ui.js are loaded *before* this file
        this.core = window.canvasCore;
        this.tools = window.canvasTools;
        this.ui = window.canvasUI;

        this.isInitialized = false;

        // Check if sub-modules loaded
        if (!this.core || !this.tools || !this.ui) {
            console.error("One or more canvas sub-modules failed to load!");
            // Optionally disable canvas functionality or show an error
        }

        this.init();
    }

    init() {
        console.log("Canvas Module Coordinator Initialized");
        // Inject canvas-specific CSS
        this.injectCanvasStyles();

        // Establish connections between modules
        if (this.core && this.ui && this.tools) {
            this.core.setUIHandler(this.ui); // Core needs UI for grid drawing, history updates
            this.core.setToolHandler(this.tools); // Core needs tools for drawing actions
            this.ui.setCore(this.core); // UI needs core for actions like undo/redo, layer ops
            this.ui.setTools(this.tools); // UI needs tools for filter actions
            this.tools.setCore(this.core); // Tools need core for layer context, image data
            this.tools.setUIHandler(this.ui); // Tools need UI for getting settings, picking color
        } else {
             console.error("Canvas sub-module linking failed.");
        }
    }

    // --- Public API for App ---

    // Called by app.js when navigating to the canvas page
    initCanvas() {
        if (!this.core || !this.ui) {
             console.error("Canvas Core or UI not ready for initialization.");
             // Show error message on the page?
             const page = document.getElementById('canvasPage');
             if(page) page.innerHTML = "<p>Error loading canvas module.</p>";
             return;
        }

        if (this.isInitialized) {
            console.log("Canvas already initialized, re-activating.");
             // Potentially re-attach listeners or redraw if needed after page switch
             this.core.setupEventListeners(); // Re-attach main canvas listeners
             this.ui.initUI(); // Re-initialize UI listeners and state
             this.core.renderLayers(); // Redraw
            return;
        }

        console.log("Initializing Canvas...");
        // Core initialization finds the canvas element and sets up contexts
        if (this.core.initCanvasElement('drawingCanvas')) {
            // UI initialization finds toolbar elements and attaches listeners
            if (this.ui.initUI('.canvas-toolbar')) {
                this.isInitialized = true;
                console.log("Canvas Initialized Successfully.");
            } else {
                 console.error("Canvas UI initialization failed.");
                 // Handle UI init failure
            }
        } else {
             console.error("Canvas Core initialization failed (canvas element not found?).");
             // Handle core init failure
        }
    }

     // Called when navigating away from the canvas page
     destroyCanvas() {
         if (!this.isInitialized) return;
         console.log("Destroying Canvas Module state...");
          if (this.core) this.core.destroy(); // Core handles listener removal, etc.
          // UI module doesn't hold much state that needs explicit destroy usually
         this.isInitialized = false;
         // Note: The canvas element and toolbar remain in the DOM unless removed by app.js page loading
     }

    // --- Delegated Actions ---

    saveCanvas() {
        if (!this.isInitialized || !this.ui) return console.error("Canvas not ready to save.");
        this.ui.triggerSaveCanvas();
    }

     saveToNotes() {
         if (!this.isInitialized || !this.ui) return console.error("Canvas not ready to save to notes.");
         this.ui.triggerSaveToNotes();
     }


    loadImage() {
        if (!this.isInitialized || !this.ui) return console.error("Canvas not ready to load image.");
        this.ui.triggerLoadImage();
    }

    undo() {
        if (!this.isInitialized || !this.core) return;
        this.core.undo();
    }

    redo() {
        if (!this.isInitialized || !this.core) return;
        this.core.redo();
    }

    clear() {
        if (!this.isInitialized || !this.core) return;
        if (confirm('Are you sure you want to clear the entire canvas? This cannot be undone.')) {
            this.core.clearAllLayers();
        }
    }

    toggleGrid() {
         if (!this.isInitialized || !this.ui) return;
         this.ui.toggleGrid();
    }

    showLayersPanel() {
         if (!this.isInitialized || !this.ui) return;
         this.ui.showLayersPanel();
    }

    // --- Style Injection ---
    injectCanvasStyles() {
        const canvasStyles = `
            /* Styles from canvas.css (consolidated) */
            /* Ensure all necessary styles for toolbar, canvas wrapper, modals are here */

            /* Example start: */
            .canvas-container { display: flex; flex-direction: column; height: 100%; width: 100%; overflow: hidden; background-color: var(--color-background); }
            .canvas-toolbar { display: flex; align-items: center; padding: var(--space-2) var(--space-4); background-color: var(--color-surface); border-bottom: 1px solid var(--color-card-border); gap: var(--space-3); overflow-x: auto; flex-shrink: 0; flex-wrap: wrap; }
            .canvas-toolbar .tool-group { display: flex; align-items: center; gap: var(--space-2); padding: 0 var(--space-3); border-right: 1px solid var(--color-border); }
            .canvas-toolbar .tool-group:last-child { border-right: none; }
            .canvas-wrapper { flex-grow: 1; overflow: auto; position: relative; padding: var(--space-4); display: flex; justify-content: flex-start; /* Align canvas top-left */ align-items: flex-start; }
            #drawingCanvas { background-color: white; border-radius: var(--radius-base); box-shadow: var(--shadow-sm); cursor: crosshair; /* width/height set by core */ display: block; /* Remove extra space below */ }

            /* Toolbar Buttons */
            .canvas-toolbar .tool-btn { /* Basic button styles */
                width: 36px; height: 36px; border: none; background-color: transparent; color: var(--color-text-secondary);
                border-radius: var(--radius-base); cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: all 0.2s ease-out; flex-shrink: 0; padding: 0;
             }
            .canvas-toolbar .tool-btn:hover { background-color: var(--color-secondary); color: var(--color-primary); transform: translateY(-1px); }
            .canvas-toolbar .tool-btn.active { background-color: var(--color-primary); color: white; transform: translateY(0); }
            .canvas-toolbar .tool-btn:disabled { opacity: 0.5; cursor: not-allowed; background-color: transparent; transform: none; }

            /* Dropdowns */
            .tool-dropdown { position: relative; display: inline-block; }
            .tool-dropdown > button:first-child { /* Style the main trigger button */ }
            /* Simple hover dropdown */
            .tool-dropdown:hover .dropdown-content { display: block; opacity: 1; visibility: visible; transform: translateY(0); }
            .tool-dropdown .dropdown-content {
                display: block; /* Use opacity/visibility for transition */
                opacity: 0; visibility: hidden; transform: translateY(5px);
                position: absolute; background-color: var(--color-surface); min-width: 180px;
                box-shadow: var(--shadow-lg); border-radius: var(--radius-base);
                border: 1px solid var(--color-card-border); padding: var(--space-2);
                z-index: 100; margin-top: var(--space-2);
                transition: opacity 0.15s ease-out, visibility 0.15s ease-out, transform 0.15s ease-out;
             }
            .dropdown-content .tool-btn, .dropdown-content .filter-btn {
                width: 100%; justify-content: flex-start; gap: var(--space-3); padding: var(--space-2) var(--space-3);
                background: none; text-align: left; font-weight: 500; font-size: var(--font-size-sm);
                border-radius: var(--radius-sm); color: var(--color-text); /* Ensure text color */
             }
             .dropdown-content .tool-btn:hover, .dropdown-content .filter-btn:hover {
                 background-color: var(--color-secondary); color: var(--color-primary); /* Consistent hover */
             }
             .dropdown-content .tool-btn i, .dropdown-content .filter-btn i { width: 16px; text-align: center; color: var(--color-primary); opacity: 0.8; }


            /* Settings Inputs */
            .brush-settings { display: flex; align-items: center; gap: var(--space-4); background: var(--color-background); padding: var(--space-1) var(--space-3); border-radius: var(--radius-base); }
            .toolbar-label { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-secondary); cursor: pointer; white-space: nowrap;}
            .toolbar-label input[type="range"] { vertical-align: middle; width: 80px; cursor: pointer;}
            .toolbar-label input[type="checkbox"] { cursor: pointer; }
            .toolbar-label input[type="color"] { border: none; padding: 0; width: 24px; height: 24px; vertical-align: middle; cursor: pointer; border-radius: var(--radius-sm); overflow: hidden;}
            /* Style the color input appearance */
            .toolbar-label input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
            .toolbar-label input[type="color"]::-webkit-color-swatch { border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
            .toolbar-label input[type="color"]::-moz-color-swatch { border: 1px solid var(--color-border); border-radius: var(--radius-sm); }


            /* Layers Panel Modal */
            .layer-panel-modal .modal-content { max-width: 450px; }
            .layers-list { max-height: 40vh; overflow-y: auto; margin-bottom: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-base); }
            .layer-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-border); cursor: pointer; transition: all var(--transition-fast); }
            .layer-item:last-child { border-bottom: none; }
            .layer-item:hover { background-color: var(--color-secondary); }
            .layer-item.active { background-color: var(--color-bg-1); border-left: 3px solid var(--color-primary); padding-left: calc(var(--space-3) - 3px);}
            .layer-preview { width: 60px; height: 45px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 10px 10px; background-position: 0 0, 0 5px, 5px -5px, -5px 0px; flex-shrink: 0; }
            .layer-preview canvas { width: 100%; height: 100%; display: block;}
            .layer-info { flex: 1; min-width: 0; }
            .layer-name-input { width: 100%; padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); border: 1px solid transparent; background: transparent; font-weight: var(--font-weight-medium); }
            .layer-name-input:hover { border-color: var(--color-border); }
            .layer-name-input:focus { border-color: var(--color-primary); background: var(--color-background); }
            .layer-name-input[readonly] { pointer-events: none; }
            .layer-controls { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-sm); margin-top: var(--space-1); }
            .layer-opacity-slider { width: 100%; height: 6px; cursor: pointer; }
            .layer-visibility { flex-shrink: 0; }
            .visibility-toggle { color: var(--color-text-secondary); background: transparent; border: none;}
            .visibility-toggle:hover { background-color: var(--color-secondary); }
            .visibility-toggle.is-visible { color: var(--color-primary); }
            .layers-footer { display: flex; align-items: center; gap: var(--space-2); }
            .layer-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

            /* Responsive */
            @media (max-width: 768px) {
                 .canvas-toolbar { padding: var(--space-2); gap: var(--space-2); }
                 .canvas-toolbar .tool-group { padding: 0 var(--space-2); border-right: none;}
                 .canvas-wrapper { padding: var(--space-2); }
                 .brush-settings { gap: var(--space-2); }
                 .toolbar-label input[type="range"] { width: 60px; }
            }
        `;
        // Check if styles already injected
        if (!document.getElementById('shiro-canvas-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'shiro-canvas-styles';
            styleSheet.textContent = canvasStyles;
            document.head.appendChild(styleSheet);
        }
    }

} // End of CanvasModule class

// Initialize canvas module coordinator AFTER sub-modules are loaded
// Ensure canvas_core.js, canvas_tools.js, canvas_ui.js are included *before* this file.
if (window.app) {
    window.canvasModule = new CanvasModule(window.app);

    // Override app's loadCanvasPage method to use the coordinator
    // and add cleanup when navigating away
    const originalLoadCanvasPage = window.app.loadCanvasPage;
    window.app.loadCanvasPage = function(pageElement) {
        // Call original to set up basic HTML structure (if it does that)
        originalLoadCanvasPage.call(this, pageElement);
        // Initialize the canvas via the coordinator
        window.canvasModule.initCanvas();
    };

    // Add cleanup hook (example - needs integration into app's navigation)
    // window.app.onNavigateAwayFromCanvas = () => {
    //     window.canvasModule.destroyCanvas();
    // };

} else {
    console.error("Main app instance not found for CanvasModule initialization.");
}
