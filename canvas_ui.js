// Canvas Toolbar & UI Management Module for Shiro Notes
class CanvasUI {
    constructor(app) {
        this.app = app;
        this.currentTool = 'pen';
        this.color = '#000000';
        this.size = 5;
        this.opacity = 1;
        this.fillEnabled = false;
        this.gridEnabled = false;
        this.snapToGrid = false; // Future use
        this.gridSize = 20;
        this.gridColor = '#e0e0e0'; // Light gray grid

        // References to core modules (will be set externally)
        this.core = null; // e.g., window.canvasCore
        this.tools = null; // e.g., window.canvasTools

        // DOM element references (cached for performance)
        this.toolbarElement = null;
        this.colorInput = null;
        this.sizeInput = null;
        this.opacityInput = null;
        this.fillToggle = null;
        this.gridToggleBtn = null;
        this.layersBtn = null;
        this.undoBtn = null;
        this.redoBtn = null;
        // ... (cache other elements as needed)
    }

    // --- Initialization ---

    initUI(toolbarContainerSelector = '.canvas-toolbar') {
        this.toolbarElement = document.querySelector(toolbarContainerSelector);
        if (!this.toolbarElement) {
            console.error("Canvas toolbar container not found:", toolbarContainerSelector);
            return false;
        }

        // Cache important elements
        this.colorInput = this.toolbarElement.querySelector('#canvasColor');
        this.sizeInput = this.toolbarElement.querySelector('#canvasSize');
        this.opacityInput = this.toolbarElement.querySelector('#canvasOpacity');
        this.fillToggle = this.toolbarElement.querySelector('#fillShapeToggle');
        this.gridToggleBtn = this.toolbarElement.querySelector('[onclick*="toggleGrid"]'); // Find via onclick content
        this.layersBtn = this.toolbarElement.querySelector('[onclick*="showLayersPanel"]');
        this.undoBtn = this.toolbarElement.querySelector('[onclick*="undo"]');
        this.redoBtn = this.toolbarElement.querySelector('[onclick*="redo"]');


        if (!this.colorInput || !this.sizeInput || !this.opacityInput || !this.fillToggle) {
             console.warn("One or more canvas setting controls (color, size, opacity, fill) not found.");
             // Continue initialization, but some features might not work
        }

        this.setupToolbarListeners();
        this.selectTool(this.currentTool); // Set initial tool state
        this.updateCursor();
        this.updateUndoRedoButtons(this.core?.canUndo() ?? false, this.core?.canRedo() ?? false);

        console.log("Canvas UI Initialized");
        return true;
    }

    // --- Connect Core/Tools Modules ---
    setCore(coreInstance) { this.core = coreInstance; }
    setTools(toolsInstance) { this.tools = toolsInstance; }

    // --- Toolbar Event Listeners ---

    setupToolbarListeners() {
        if (!this.toolbarElement) return;

        // --- Tool Selection Buttons ---
        this.toolbarElement.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent dropdown from closing if clicking inside
                 e.stopPropagation();
                const newTool = btn.getAttribute('data-tool');
                this.selectTool(newTool);

                // Update the main dropdown button icon/text if inside a dropdown
                const dropdown = btn.closest('.tool-dropdown');
                if (dropdown) {
                    const mainBtn = dropdown.querySelector('button:first-child'); // Target the main button
                    if(mainBtn) {
                         // Copy the icon from the clicked button
                         const iconHTML = btn.querySelector('i')?.outerHTML || '';
                         if(iconHTML) {
                              mainBtn.innerHTML = iconHTML; // Just the icon
                         }
                    }
                    // Optional: Close dropdown after selection? Needs more complex logic.
                }
            });
        });

        // --- Filter Buttons ---
        this.toolbarElement.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent dropdown closing
                 if(this.core) {
                    this.core.flattenImageObjects(); // Apply filters requires flattened images
                    this.tools?.applyFilter(this.core.getActiveLayerContext(), btn.dataset.filter);
                    this.core.renderLayers(); // Re-render after filter
                    this.core.saveState(); // Save filtered state
                    this.app.showToast(`${btn.dataset.filter} filter applied`, 'success');
                 }
                // Optional: Close dropdown
            });
        });

        // --- Settings Inputs ---
        if (this.colorInput) {
            this.colorInput.addEventListener('input', (e) => {
                this.color = e.target.value;
                this.updateCursor(); // Update cursor color preview
                 // Update stroke/fill for active layer context immediately? Optional.
                 // const ctx = this.core?.getActiveLayerContext();
                 // if (ctx) { ctx.strokeStyle = this.color; ctx.fillStyle = this.color; }
            });
             // Set initial value
            this.colorInput.value = this.color;
        }
        if (this.sizeInput) {
            this.sizeInput.addEventListener('input', (e) => {
                this.size = parseInt(e.target.value, 10);
                this.updateCursor(); // Update cursor size preview
                // Optional: Update label showing size value
                const sizeLabel = this.sizeInput.closest('label')?.querySelector('span'); // Assuming format like <label>Size: <span>5</span><input></label>
                if (sizeLabel) sizeLabel.textContent = this.size;
            });
             this.sizeInput.value = this.size;
        }
        if (this.opacityInput) {
            this.opacityInput.addEventListener('input', (e) => {
                this.opacity = parseFloat(e.target.value);
                // Optional: Update label showing opacity value
                 const opacityLabel = this.opacityInput.closest('label')?.querySelector('span');
                 if (opacityLabel) opacityLabel.textContent = this.opacity.toFixed(1);

            });
             this.opacityInput.value = this.opacity;
        }
        if (this.fillToggle) {
            this.fillToggle.addEventListener('change', (e) => {
                this.fillEnabled = e.target.checked;
            });
             this.fillToggle.checked = this.fillEnabled;
        }

        // --- Action Buttons (Undo, Redo, Clear, Save, Load, Grid, Layers) ---
        // These are typically handled by direct onclick attributes calling module functions
        // Example: Update Undo/Redo button state based on core history
        // Add event listeners if not using onclick:
        /*
        if (this.undoBtn) this.undoBtn.addEventListener('click', () => this.core?.undo());
        if (this.redoBtn) this.redoBtn.addEventListener('click', () => this.core?.redo());
        if (this.gridToggleBtn) this.gridToggleBtn.addEventListener('click', () => this.toggleGrid());
        if (this.layersBtn) this.layersBtn.addEventListener('click', () => this.showLayersPanel());
        // Add listeners for save, load, clear etc.
        */
    }

    // --- Tool Management ---

    selectTool(toolName) {
        console.log("Selecting tool:", toolName);
        this.currentTool = toolName;
        // Remove active class from all tool buttons
        this.toolbarElement?.querySelectorAll('.tool-btn[data-tool].active')
            .forEach(btn => btn.classList.remove('active'));
        // Add active class to the selected tool button
        const selectedBtn = this.toolbarElement?.querySelector(`.tool-btn[data-tool="${toolName}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        } else {
             console.warn(`Button for tool '${toolName}' not found.`);
        }
        this.updateCursor();

         // Deselect image if switching away from select tool
         if (toolName !== 'select' && this.core?.selectedImage) {
             this.core.selectedImage = null;
             this.core.renderLayers(); // Redraw without handles
         }
    }

    getToolSettings() {
        return {
            tool: this.currentTool,
            color: this.color,
            size: this.size,
            opacity: this.opacity,
            fillEnabled: this.fillEnabled
        };
    }

    // --- Cursor Updates ---

    updateCursor() {
        if (!this.core?.canvas) return;
        let cursorStyle = 'crosshair'; // Default

        switch (this.currentTool) {
            case 'pen':
            case 'brush':
            case 'calligraphy':
            case 'spray':
                // Dynamic SVG cursor showing size and color
                const cursorSize = Math.max(4, this.size) + 2; // Base size + border
                const radius = this.size / 2;
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}">
                                <circle cx="${cursorSize/2}" cy="${cursorSize/2}" r="${radius}" fill="rgba(0,0,0,0)" stroke="${this.color}" stroke-width="1"/>
                             </svg>`;
                cursorStyle = `url('data:image/svg+xml;base64,${btoa(svg)}') ${cursorSize/2} ${cursorSize/2}, crosshair`;
                break;
            case 'eraser':
                const eraserSize = Math.max(4, this.size * 1.5) + 2; // Eraser cursor slightly larger
                const eraserSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${eraserSize}" height="${eraserSize}" viewBox="0 0 ${eraserSize} ${eraserSize}">
                                     <rect x="1" y="1" width="${eraserSize-2}" height="${eraserSize-2}" fill="rgba(0,0,0,0)" stroke="black" stroke-width="1" rx="2"/>
                                   </svg>`;
                cursorStyle = `url('data:image/svg+xml;base64,${btoa(eraserSvg)}') ${eraserSize/2} ${eraserSize/2}, crosshair`;
                break;
            case 'text':
                cursorStyle = 'text';
                break;
            case 'eyedropper':
                cursorStyle = 'copy'; // Or a custom eyedropper cursor SVG
                break;
            case 'select':
                 cursorStyle = 'default'; // Change to move/resize cursors dynamically based on hover
                 // This dynamic part would likely happen in core's handlePointerMove
                break;
            // Add cases for line, rectangle, circle etc. if specific cursors are desired
            default:
                cursorStyle = 'crosshair';
        }
        this.core.canvas.style.cursor = cursorStyle;
    }

    // --- Grid Management ---

    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        this.core?.renderLayers(); // Re-render to show/hide grid
        this.app.showToast(`Grid ${this.gridEnabled ? 'enabled' : 'disabled'}`, 'info', 1500);
        // Update grid button state if needed
        this.gridToggleBtn?.classList.toggle('active', this.gridEnabled);
    }

    drawGrid(ctx, width, height) {
        if (!ctx) return;
        ctx.save();
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.4; // Make grid subtle

        // Draw vertical lines
        for (let x = this.gridSize; x < width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0); // Offset by 0.5 for sharper lines
            ctx.lineTo(x + 0.5, height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = this.gridSize; y < height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
            ctx.stroke();
        }

        ctx.restore();
    }

     // --- Eyedropper ---
     pickColorAt(canvasX, canvasY) {
         if (!this.core?.ctx) return;
         try {
             // Get pixel data from the main visible canvas context
             const pixelData = this.core.ctx.getImageData(Math.floor(canvasX), Math.floor(canvasY), 1, 1).data;
             // Convert RGB to HEX
             const hexColor = "#" + ("000000" + ((pixelData[0] << 16) | (pixelData[1] << 8) | pixelData[2]).toString(16)).slice(-6);

             // Update UI and current color setting
             this.color = hexColor;
             if (this.colorInput) this.colorInput.value = hexColor;
             this.updateCursor(); // Update cursor preview if applicable
             this.app.showToast(`Color picked: ${hexColor}`, 'info', 2000);

             // Automatically switch back to the previous tool (or pen)
             // This needs storing the previous tool state, omitted for simplicity now.
             this.selectTool('pen'); // Simple switch back to pen

         } catch (e) {
             console.error("Error picking color (possibly due to cross-origin image):", e);
             this.app.showToast("Could not pick color from this area.", "warning");
         }
     }

    // --- Layers Panel ---

    showLayersPanel() {
        if (!this.core) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay layer-panel-modal'; // Add specific class
        modal.id = 'layersPanelModal'; // ID for easy targeting
        modal.innerHTML = `
          <div class="modal-content layers-panel">
            <div class="modal-header">
              <h3><i class="fas fa-layer-group"></i> Layers</h3>
              <button class="close-btn" onclick="document.getElementById('layersPanelModal').remove()">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="layers-list" id="layersListContainer">
                ${this.renderLayersList(this.core.layers, this.core.currentLayerId)}
              </div>
            </div>
             <div class="modal-footer layers-footer">
               <button class="btn btn--secondary btn--sm layer-action-btn" title="Move Layer Down" id="moveLayerDownBtn">
                 <i class="fas fa-arrow-down"></i>
               </button>
                <button class="btn btn--secondary btn--sm layer-action-btn" title="Move Layer Up" id="moveLayerUpBtn">
                 <i class="fas fa-arrow-up"></i>
               </button>
               <button class="btn btn--danger btn--sm layer-action-btn" title="Delete Layer" id="deleteLayerBtn">
                  <i class="fas fa-trash"></i>
               </button>
               <div style="flex-grow: 1;"></div> <!-- Spacer -->
               <button class="btn btn--primary btn--sm" onclick="window.canvasCore?.addLayer();">
                 <i class="fas fa-plus"></i> New Layer
               </button>
             </div>
          </div>
        `;

        document.body.appendChild(modal);
        this.updateLayerPreviews(); // Draw previews after appending
        this.attachLayerPanelListeners(); // Attach listeners for buttons
        setTimeout(() => modal.classList.add('visible'), 10);
    }

    renderLayersList(layers, currentLayerId) {
         // Render layers in reverse order (top layer first)
        return layers.slice().reverse().map(layer => `
          <div class="layer-item ${layer.id === currentLayerId ? 'active' : ''}" data-layer-id="${layer.id}">
            <div class="layer-preview">
              <canvas width="60" height="45" data-layer-id="${layer.id}"></canvas>
            </div>
            <div class="layer-info">
              <input type="text" class="layer-name-input" value="${this.app.escapeHtml(layer.name)}" data-layer-id="${layer.id}" ${layer.name === 'Background' ? 'readonly' : ''}>
              <div class="layer-controls">
                <input type="range" class="layer-opacity-slider" min="0" max="1" step="0.05" value="${layer.opacity}" data-layer-id="${layer.id}" title="Opacity: ${Math.round(layer.opacity*100)}%">
              </div>
            </div>
             <div class="layer-visibility">
                 <button class="btn btn--sm visibility-toggle ${layer.visible ? 'is-visible' : ''}" data-layer-id="${layer.id}" title="${layer.visible ? 'Hide Layer' : 'Show Layer'}">
                   <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                 </button>
             </div>
          </div>
        `).join('');
    }

    updateLayersList(layers, currentLayerId) {
        const container = document.getElementById('layersListContainer');
        if (container) {
            container.innerHTML = this.renderLayersList(layers, currentLayerId);
            this.updateLayerPreviews();
            this.attachLayerItemListeners(); // Re-attach listeners to new items
        }
         // Update state of move/delete buttons based on current selection
         this.updateLayerActionButtons();
    }

    updateLayerPreviews() {
        const modal = document.getElementById('layersPanelModal');
        if (!modal || !this.core) return;

        modal.querySelectorAll('.layer-preview canvas').forEach(previewCanvas => {
            const layerId = parseInt(previewCanvas.getAttribute('data-layer-id'), 10);
            const layer = this.core.layers.find(l => l.id === layerId);
            if (layer) {
                const previewCtx = previewCanvas.getContext('2d');
                 // Clear previous preview & draw white background for transparency representation
                 previewCtx.fillStyle = '#ffffff';
                 previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
                // Draw layer content scaled down
                previewCtx.drawImage(layer.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
            }
        });
    }

    attachLayerPanelListeners() {
        const modal = document.getElementById('layersPanelModal');
        if (!modal) return;

        // Attach listeners for footer buttons
        document.getElementById('deleteLayerBtn')?.addEventListener('click', () => {
             if(this.core?.deleteLayer(this.core.currentLayerId)) {
                 // If deletion was successful, UI update is handled by core calling updateLayersList
             }
        });
        // TODO: Add listeners for move up/down buttons, calling core.moveLayerUp/Down

        // Attach listeners for items within the list (delegated)
        this.attachLayerItemListeners();
    }

     attachLayerItemListeners() {
         const container = document.getElementById('layersListContainer');
         if (!container) return;

         container.querySelectorAll('.layer-item').forEach(item => {
             const layerId = parseInt(item.getAttribute('data-layer-id'), 10);

             // Select layer on click (but not on input/slider/button)
             item.addEventListener('click', (e) => {
                 if (e.target.closest('input, button, .layer-controls')) return; // Ignore clicks on controls
                 this.core?.selectLayer(layerId);
             });

             // Rename layer on input change
             item.querySelector('.layer-name-input')?.addEventListener('change', (e) => {
                 this.core?.renameLayer(layerId, e.target.value);
             });

               // Change opacity on slider input
             item.querySelector('.layer-opacity-slider')?.addEventListener('input', (e) => {
                 this.core?.setLayerOpacity(layerId, e.target.value);
                  // Update title tooltip in real-time
                 e.target.title = `Opacity: ${Math.round(parseFloat(e.target.value)*100)}%`;
             });
              // Save history only on change (mouseup/touchend) to avoid flooding
             item.querySelector('.layer-opacity-slider')?.addEventListener('change', (e) => {
                  this.core?.saveState();
             });


             // Toggle visibility on button click
             item.querySelector('.visibility-toggle')?.addEventListener('click', (e) => {
                  e.stopPropagation(); // Prevent layer selection
                  const button = e.currentTarget;
                  const layer = this.core?.layers.find(l => l.id === layerId);
                  if (layer) {
                     this.core?.setLayerVisibility(layerId, !layer.visible);
                     // Core calls updateLayersList which redraws the button state
                  }
             });
         });
          // Update action buttons based on currently selected layer
         this.updateLayerActionButtons();
     }

     updateLayerActionButtons() {
         const deleteBtn = document.getElementById('deleteLayerBtn');
         // const moveUpBtn = document.getElementById('moveLayerUpBtn');
         // const moveDownBtn = document.getElementById('moveLayerDownBtn');

          if (!this.core || !deleteBtn /* || !moveUpBtn || !moveDownBtn */ ) return;

          const currentLayerIndex = this.core.layers.findIndex(l => l.id === this.core.currentLayerId);
          const isBackground = currentLayerIndex === 0;
          const isOnlyLayer = this.core.layers.length <= 1;

          // Enable/disable Delete button
          deleteBtn.disabled = isBackground || isOnlyLayer;

          // TODO: Enable/disable Move Up/Down buttons based on index
          // moveUpBtn.disabled = isBackground || currentLayerIndex >= this.core.layers.length - 1; // Cannot move top layer up
          // moveDownBtn.disabled = isBackground || currentLayerIndex <= 1; // Cannot move layer below background down
     }


    // --- Undo/Redo ---

    updateUndoRedoButtons(canUndo, canRedo) {
        if (this.undoBtn) this.undoBtn.disabled = !canUndo;
        if (this.redoBtn) this.redoBtn.disabled = !canRedo;
    }

    // --- Loading & Saving (Triggered by UI) ---

    triggerLoadImage() {
         if (!this.core) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Optional: Check file size
            if (file.size > 5 * 1024 * 1024) { // 5MB limit example
                this.app.showToast('Image file is too large (max 5MB).', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // Pass the loaded image element to the core module
                    this.core.addImageObject(img);
                };
                 img.onerror = () => {
                      this.app.showToast('Failed to load image file.', 'error');
                 };
                img.src = event.target.result;
            };
             reader.onerror = () => {
                 this.app.showToast('Failed to read image file.', 'error');
             };
            reader.readAsDataURL(file);
        };
        input.click(); // Open file dialog
    }

    async triggerSaveCanvas() {
        if (!this.core) return;
        try {
            this.app.showToast("Preparing image...", "info"); // Use UI module toast
            const blob = await this.core.getCanvasAsBlob('image/png'); // Get blob from core
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Generate filename based on current date/time
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `shiro_canvas_${timestamp}.png`;
            document.body.appendChild(a); // Required for Firefox
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.app.showToast('Canvas saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving canvas:', error);
            this.app.showToast(`Error saving canvas: ${error.message}`, 'error');
        }
    }

     // Trigger saving the canvas as a Note
     async triggerSaveToNotes() {
         if (!this.core) return;
         try {
             this.app.showToast("Saving to notes...", "info");
             const blob = await this.core.getCanvasAsBlob('image/png');

             // Convert blob to dataURL for embedding in note content
             const reader = new FileReader();
             reader.onloadend = () => {
                 const dataURL = reader.result;
                 const timestamp = new Date().toLocaleString();
                 const note = {
                     id: this.app.generateId(),
                     title: `Canvas Drawing - ${timestamp}`,
                     content: `<img src="${dataURL}" alt="Canvas Drawing ${timestamp}" style="max-width: 100%; height: auto; border: 1px solid var(--color-border);">`,
                     type: 'canvas', // Mark as canvas type
                     created: new Date().toISOString(),
                     lastModified: new Date().toISOString(),
                     tags: ['canvas', 'drawing'],
                     bookmarked: false,
                     encrypted: false
                 };

                 this.app.data.notes.push(note);
                 this.app.saveData(); // Save main app data
                 this.app.updateUI(); // Update overall app UI (like note counts)
                 this.app.showToast('Canvas saved as a new note!', 'success');
             };
              reader.onerror = () => {
                   throw new Error("Failed to convert canvas blob to data URL.");
              };
             reader.readAsDataURL(blob);

         } catch (error) {
             console.error('Error saving canvas to notes:', error);
             this.app.showToast(`Error saving to notes: ${error.message}`, 'error');
         }
     }


} // End of CanvasUI class

// Instantiate and attach to window
if (window.app) {
    window.canvasUI = new CanvasUI(window.app);
     // Connect to core module if it exists
     if(window.canvasCore) {
         window.canvasCore.setUIHandler(window.canvasUI);
         window.canvasUI.setCore(window.canvasCore); // Bi-directional link
     }
      if(window.canvasTools) {
          window.canvasUI.setTools(window.canvasTools);
      }
} else {
    console.error("Main app instance not found for CanvasUI initialization.");
}
