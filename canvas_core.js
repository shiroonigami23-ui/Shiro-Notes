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
        this.zoom = 1;               // Current zoom level
        this.panX = 0;               // Current horizontal pan in screen space
        this.panY = 0;               // Current vertical pan in screen space
        this.minZoom = 0.2;
        this.maxZoom = 5;
        this.isPanning = false;
        this.spacePressed = false;
        this.lastPanClientX = 0;
        this.lastPanClientY = 0;
        this.autoExpandPadding = 320;
        this.autoExpandStep = 1200;
        this.lastRuntimeErrorAt = 0;
        this.lastLayerWarningAt = 0;
        this.images = [];            // Array to hold image objects {element, x, y, width, height, layerId}
        this.selectedImage = null;   // Reference to the currently selected image object for transform
        this.transformHandle = null; // Which resize handle is being dragged ('top-left', etc.)
        this.wrapper = null;         // Scroll container around canvas

        // Reference to the tool handler module (will be set externally)
        this.toolHandler = null; // e.g., window.canvasTools

        // Keep stable listener references so we can safely re-bind/destroy.
        this._listenersAttached = false;
        this._boundMouseDown = null;
        this._boundMouseMove = null;
        this._boundMouseUp = null;
        this._boundMouseOut = null;
        this._boundTouchStart = null;
        this._boundTouchMove = null;
        this._boundTouchEnd = null;
        this._boundTouchCancel = null;
        this._boundWheel = null;
        this._boundContextMenu = null;
        this._boundKeyDown = null;
        this._boundKeyUp = null;
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
        this.wrapper = this.canvas.closest('.canvas-wrapper');

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
        return true;
    }

    setupCanvasProperties() {
        // Set a large internal resolution for the canvas
        // The display size is controlled by CSS, allowing scrolling
        if (this.canvas.width < 3000) this.canvas.width = 3000;
        if (this.canvas.height < 2000) this.canvas.height = 2000;

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

        // Avoid stacking duplicate listeners when returning to the canvas page.
        this.teardownEventListeners();

        this._boundMouseDown = this.handlePointerDown.bind(this);
        this._boundMouseMove = this.handlePointerMove.bind(this);
        this._boundMouseUp = this.handlePointerUp.bind(this);
        this._boundMouseOut = this.handlePointerUp.bind(this);
        this._boundTouchStart = (e) => {
            e.preventDefault();
            this.handlePointerDown(e.touches[0]);
        };
        this._boundTouchMove = (e) => {
            e.preventDefault();
            this.handlePointerMove(e.touches[0]);
        };
        this._boundTouchEnd = (e) => {
            e.preventDefault();
            this.handlePointerUp(e.changedTouches[0]);
        };
        this._boundTouchCancel = (e) => {
            e.preventDefault();
            this.handlePointerUp(e.changedTouches[0]);
        };
        this._boundWheel = this.handleWheel.bind(this);
        this._boundContextMenu = (e) => e.preventDefault();
        this._boundKeyDown = (e) => {
            if (e.code === 'Space') this.spacePressed = true;
        };
        this._boundKeyUp = (e) => {
            if (e.code === 'Space') this.spacePressed = false;
        };

        // Mouse Events
        this.canvas.addEventListener('mousedown', this._boundMouseDown);
        this.canvas.addEventListener('mousemove', this._boundMouseMove);
        this.canvas.addEventListener('mouseup', this._boundMouseUp);
        this.canvas.addEventListener('mouseout', this._boundMouseOut); // Treat mouse out as mouse up

        // Touch Events (mapping to pointer events)
        this.canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this._boundTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this._boundTouchCancel, { passive: false });
        this.canvas.addEventListener('wheel', this._boundWheel, { passive: false });
        this.canvas.addEventListener('contextmenu', this._boundContextMenu);
        window.addEventListener('keydown', this._boundKeyDown);
        window.addEventListener('keyup', this._boundKeyUp);

        this._listenersAttached = true;

        // Keyboard shortcuts (delegated from main keyboard module or app.js)
        // We might add specific canvas shortcuts here if needed (e.g., holding shift for straight lines)
    }

    teardownEventListeners() {
        if (!this.canvas || !this._listenersAttached) return;

        this.canvas.removeEventListener('mousedown', this._boundMouseDown);
        this.canvas.removeEventListener('mousemove', this._boundMouseMove);
        this.canvas.removeEventListener('mouseup', this._boundMouseUp);
        this.canvas.removeEventListener('mouseout', this._boundMouseOut);
        this.canvas.removeEventListener('touchstart', this._boundTouchStart);
        this.canvas.removeEventListener('touchmove', this._boundTouchMove);
        this.canvas.removeEventListener('touchend', this._boundTouchEnd);
        this.canvas.removeEventListener('touchcancel', this._boundTouchCancel);
        this.canvas.removeEventListener('wheel', this._boundWheel);
        this.canvas.removeEventListener('contextmenu', this._boundContextMenu);
        window.removeEventListener('keydown', this._boundKeyDown);
        window.removeEventListener('keyup', this._boundKeyUp);

        this._listenersAttached = false;
    }

    handlePointerDown(e) {
        try {
        const isPanGesture = (e.button === 1 || e.button === 2 || this.spacePressed);
        if (isPanGesture) {
            this.isPanning = true;
            this.lastPanClientX = e.clientX;
            this.lastPanClientY = e.clientY;
            return;
        }

        const currentTool = window.canvasUI?.currentTool || 'pen';
        const activeLayer = this.getActiveLayer();
        const isDrawingTool = !['select', 'eyedropper'].includes(currentTool);
        if (isDrawingTool && activeLayer) {
            if (!activeLayer.visible) {
                this.warnLayerBlocked('Selected layer is hidden. Enable visibility to draw.');
                return;
            }
            if (activeLayer.locked) {
                this.warnLayerBlocked('Selected layer is locked. Unlock the layer to edit.');
                return;
            }
        }

        this.isDrawing = true;
        const pos = this.getPointerPos(e);
        this.ensureCanvasBounds(pos.x, pos.y);
        this.startX = pos.x;
        this.startY = pos.y;
        this.currentX = pos.x;
        this.currentY = pos.y;

        // Delegate the start action to the current tool handler
        const toolSettings = window.canvasUI?.getToolSettings();
this.toolHandler?.startDrawing(this.getActiveLayerContext(), pos, toolSettings);

        // Specific handling for select tool needs to be here as it modifies core state
         if (currentTool === 'select') {
             this.startSelectionOrTransform(pos.x, pos.y);
         }
        } catch (error) {
            this.handleRuntimeError(error, 'Pointer down');
        }
    }

    warnLayerBlocked(message) {
        const now = Date.now();
        if (now - this.lastLayerWarningAt < 900) return;
        this.lastLayerWarningAt = now;
        this.app.showToast(message, 'warning', 1800);
    }

    handlePointerMove(e) {
        try {
        if (this.isPanning) {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.panX += (e.clientX - this.lastPanClientX) * scaleX;
            this.panY += (e.clientY - this.lastPanClientY) * scaleY;
            this.lastPanClientX = e.clientX;
            this.lastPanClientY = e.clientY;
            this.renderLayers();
            return;
        }

        if (!this.isDrawing) return;

        const pos = this.getPointerPos(e);
        this.ensureCanvasBounds(pos.x, pos.y);
        const prevX = this.currentX; // Store previous position for some tools
        const prevY = this.currentY;
        this.currentX = pos.x;
        this.currentY = pos.y;
const currentTool = window.canvasUI?.currentTool || 'pen';
const toolSettings = window.canvasUI?.getToolSettings(); // <-- ADD THIS

// Handle select tool's move/resize directly
 if (currentTool === 'select' && (this.selectedImage || this.transformHandle)) {
     this.transformImage(pos.x, pos.y);
 } else {
     // Delegate drawing action to the tool handler
     this.toolHandler?.draw(this.getActiveLayerContext(), this.ctx, pos, { startX: this.startX, startY: this.startY, prevX, prevY }, toolSettings); // <-- PASS SETTINGS HERE
     if (['pen', 'brush', 'calligraphy', 'eraser', 'spray'].includes(currentTool)) {
         this.renderLayers();
     }
 }

        // For shape tools, renderLayers + drawPreview happens in toolHandler.draw
        // For brush tools, renderLayers happens after toolHandler.draw finishes drawing on layerCtx
        } catch (error) {
            this.handleRuntimeError(error, 'Pointer move');
        }
    }

    handlePointerUp(e) {
        try {
        if (this.isPanning) {
            this.isPanning = false;
            return;
        }

        if (!this.isDrawing) return;
        this.isDrawing = false;
        const pos = this.getPointerPos(e); // Get final position
        this.ensureCanvasBounds(pos.x, pos.y);

        // Delegate the stop action to the tool handler
        const layerCtx = this.getActiveLayerContext();
        const toolSettings = window.canvasUI?.getToolSettings();
this.toolHandler?.stopDrawing(layerCtx, pos, { startX: this.startX, startY: this.startY }, toolSettings);

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
        } catch (error) {
            this.handleRuntimeError(error, 'Pointer up');
        }
    }

    handleRuntimeError(error, context = 'Canvas') {
        console.error(`[${context}]`, error);
        const now = Date.now();
        if (now - this.lastRuntimeErrorAt > 1200) {
            this.lastRuntimeErrorAt = now;
            this.app.showToast(`Canvas error: ${error.message || 'Unknown issue'}`, 'error', 2200);
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
        const screenX = (clientX - rect.left) * scaleX;
        const screenY = (clientY - rect.top) * scaleY;

        // Convert from screen space to canvas world coordinates.
        const x = (screenX - this.panX) / this.zoom;
        const y = (screenY - this.panY) / this.zoom;

         // Snap to grid needs to happen in the tool drawing logic based on UI state
         // if (window.canvasUI?.snapToGrid && window.canvasUI?.gridEnabled) {
         //   const gridSize = 20; // Or get from UI module
         //   x = Math.round(x / gridSize) * gridSize;
         //   y = Math.round(y / gridSize) * gridSize;
         // }

        return { x, y };
    }

    handleWheel(e) {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const screenX = (e.clientX - rect.left) * scaleX;
        const screenY = (e.clientY - rect.top) * scaleY;
        const worldX = (screenX - this.panX) / this.zoom;
        const worldY = (screenY - this.panY) / this.zoom;

        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const nextZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        if (nextZoom === this.zoom) return;

        this.zoom = nextZoom;
        this.panX = screenX - (worldX * this.zoom);
        this.panY = screenY - (worldY * this.zoom);
        this.renderLayers();
    }

    ensureCanvasBounds(x, y) {
        const nearRight = x > this.canvas.width - this.autoExpandPadding;
        const nearBottom = y > this.canvas.height - this.autoExpandPadding;
        if (!nearRight && !nearBottom) return;

        const targetWidth = nearRight
            ? Math.max(this.canvas.width + this.autoExpandStep, Math.ceil((x + this.autoExpandPadding) / this.autoExpandStep) * this.autoExpandStep)
            : this.canvas.width;
        const targetHeight = nearBottom
            ? Math.max(this.canvas.height + this.autoExpandStep, Math.ceil((y + this.autoExpandPadding) / this.autoExpandStep) * this.autoExpandStep)
            : this.canvas.height;

        this.resizeCanvasSurfaces(targetWidth, targetHeight);
    }

    resizeCanvasSurfaces(newWidth, newHeight) {
        if (!this.canvas || (newWidth <= this.canvas.width && newHeight <= this.canvas.height)) return;

        const oldWidth = this.canvas.width;
        const oldHeight = this.canvas.height;
        this.canvas.width = Math.max(newWidth, oldWidth);
        this.canvas.height = Math.max(newHeight, oldHeight);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.layers = this.layers.map(layer => {
            const resizedCanvas = document.createElement('canvas');
            resizedCanvas.width = this.canvas.width;
            resizedCanvas.height = this.canvas.height;
            const resizedCtx = resizedCanvas.getContext('2d');
            if (!resizedCtx) return layer;

            resizedCtx.lineCap = 'round';
            resizedCtx.lineJoin = 'round';
            if (layer.id === 0 || layer.name === 'Background') {
                resizedCtx.fillStyle = '#ffffff';
                resizedCtx.fillRect(0, 0, resizedCanvas.width, resizedCanvas.height);
            }
            resizedCtx.drawImage(layer.canvas, 0, 0);

            return {
                ...layer,
                canvas: resizedCanvas,
                ctx: resizedCtx
            };
        });

        this.renderLayers();
        window.canvasUI?.updateLayersList(this.layers, this.currentLayer);
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
            locked: false,
            opacity: 1,
            parallax: 1,
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
        this.ctx.save();
        this.ctx.setTransform(this.zoom, 0, 0, this.zoom, this.panX, this.panY);

        this.layers.forEach(layer => {
            if (layer.visible) {
                this.ctx.save();
                this.ctx.globalAlpha = layer.opacity;
                const parallax = Number.isFinite(layer.parallax) ? layer.parallax : 1;
                const layerOffsetX = (this.panX * (parallax - 1)) / this.zoom;
                const layerOffsetY = (this.panY * (parallax - 1)) / this.zoom;
                // Draw the layer's base content (drawn lines, shapes etc.)
                this.ctx.drawImage(layer.canvas, layerOffsetX, layerOffsetY);
                // Draw any active image objects currently associated with this layer
                this.images.filter(img => img.layerId === layer.id).forEach(img => {
                     this.drawImageWithTransform(this.ctx, img, layerOffsetX, layerOffsetY);
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
        this.ctx.restore();
     }

      // Helper to draw image, potentially adding rotation/scale later
      drawImageWithTransform(targetCtx, imageInfo, offsetX = 0, offsetY = 0) {
          // Basic draw for now
           targetCtx.drawImage(imageInfo.element, imageInfo.x + offsetX, imageInfo.y + offsetY, imageInfo.width, imageInfo.height);
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

    setLayerLock(layerId, isLocked) {
        const layer = this.layers.find(l => l.id === layerId);
        if (!layer || layer.name === 'Background') return;
        layer.locked = Boolean(isLocked);
        this.renderLayers();
        this.saveState();
        window.canvasUI?.updateLayersList(this.layers, this.currentLayer);
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

    setLayerParallax(layerId, parallax) {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
            layer.parallax = Math.max(0.3, Math.min(2, parseFloat(parallax)));
            this.renderLayers();
            window.canvasUI?.updateLayersList(this.layers, this.currentLayer);
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

    async deleteLayer(layerId) {
        // Prevent deleting the background layer
        const layerToDelete = this.layers.find(l => l.id === layerId);
        if (!layerToDelete || layerToDelete.name === 'Background' || this.layers.length <= 1) {
            this.app.showToast("Cannot delete the background layer.", "warning");
            return false;
        }

        const confirmed = await (this.app.confirmDialog?.(
            `Delete layer "${layerToDelete.name}"? This action cannot be undone.`,
            { title: 'Delete Layer', confirmText: 'Delete Layer', variant: 'danger' }
        ) ?? Promise.resolve(confirm(`Are you sure you want to delete layer "${layerToDelete.name}"?`)));

        if (confirmed) {
            const deletedIndex = this.layers.findIndex(l => l.id === layerId);
            this.layers = this.layers.filter(l => l.id !== layerId);
             // Also delete images associated with this layer
             this.images = this.images.filter(img => img.layerId !== layerId);

            // If the deleted layer was the current layer, switch to the one below or background
            if (this.currentLayer === layerId) {
                 const fallbackIndex = Math.max(0, deletedIndex - 1);
                 this.currentLayer = this.layers[fallbackIndex]?.id ?? this.layers[0]?.id ?? 0;
            }

            this.renderLayers();
            this.saveState(); // Deletion is undoable
            window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI
            this.app.showToast("Layer deleted.", "success");
            return true; // Indicate success for UI update
        }
        return false; // Indicate cancellation
    }

    moveLayerUp(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index < 1 || index >= this.layers.length - 1) return false;

        [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
        this.currentLayer = layerId;
        this.renderLayers();
        this.saveState();
        window.canvasUI?.updateLayersList(this.layers, this.currentLayer);
        return true;
    }

    moveLayerDown(layerId) {
        const index = this.layers.findIndex(l => l.id === layerId);
        if (index <= 1) return false; // Keep background at bottom

        [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
        this.currentLayer = layerId;
        this.renderLayers();
        this.saveState();
        window.canvasUI?.updateLayersList(this.layers, this.currentLayer);
        return true;
    }


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
                locked: Boolean(layer.locked),
                opacity: layer.opacity,
                parallax: Number.isFinite(layer.parallax) ? layer.parallax : 1,
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
        // Keep history saving silent during normal use to avoid console spam.
         window.canvasUI?.updateUndoRedoButtons(this.canUndo(), this.canRedo()); // Update UI buttons
    }

    restoreState(stateToRestore) {
        if (!stateToRestore) return;

        // Restore runs often; avoid noisy debug output in production usage.
        this.layers = []; // Clear current layers
        this.images = []; // Clear current images

        const promises = stateToRestore.layers.map((layerState, orderIndex) => {
            return new Promise((resolve) => {
                const newLayer = this.createLayerObject(layerState.id, layerState.name);
                newLayer.visible = layerState.visible;
                newLayer.locked = Boolean(layerState.locked);
                newLayer.opacity = layerState.opacity;
                newLayer.parallax = Number.isFinite(layerState.parallax) ? layerState.parallax : 1;

                const img = new Image();
                img.onload = () => {
                    newLayer.ctx.clearRect(0, 0, newLayer.canvas.width, newLayer.canvas.height); // Clear before drawing
                    newLayer.ctx.drawImage(img, 0, 0);
                    resolve({ newLayer, orderIndex });
                };
                 img.onerror = () => {
                     console.error("Failed to load layer image data from history.");
                     // Add an empty layer anyway to maintain structure
                     resolve({ newLayer, orderIndex });
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


        Promise.all(promises).then((resolvedLayers) => {
            resolvedLayers.sort((a, b) => a.orderIndex - b.orderIndex);
            this.layers = resolvedLayers.map(entry => entry.newLayer);
            this.currentLayer = stateToRestore.currentLayer;
            this.renderLayers();
            window.canvasUI?.updateLayersList(this.layers, this.currentLayer); // Update UI
             window.canvasUI?.updateUndoRedoButtons(this.canUndo(), this.canRedo());
            // Restore completed.
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
        Promise.resolve(this.app.confirmDialog?.(
            'Clear the entire canvas and all layers? This cannot be undone.',
            { title: 'Clear Canvas', confirmText: 'Clear Canvas', variant: 'danger' }
        ) ?? confirm('Are you sure you want to clear the entire canvas (all layers)?')).then((confirmed) => {
            if (!confirmed) return;
            this.initializeLayers(); // Re-initialize to reset everything
            this.saveState(); // Save the cleared state
            this.app.showToast('Canvas cleared', 'success');
        });
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

    destroy() {
        this.teardownEventListeners();
        this.isDrawing = false;
        this.isPanning = false;
        this.spacePressed = false;
        this.selectedImage = null;
        this.transformHandle = null;
        this.canvas = null;
        this.ctx = null;
        this.wrapper = null;
    }

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
