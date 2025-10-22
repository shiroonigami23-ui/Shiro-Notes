// Core Canvas Logic & Layer Management Module for Shiro Notes
class CanvasCore {
    constructor(app) {
        this.app = app;
        this.canvas = null;          // The main visible <canvas> element
        this.ctx = null;             // The 2D rendering context for the main canvas
        this.isDrawing = false;      // Flag if mouse/touch is down
        this.startX = 0;             // Start X position for shapes/lines
        this.startY = 0;             // Start Y position for shapes/lines
        this.currentX = 0;           // Current mouse X relative to canvas
        this.currentY = 0;           // Current mouse Y relative to canvas
        this.history = [];           // Array to store canvas states for undo/redo
        this.historyStep = -1;       // Current position in the history stack
        this.layers = [];            // Array of layer objects {id, name, visible, opacity, canvas, ctx}
        this.currentLayer = 0;       // ID of the currently active layer
        this.zoom = 1;               // Current zoom level (currently visual only via CSS)
        this.panX = 0;               // Current horizontal pan (currently visual only via CSS)
        this.panY = 0;               // Current vertical pan (currently visual only via CSS)
        this.images = [];            // Array to hold image objects {element, x, y, width, height, layerId}
        this.selectedImage = null;   // Reference to the currently selected image object for transform
        this.transformHandle = null; // Which resize handle is being dragged ('top-left', etc.)

        // Reference to the tool handler module (will be set externally)
        this.toolHandler = null; // e.g., window.canvasTools
    }

    // --- Initialization ---

    initCanvas(canvasElementId = 'drawingCanvas') {
        this.canvas = document.getElementById(canvasElementId);
        if (!this.canvas) {
            console.error(`Canvas element with ID '${canvasElementId}' not found!`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error("Failed to get 2D context for canvas.");
            return;
        }

        this.setupCanvasProperties();
        this.setupEventListeners();

        // Initialize layers and history only if they are empty
        if (this.layers.length === 0) {
            this.initializeLayers();
            this.saveState(); // Save the initial blank state
        } else {
            // Re-render existing layers if returning to the canvas page
            this.renderLayers();
        }

        console.log("Canvas Core Initialized");
    }

    setupCanvasProperties() {
        // Set a large internal resolution for the canvas
        // The display size is controlled by CSS, allowing scrolling
        this.canvas.width = 3000; // Example large width
        this.canvas.height = 2000; // Example large height

        // Set default drawing styles
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Restore initial state if history exists (e.g., after page reload if persisted)
        // Note: Persisting history/layers across sessions needs additional logic (e.g., saving to app.data)
        if (this.history.length > 0 && this.historyStep >= 0) {
            this.restoreState(this.history[this.historyStep]);
        }
    }

    // --- Event Listeners ---

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse Events
        this.canvas.addEventListener('mousedown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('mouseout', this.handlePointerUp.bind(this)); // Treat mouse out as mouse up

        // Touch Events (mapping to pointer events)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling/zooming while drawing
            this.handlePointerDown(e.touches[0]); // Use first touch
        }, { passive: false }); // Need passive: false to call preventDefault

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handlePointerMove(e.touches[0]);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handlePointerUp(e.changedTouches[0]); // Use changed touch
        });
        this.canvas.addEventListener('touchcancel', (e) => {
             e.preventDefault();
            this.handlePointerUp(e.changedTouches[0]); // Treat cancel as touchend
        });

        // Keyboard shortcuts (delegated from main keyboard module or app.js)
        // We might add specific canvas shortcuts here if needed (e.g., holding shift for straight lines)
    }

    handlePointerDown(e) {
        this.isDrawing = true;
        const pos = this.getPointerPos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.currentX = pos.x;
        this.currentY = pos.y;

        // Delegate the start action to the current tool handler
        this.toolHandler?.startDrawing(this.getActiveLayerContext(), pos);

        // Specific handling for select tool needs to be here as it modifies core state
         const currentTool = window.canvasUI?.currentTool || 'pen'; // Get tool from UI module
         if (currentTool === 'select') {
             this.startSelectionOrTransform(pos.x, pos.y);
         }
    }

    handlePointerMove(e) {
        if (!this.isDrawing) return;

        const pos = this.getPointerPos(e);
        const prevX = this.currentX; // Store previous position for some tools
        const prevY = this.currentY;
        this.currentX = pos.x;
        this.currentY = pos.y;

         const currentTool = window.canvasUI?.currentTool || 'pen';

        // Handle select tool's move/resize directly
         if (currentTool === 'select' && (this.selectedImage || this.transformHandle)) {
             this.transformImage(pos.x, pos.y);
         } else {
             // Delegate drawing action to the tool handler
             this.toolHandler?.draw(this.getActiveLayerContext(), pos, { startX: this.startX, startY: this.startY, prevX, prevY });
         }

        // For shape tools, renderLayers + drawPreview happens in toolHandler.draw
        // For brush tools, renderLayers happens after toolHandler.draw finishes drawing on layerCtx
    }

    handlePointerUp(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const pos = this.getPointerPos(e); // Get final position

        // Delegate the stop action to the tool handler
        const layerCtx = this.getActiveLayerContext();
        this.toolHandler?.stopDrawing(layerCtx, pos, { startX: this.startX, startY: this.startY });

        // Final render and save state
        this.renderLayers(); // Ensure final state is drawn correctly
        this.saveState();

         // Reset selection/transform state AFTER saving state
         const currentTool = window.canvasUI?.currentTool || 'pen';
         if (currentTool === 'select') {
             // If we were transforming, selectedImage should remain selected
             // If we just clicked to select, it's already set in startSelectionOrTransform
             // If we clicked empty space, selectedImage should be null
              if(!this.transformHandle && !this.selectedImage) {
                   this.selectedImage = null; // Deselect if clicked empty space
                   this.renderLayers(); // Redraw without handles
              }
             this.transformHandle = null; // Always reset transform handle on mouse up
         }

    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();

        // Handles both mouse (clientX/Y) and touch (clientX/Y on touch object)
        const clientX = e.clientX;
        const clientY = e.clientY;

        // Calculate scale based on display size vs internal resolution
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Calculate coordinates relative to the canvas's internal resolution
        let x = (clientX - rect.left) * scaleX;
        let y = (clientY - rect.top) * scaleY;

        // --- Future: Apply inverse zoom/pan for coordinates relative to canvas content ---
        // x = (x / this.zoom) + this.panX;
        // y = (y / this.zoom) + this.panY;

         // Snap to grid needs to happen in the tool drawing logic based on UI state
         // if (window.canvasUI?.snapToGrid && window.canvasUI?.gridEnabled) {
         //   const gridSize = 20; // Or get from UI module
         //   x = Math.round(x / gridSize) * gridSize;
         //   y = Math.round(y / gridSize) * gridSize;
         // }

        return { x, y };
    }


    // --- Layer Management ---

    initializeLayers() {
        // Clear existing layers if any
        this.layers = [];
        this.images = []; // Clear images associated with layers

        // Create Background layer (always white, cannot be deleted easily)
        const backgroundLayer = this.createLayerObject(0, 'Background');
        // Fill background layer with white
        backgroundLayer.ctx.fillStyle = '#ffffff';
        backgroundLayer.ctx.fillRect(0, 0, backgroundLayer.canvas.width, backgroundLayer.canvas.height);
        this.layers.push(backgroundLayer);

        // Add initial drawing layer
        this.addLayer('Layer 1'); // This sets currentLayer

        this.currentLayer = 1; // Explicitly set current layer to the first drawing layer
        console.log("Layers initialized, current layer:", this.currentLayer);
        this.renderLayers();
         window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI
    }

    createLayerObject(id, name) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = this.canvas.width;
        layerCanvas.height = this.canvas.height;
        const layerCtx = layerCanvas.getContext('2d');
        if (!layerCtx) throw new Error("Could not create layer context");

        // Ensure new layer contexts inherit defaults
         layerCtx.lineCap = 'round';
         layerCtx.lineJoin = 'round';

        return {
            id: id,
            name: name,
            visible: true,
            opacity: 1,
            canvas: layerCanvas,
            ctx: layerCtx
        };
    }

    addLayer(name = `Layer ${this.layers.length}`) {
        const newId = this.layers.length > 0 ? Math.max(...this.layers.map(l => l.id)) + 1 : 0;
        const newLayer = this.createLayerObject(newId, name);
        this.layers.push(newLayer);
        this.currentLayer = newId; // Switch to the new layer
        this.renderLayers();
        this.saveState(); // Save state after adding layer
        window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI
        console.log("Layer added:", newLayer.name, "Current layer:", this.currentLayer);
    }

     // Renders all visible layers onto the main canvas
     renderLayers(options = { includeGrid: true, includeSelection: true }) {
         if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear main canvas

        this.layers.forEach(layer => {
            if (layer.visible) {
                this.ctx.save();
                this.ctx.globalAlpha = layer.opacity;
                // Draw the layer's base content (drawn lines, shapes etc.)
                this.ctx.drawImage(layer.canvas, 0, 0);
                // Draw any active image objects currently associated with this layer
                this.images.filter(img => img.layerId === layer.id).forEach(img => {
                     this.drawImageWithTransform(this.ctx, img);
                });
                this.ctx.restore();
            }
        });

        // Draw grid if enabled (on top of layers)
        if (options.includeGrid && window.canvasUI?.gridEnabled) {
            window.canvasUI?.drawGrid(this.ctx, this.canvas.width, this.canvas.height);
        }

        // Draw selection handles if needed (on top of everything)
        if (options.includeSelection && this.selectedImage) {
            this.toolHandler?.drawSelectionHandles(this.ctx, this.selectedImage);
        }
     }

      // Helper to draw image, potentially adding rotation/scale later
      drawImageWithTransform(targetCtx, imageInfo) {
          // Basic draw for now
           targetCtx.drawImage(imageInfo.element, imageInfo.x, imageInfo.y, imageInfo.width, imageInfo.height);
          // TODO: Add context saving, translation, rotation, scaling if needed
      }

    getActiveLayerContext() {
        const activeLayer = this.layers.find(l => l.id === this.currentLayer);
        return activeLayer ? activeLayer.ctx : null;
    }

    getActiveLayer() {
        return this.layers.find(l => l.id === this.currentLayer);
    }

    // --- Layer Operations (called by canvas_ui.js) ---

    selectLayer(layerId) {
        if (this.layers.some(l => l.id === layerId)) {
            this.currentLayer = layerId;
            console.log("Current layer set to:", this.currentLayer);
            this.renderLayers(); // Re-render to potentially show different selection/focus
            window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI selection state
        }
    }

    setLayerVisibility(layerId, isVisible) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.visible = isVisible;
            this.renderLayers();
            this.saveState(); // Visibility change is undoable
             window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI checkbox
        }
    }

    setLayerOpacity(layerId, opacity) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, parseFloat(opacity))); // Clamp between 0 and 1
            this.renderLayers();
            // Opacity might not need history save if it's considered a view setting
            // this.saveState();
             window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI slider value
        }
    }

    renameLayer(layerId, newName) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer && newName.trim()) {
            layer.name = newName.trim();
            // Renaming doesn't change pixels, no history save needed usually
            window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI name field
        }
    }

    deleteLayer(layerId) {
        // Prevent deleting the background layer
        const layerToDelete = this.layers.find(l => l.id === layerId);
        if (!layerToDelete || layerToDelete.name === 'Background' || this.layers.length <= 1) {
            this.app.showToast("Cannot delete the background layer.", "warning");
            return false;
        }

        if (confirm(`Are you sure you want to delete layer "${layerToDelete.name}"?`)) {
            this.layers = this.layers.filter(l => l.id !== layerId);
             // Also delete images associated with this layer
             this.images = this.images.filter(img => img.layerId !== layerId);

            // If the deleted layer was the current layer, switch to the one below or background
            if (this.currentLayer === layerId) {
                 const currentIndex = this.layers.findIndex(l => l.id > layerId); // Find index *after* deletion
                 this.currentLayer = this.layers[Math.max(0, currentIndex -1)]?.id ?? this.layers[0]?.id ?? 0; // Select previous or background
            }

            this.renderLayers();
            this.saveState(); // Deletion is undoable
            window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI
            this.app.showToast("Layer deleted.", "success");
            return true; // Indicate success for UI update
        }
        return false; // Indicate cancellation
    }

     // TODO: Implement layer reordering (moveLayerUp, moveLayerDown) if needed
     // This would involve changing the order in the this.layers array and updating IDs maybe?
     // Then call renderLayers, saveState, updateLayersList.


    // --- History Management ---

    saveState() {
        // Clear redo stack if we are saving a new state after undoing
        if (this.historyStep < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyStep + 1);
        }

        // Create a deep copy of the current state (important!)
        const currentState = {
            layers: this.layers.map(layer => ({
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                opacity: layer.opacity,
                // Store image data URL for history, more stable than ImageData across contexts
                imageDataUrl: layer.canvas.toDataURL()
            })),
             images: JSON.parse(JSON.stringify(this.images.map(img => ({...img, element: null})))), // Save image metadata, not element
            currentLayer: this.currentLayer
        };

        this.history.push(currentState);
        this.historyStep++;

        // Limit history size
        const maxHistory = 30; // Adjust as needed for performance
        if (this.history.length > maxHistory) {
            this.history.shift();
            this.historyStep--;
        }
        console.log("State saved. History step:", this.historyStep, "History size:", this.history.length);
         window.canvasUI?.updateUndoRedoButtons(this.canUndo(), this.canRedo()); // Update UI buttons
    }

    restoreState(stateToRestore) {
        if (!stateToRestore) return;

        console.log("Restoring state...");
        this.layers = []; // Clear current layers
        this.images = []; // Clear current images

        const promises = stateToRestore.layers.map(layerState => {
            return new Promise((resolve) => {
                const newLayer = this.createLayerObject(layerState.id, layerState.name);
                newLayer.visible = layerState.visible;
                newLayer.opacity = layerState.opacity;

                const img = new Image();
                img.onload = () => {
                    newLayer.ctx.clearRect(0, 0, newLayer.canvas.width, newLayer.canvas.height); // Clear before drawing
                    newLayer.ctx.drawImage(img, 0, 0);
                    this.layers.push(newLayer); // Add layer only after image is loaded
                    resolve();
                };
                 img.onerror = () => {
                     console.error("Failed to load layer image data from history.");
                     // Add an empty layer anyway to maintain structure
                      this.layers.push(newLayer);
                     resolve();
                 };
                img.src = layerState.imageDataUrl;
            });
        });

         // Restore image objects (need to reload image elements)
         stateToRestore.images.forEach(imgData => {
            const img = new Image();
             // Find original base64 src - this assumes loadImage adds src to the image obj originally
             // We need to modify loadImage to store the src
             // img.src = imgData.src; // Assuming src was stored
             // For now, image state restoration might be incomplete without src
             // Let's just restore position/size metadata
             const restoredImg = {
                 ...imgData,
                 element: img // Will be empty until src is loaded
             };
              this.images.push(restoredImg);
             // TODO: Need a mechanism to reload image sources if they aren't part of the layer dataUrls
         });


        Promise.all(promises).then(() => {
            // Sort layers by ID just in case async loading messed up order
            this.layers.sort((a, b) => a.id - b.id);
            this.currentLayer = stateToRestore.currentLayer;
            this.renderLayers();
            window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI
             window.canvasUI?.updateUndoRedoButtons(this.canUndo(), this.canRedo());
            console.log("State restored. Current layer:", this.currentLayer);
        });
    }


    undo() {
        if (this.canUndo()) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
            this.app.showToast('Undo', 'info', 1000);
        } else {
             this.app.showToast('Nothing to undo', 'info', 1000);
        }
    }

    redo() {
        if (this.canRedo()) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
            this.app.showToast('Redo', 'info', 1000);
        } else {
             this.app.showToast('Nothing to redo', 'info', 1000);
        }
    }

    canUndo() {
        return this.historyStep > 0;
    }

    canRedo() {
        return this.historyStep < this.history.length - 1;
    }

    // --- Image Handling ---

    addImageObject(imgElement, x = 20, y = 20) {
         const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
         const initialWidth = Math.min(imgElement.naturalWidth, this.canvas.width * 0.3); // Start at 30% canvas width or image width
         const initialHeight = initialWidth / aspectRatio;

        const newImage = {
            element: imgElement,
            src: imgElement.src, // Store src for potential history restoration
            x: x,
            y: y,
            width: initialWidth,
            height: initialHeight,
            layerId: this.currentLayer // Assign to current layer
        };
        this.images.push(newImage);
        this.selectedImage = newImage; // Select the newly added image
        this.renderLayers();
        this.saveState(); // Adding an image is an undoable action
         window.canvasUI?.selectTool('select'); // Switch UI to select tool
         this.app.showToast('Image added. Use select tool to move/resize.', 'success');
    }

     // Merges active images onto their assigned layer canvas
     // This is needed before saving or applying filters that affect the whole layer
    flattenImageObjects() {
        console.log("Flattening images...");
        this.layers.forEach(layer => {
            const imagesOnThisLayer = this.images.filter(img => img.layerId === layer.id);
            if (imagesOnThisLayer.length > 0) {
                 console.log(`Drawing ${imagesOnThisLayer.length} images onto layer ${layer.id}`);
                imagesOnThisLayer.forEach(img => {
                     // Draw the image permanently onto the layer's canvas
                      this.drawImageWithTransform(layer.ctx, img);
                });
            }
        });
        // Clear the active images array after drawing them
        this.images = [];
        this.selectedImage = null; // Deselect
        this.renderLayers(); // Re-render without separate image objects/handles
        this.saveState(); // Save the flattened state
         console.log("Flattening complete.");
    }


     startSelectionOrTransform(x, y) {
         // Check if clicking on a resize handle first
         if (this.selectedImage) {
             const handle = this.toolHandler?.getHandleAt(this.selectedImage, x, y);
             if (handle) {
                 this.transformHandle = handle;
                 this.isDrawing = true; // Still use isDrawing for transform state
                 console.log("Starting transform:", handle);
                 return; // Don't try to select a new image
             }
         }

         // If not clicking a handle, find topmost image at click position
         let newlySelectedImage = null;
         // Iterate backwards to find the top-most image
         for (let i = this.images.length - 1; i >= 0; i--) {
             const img = this.images[i];
             // Check if click is within image bounds
             if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
                 newlySelectedImage = img;
                 break; // Found the topmost image
             }
         }

          // Update selection state
          if (newlySelectedImage) {
              this.selectedImage = newlySelectedImage;
              this.isDrawing = true; // Start dragging mode
              // Store offset relative to top-left corner for smooth dragging
              this.startX = x - newlySelectedImage.x;
              this.startY = y - newlySelectedImage.y;
              console.log("Selected image for move:", this.selectedImage);
          } else {
               // Clicked empty space, deselect
               this.selectedImage = null;
               this.isDrawing = false; // Not dragging anything
               console.log("Deselected image.");
          }

         this.renderLayers(); // Redraw to show/hide selection handles
     }


      transformImage(x, y) {
        if (!this.selectedImage || !this.isDrawing) return;

        if (this.transformHandle) {
             // Let the tool handler calculate new dimensions/position
             this.toolHandler?.resizeImage(this.selectedImage, this.transformHandle, x, y);
        } else {
            // Moving the image: update position based on drag offset
            this.selectedImage.x = x - this.startX;
            this.selectedImage.y = y - this.startY;
        }

        // Re-render to show the image being transformed in real-time
        this.renderLayers();
    }


    // --- Saving & Clearing ---

    clearCanvas() {
        if (confirm('Are you sure you want to clear the entire canvas (all layers)?')) {
            this.initializeLayers(); // Re-initialize to reset everything
            this.saveState(); // Save the cleared state
            this.app.showToast('Canvas cleared', 'success');
        }
    }

    // Creates a flattened canvas image blob for saving/export
    async getCanvasAsBlob(format = 'image/png') {
         // Flatten images before generating blob
         this.flattenImageObjects(); // Ensures images are part of the layer data

        // Create a temporary canvas to combine all visible layers
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error("Could not create temporary context for saving.");

         // Ensure background is white if the background layer isn't opaque white
         tempCtx.fillStyle = '#ffffff';
         tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);


        // Draw all visible layers respecting opacity
        this.layers.forEach(layer => {
            if (layer.visible) {
                tempCtx.save();
                tempCtx.globalAlpha = layer.opacity;
                tempCtx.drawImage(layer.canvas, 0, 0);
                tempCtx.restore();
            }
        });

        // Convert the combined canvas to a blob
        return new Promise((resolve, reject) => {
            tempCanvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob failed.'));
                }
            }, format, 0.9); // Added quality parameter for JPEG
        });
    }

    // --- Utility ---

    // Sets the reference to the tool handler module
    setToolHandler(handler) {
        this.toolHandler = handler;
        console.log("Tool Handler set for Canvas Core");
    }

} // End of CanvasCore class

// Instantiate and attach to window
if (window.app) {
    window.canvasCore = new CanvasCore(window.app);
} else {
    console.error("Main app instance not found for CanvasCore initialization.");
}
