// Canvas Drawing Module for Shiro Notes
class CanvasModule {
  constructor(app) {
    this.app = app;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.tool = 'pen';
    this.color = '#000000';
    this.size = 5;
    this.opacity = 1;
    this.fillEnabled = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.history = [];
    this.historyStep = -1;
    this.layers = [];
    this.currentLayer = 0;
    this.gridEnabled = false;
    this.snapToGrid = false;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.shapes = [];
    this.selectedShape = null;
    this.images = [];
    this.selectedImage = null;
    this.transformHandle = null;
  }
  
// --- In canvas.js, REPLACE the functions initCanvas, setupCanvas, AND setupToolListeners with this block ---

initCanvas() {
    this.canvas = document.getElementById('drawingCanvas');
    if (!this.canvas) {
        console.error("Canvas element not found!");
        return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas(); // This will now set up the canvas AND the tool listeners
    this.setupEventListeners();
    
    // Only initialize layers and history if they haven't been set up yet
    if (this.history.length === 0) {
        this.initializeLayers();
        this.saveState();
    } else {
        // If coming back to the page, just redraw what was there
        this.renderLayers();
    }
}

setupCanvas() {
    // Set a large, fixed canvas size to enable scrolling.
    this.canvas.width = 1920;
    this.canvas.height = 3000;

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // This redraws from history if necessary (e.g., after a page refresh if state was saved)
    if (this.history.length > 0 && this.historyStep >= 0) {
        this.restoreState(this.history[this.historyStep]);
    }

    // Call the tool listener setup from here to ensure the DOM is ready
    this.setupToolListeners();
}

setupToolListeners() {
    // Tool selection buttons (Pen, Brush, Eraser, etc.)
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            const newTool = btn.getAttribute('data-tool');
            this.selectTool(newTool);

            // Update the main dropdown button icon to show the selected tool
            const dropdown = btn.closest('.tool-dropdown');
            if (dropdown) {
                const mainBtn = dropdown.querySelector('button');
                // The split(' ')[0] part is a clever way to grab just the icon
                mainBtn.innerHTML = btn.innerHTML.split(' ')[0]; 
            }
        });
    });

    // Filter buttons (Grayscale, Invert, etc.)
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => this.applyFilter(btn.dataset.filter));
    });

    // Connect the color, size, opacity, and fill controls
    document.getElementById('canvasColor').oninput = e => this.color = e.target.value;
    document.getElementById('canvasSize').oninput = e => {
        this.size = parseInt(e.target.value);
        this.updateCursor();
    };
    document.getElementById('canvasOpacity').oninput = e => this.opacity = parseFloat(e.target.value);
    document.getElementById('fillShapeToggle').onchange = e => this.fillEnabled = e.target.checked;
    
    // Ensure the active tool is correctly set on load
    this.selectTool('pen');
}




  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseout', () => this.stopDrawing());
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const mouseEvent = new MouseEvent('mouseup', {});
      this.canvas.dispatchEvent(mouseEvent);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.canvas || this.app.isLocked) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            this.undo();
            break;
          case 'y':
            e.preventDefault();
            this.redo();
            break;
          case 's':
            e.preventDefault();
            this.saveCanvas();
            break;
        }
      }
      
      // Tool shortcuts
      switch (e.key) {
        case 'p':
          this.selectTool('pen');
          break;
        case 'b':
          this.selectTool('brush');
          break;
        case 'e':
          this.selectTool('eraser');
          break;
        case 'l':
          this.selectTool('line');
          break;
        case 'r':
          this.selectTool('rectangle');
          break;
        case 'c':
          this.selectTool('circle');
          break;
        case 'g':
          this.toggleGrid();
          break;
      }
    }); 
  }

  selectTool(toolName) {
    this.tool = toolName;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tool') === toolName);
    });
    this.updateCursor();
  }

  updateCursor() {
    if (!this.canvas) return;
    
    switch (this.tool) {
      case 'pen':
      case 'brush':
        this.canvas.style.cursor = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${this.size + 8}" height="${this.size + 8}"><circle cx="${(this.size + 8)/2}" cy="${(this.size + 8)/2}" r="${this.size/2}" fill="${this.color}" stroke="black" stroke-width="1"/></svg>') ${(this.size + 8)/2} ${(this.size + 8)/2}, crosshair`;
        break;
      case 'eraser':
        this.canvas.style.cursor = 'url("data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect x="2" y="2" width="20" height="20" fill="white" stroke="black" stroke-width="2"/></svg>") 12 12, auto';
        break;
      case 'text':
        this.canvas.style.cursor = 'text';
        break;
      default:
        this.canvas.style.cursor = 'crosshair';
    }
  }

  initializeLayers() {
    this.layers = [
      {
        id: 0,
        name: 'Background',
        visible: true,
        opacity: 1,
        canvas: document.createElement('canvas'),
        ctx: null
      }
    ];
    
    this.layers[0].canvas.width = this.canvas.width;
    this.layers[0].canvas.height = this.canvas.height;
    this.layers[0].ctx = this.layers[0].canvas.getContext('2d');
    
    // Fill background with white
    this.layers[0].ctx.fillStyle = '#ffffff';
    this.layers[0].ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.addLayer('Drawing');
  }

  addLayer(name = `Layer ${this.layers.length}`) {
    const layer = {
      id: this.layers.length,
      name,
      visible: true,
      opacity: 1,
      canvas: document.createElement('canvas'),
      ctx: null
    };
    
    layer.canvas.width = this.canvas.width;
    layer.canvas.height = this.canvas.height;
    layer.ctx = layer.canvas.getContext('2d');
    layer.ctx.lineCap = 'round';
    layer.ctx.lineJoin = 'round';
    
    this.layers.push(layer);
    this.currentLayer = layer.id;
    this.renderLayers();
  }

  // --- In canvas.js, REPLACE your renderLayers function ---
renderLayers() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.layers.forEach(layer => {
        if (layer.visible) {
            this.ctx.save();
            this.ctx.globalAlpha = layer.opacity;
            // Draw the layer's base content
            this.ctx.drawImage(layer.canvas, 0, 0);
            // Draw any images assigned to this layer on top
            this.images.filter(img => img.layerId === layer.id).forEach(img => {
                this.ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
            });
            this.ctx.restore();
        }
    });

    if (this.gridEnabled) this.drawGrid();
    if (this.tool === 'select') this.drawSelectionHandles(this.selectedImage);
}

  drawGrid() {
    const gridSize = 20;
    this.ctx.save();
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.5;
    
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  toggleGrid() {
    this.gridEnabled = !this.gridEnabled;
    this.renderLayers();
    this.app.showToast(`Grid ${this.gridEnabled ? 'enabled' : 'disabled'}`, 'info');
  }

  // --- In canvas.js, REPLACE your getMousePos function with this ---
getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();

    // This correctly handles both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // This is the crucial part. It calculates a scale factor.
    // This handles cases where the canvas's display size (rect.width) is different
    // from its internal resolution (this.canvas.width).
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    // Calculate the final, correct mouse position on the large canvas
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;

    // The rest of your function logic remains for future features
    // Apply zoom and pan
    x = (x - this.panX) / this.zoom;
    y = (y - this.panY) / this.zoom;
    
    // Snap to grid if enabled
    if (this.snapToGrid && this.gridEnabled) {
      const gridSize = 20;
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
    
    return { x, y };
}


// --- In canvas.js, REPLACE your startDrawing function with this ---
startDrawing(e) {
    // This check is now at the top, so it runs for ALL tools
    if (this.tool === 'eyedropper') {
        const pos = this.getMousePos(e);
        this.pickColor(pos.x, pos.y);
        this.isDrawing = false; // Eyedropper is a one-click tool
        return;
    }

    this.isDrawing = true;
    const pos = this.getMousePos(e);
    this.startX = pos.x;
    this.startY = pos.y;
    this.currentX = pos.x;
    this.currentY = pos.y;

    const ctx = this.layers[this.currentLayer].ctx;
    ctx.globalAlpha = this.opacity;

    // This block now correctly prepares the canvas for ALL brush-like tools
    switch (this.tool) {
        case 'pen':
        case 'brush':
        case 'calligraphy':
        case 'spray':
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.globalCompositeOperation = 'source-over';
            break;
        case 'eraser':
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineWidth = this.size * 2; // Eraser can have a different size logic if needed
            ctx.globalCompositeOperation = 'destination-out';
            break;
        case 'text':
            this.addText(pos.x, pos.y);
            break;
        case 'select':
            this.startSelection(pos.x, pos.y);
            break;
    }
}

draw(e) {
    if (!this.isDrawing) return;

    const pos = this.getMousePos(e);
  if (this.tool === 'select'){
    this.transformImage(pos.x, pos.y);
    return;
  }
    this.currentX = pos.x;
    this.currentY = pos.y;

    // Get the context for the specific layer we are drawing on
    const layerCtx = this.layers[this.currentLayer].ctx;

    // Check if the current tool is a brush-type tool
    const isBrushTool = ['pen', 'brush', 'calligraphy', 'spray', 'eraser'].includes(this.tool);

    if (isBrushTool) {
        // --- LIVE DRAWING FOR BRUSHES ---
        // For tools that draw permanently as you move:
        const brushDrawer = this['draw' + this.tool.charAt(0).toUpperCase() + this.tool.slice(1)];
        if (brushDrawer) {
            brushDrawer(layerCtx, pos);
        }
        // CRITICAL FIX: After drawing on the layer, immediately update the visible canvas.
        this.renderLayers();
    } else {
        // --- LIVE PREVIEWS FOR SHAPES ---
        // For tools that only draw the final shape on mouse release:

        // Step 1: Quickly redraw all committed layers. This erases the previous preview frame.
        this.renderLayers();

        // Step 2: Draw the new temporary shape directly on the visible canvas for a fast preview.
        const previewCtx = this.ctx; // Use the main visible context
        previewCtx.save();
        previewCtx.strokeStyle = this.color;
        previewCtx.lineWidth = this.size;
        previewCtx.fillStyle = this.color;
        previewCtx.globalAlpha = 0.7; // Make the preview slightly transparent

        // This finds the correct drawing function for the shape (e.g., 'drawRectangle')
        const shapeDrawer = this['draw' + this.tool.charAt(0).toUpperCase() + this.tool.slice(1)];
        if (shapeDrawer) {
            // Draw the preview on the visible canvas
            shapeDrawer(previewCtx, this.startX, this.startY, this.currentX, this.currentY);
        }
        previewCtx.restore();
    }
}






  // --- In canvas.js, REPLACE your five brush functions with this corrected block ---

drawPen(ctx, pos) {
    // Continues the path started in startDrawing() to create a smooth line
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

drawBrush(ctx, pos) {
    // Uses the same smooth line logic as the pen
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

drawEraser(ctx, pos) {
    // The eraser also needs to draw a continuous path to erase smoothly
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

drawCalligraphy(ctx, pos) {
    // Creates a variable line width without breaking the continuous path
    ctx.lineWidth = this.size / 2 + Math.random() * (this.size / 2);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

drawSpray(ctx, pos) {
    // The spray effect works by drawing many small dots instead of a line
    const density = 40;
    ctx.fillStyle = this.color;
    for (let i = 0; i < density; i++) {
        const radius = this.size;
        const offsetX = (Math.random() - 0.5) * radius * 2;
        const offsetY = (Math.random() - 0.5) * radius * 2;
        if (Math.sqrt(offsetX * offsetX + offsetY * offsetY) <= radius) {
            ctx.fillRect(pos.x + offsetX, pos.y + offsetY, 1, 1);
        }
    }
}


// New Color and Filter Tools
pickColor(x, y) {
    // This reads the color of a single pixel where you clicked
    const pixelData = this.ctx.getImageData(x, y, 1, 1).data;
    const hexColor = this.rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
    
    // Update our app's color
    this.color = hexColor;
    document.getElementById('canvasColor').value = hexColor; // Update the color input visually
    this.app.showToast(`Color picked: ${hexColor}`, 'info');
}

applyFilter(filterName) {
    const ctx = this.layers[this.currentLayer].ctx;
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // This loops through every pixel on the layer and changes its color based on the filter
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        switch (filterName) {
            case 'grayscale':
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = data[i + 1] = data[i + 2] = gray;
                break;
            case 'invert':
                data[i] = 255 - r; data[i + 1] = 255 - g; data[i + 2] = 255 - b;
                break;
            case 'sepia':
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
                break;
        }
    }
    
    if (filterName === 'blur') {
        this.app.showToast('Blur filter is a complex feature for a future update!', 'info');
    }

    ctx.putImageData(imageData, 0, 0); // Put the modified pixel data back onto the canvas
    this.renderLayers(); // Re-render to show the change
    this.saveState(); // Save this change to the undo/redo history
    this.app.showToast(`${filterName} filter applied`, 'success');
}

// Helper function to convert RGB color to HEX format for the color input
rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

  
  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.transformHandle = null;
    if (this.tool === 'select' && this.selectedImage) {
      this.redrawImagesOnLayer(this.currentLayer);
      this.saveState();
      return;
    }
    const ctx = this.layers[this.currentLayer].ctx;
    
    // Finalize shape drawing
    switch (this.tool) {
      case 'line':
      case 'rectangle':
      case 'circle':
      case 'arrow':
      case 'polygon':
      case 'star':
      case 'heart':
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.globalCompositeOperation = 'source-over';
        
        switch (this.tool) {
          case 'line':
            this.drawLine(ctx, this.startX, this.startY, this.currentX, this.currentY);
            break;
          case 'rectangle':
            this.drawRectangle(ctx, this.startX, this.startY, this.currentX, this.currentY);
            break;
          case 'circle':
            this.drawCircle(ctx, this.startX, this.startY, this.currentX, this.currentY);
            break;
          case 'arrow':
            this.drawArrow(ctx, this.startX, this.startY, this.currentX, this.currentY);
            break;
          case 'polygon':
            this.drawPolygon(ctx, this.startX, this.startY, this.currentX, this.currentY, 6);
            break;
          case 'star':
            this.drawStar(ctx, this.startX, this.startY, this.currentX, this.currentY, 5);
            break;
          case 'heart':
            this.drawHeart(ctx, this.startX, this.startY, this.currentX, this.currentY);
            break;
        }
        
        ctx.restore();
        break;
    }
    
    this.renderLayers();
    this.saveState();
  }

  // Shape drawing methods
  drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  drawRectangle(ctx, x1, y1, x2, y2) {
    const width = x2 - x1;
    const height = y2 - y1;
    
    ctx.beginPath();
    ctx.rect(x1, y1, width, height);
    ctx.stroke();
    
    // Fill if enabled
    if (this.fillEnabled) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawCircle(ctx, x1, y1, x2, y2) {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    ctx.beginPath();
    ctx.arc(x1, y1, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    if (this.fillEnabled) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawArrow(ctx, x1, y1, x2, y2) {
    const headlen = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  drawPolygon(ctx, x1, y1, x2, y2, sides) {
    const centerX = x1;
    const centerY = y1;
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    
    if (this.fillEnabled) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawStar(ctx, x1, y1, x2, y2, points) {
    const centerX = x1;
    const centerY = y1;
    const outerRadius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const innerRadius = outerRadius * 0.4;
    
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    
    if (this.fillEnabled) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawHeart(ctx, x1, y1, x2, y2) {
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + height * 0.3);
    
    // Left curve
    ctx.bezierCurveTo(
      centerX - width * 0.3, centerY - height * 0.2,
      centerX - width * 0.3, centerY - height * 0.5,
      centerX, centerY - height * 0.2
    );
    
    // Right curve
    ctx.bezierCurveTo(
      centerX + width * 0.3, centerY - height * 0.5,
      centerX + width * 0.3, centerY - height * 0.2,
      centerX, centerY + height * 0.3
    );
    
    ctx.stroke();
    
    if (this.fillEnabled) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
// --- In canvas.js, add these FOUR new functions inside the CanvasModule class ---

startSelection(x, y) {
    // Check if clicking on a resize handle of the selected image
    if (this.selectedImage) {
        const handle = this.getHandleAt(x, y);
        if (handle) {
            this.transformHandle = handle;
            this.isDrawing = true; // Start "drawing" mode for resizing
            return;
        }
    }

    // Find the topmost image at the click position
    this.selectedImage = null;
    for (let i = this.images.length - 1; i >= 0; i--) {
        const img = this.images[i];
        if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
            this.selectedImage = img;
            this.isDrawing = true; // Start "drawing" mode for moving
            this.startX = x - img.x; // Store offset for smooth dragging
            this.startY = y - img.y;
            break;
        }
    }
    this.renderLayers(); // Redraw to show selection handles on the newly selected image
}

transformImage(x, y) {
    if (!this.selectedImage || !this.isDrawing) return;

    if (this.transformHandle) {
        // --- RESIZING LOGIC ---
        const img = this.selectedImage;
        const oldX = img.x;
        const oldY = img.y;

        switch (this.transformHandle) {
            case 'bottom-right':
                img.width = x - oldX;
                img.height = y - oldY;
                break;
            case 'bottom-left':
                img.width = oldX + img.width - x;
                img.height = y - oldY;
                img.x = x;
                break;
            case 'top-right':
                img.width = x - oldX;
                img.height = oldY + img.height - y;
                img.y = y;
                break;
            case 'top-left':
                img.width = oldX + img.width - x;
                img.height = oldY + img.height - y;
                img.x = x;
                img.y = y;
                break;
        }
        // Ensure width/height are not negative
        if (img.width < 10) img.width = 10;
        if (img.height < 10) img.height = 10;

    } else {
        // --- MOVING LOGIC ---
        this.selectedImage.x = x - this.startX;
        this.selectedImage.y = y - this.startY;
    }

    this.renderLayers(); // Redraw with the image in its new position/size
}


drawSelectionHandles(image) {
    if (!image) return;
    const ctx = this.ctx; // Draw handles on the main visible canvas
    ctx.save();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line for selection box

    // Draw the main selection box
    ctx.strokeRect(image.x, image.y, image.width, image.height);

    // Draw resize handles
    ctx.setLineDash([]);
    ctx.fillStyle = 'white';
    const handleSize = 8;
    const halfHandle = handleSize / 2;
    const handles = {
        'top-left': [image.x, image.y],
        'top-right': [image.x + image.width, image.y],
        'bottom-left': [image.x, image.y + image.height],
        'bottom-right': [image.x + image.width, image.y + image.height],
    };

    for (const pos of Object.values(handles)) {
        ctx.fillRect(pos[0] - halfHandle, pos[1] - halfHandle, handleSize, handleSize);
        ctx.strokeRect(pos[0] - halfHandle, pos[1] - halfHandle, handleSize, handleSize);
    }
    ctx.restore();
}

getHandleAt(x, y) {
    if (!this.selectedImage) return null;
    const image = this.selectedImage;
    const handleSize = 10; // Larger hit area for handles
    
    const handles = {
      'top-left': { x: image.x, y: image.y },
      'top-right': { x: image.x + image.width, y: image.y },
      'bottom-left': { x: image.x, y: image.y + image.height },
      'bottom-right': { x: image.x + image.width, y: image.y + image.height }
    };

    for (const [name, pos] of Object.entries(handles)) {
      if (Math.abs(x - pos.x) < handleSize && Math.abs(y - pos.y) < handleSize) {
        return name;
      }
    }
    return null;
}

  // Text tool
  addText(x, y) {
    const text = prompt('Enter text:');
    if (!text) return;
    
    const ctx = this.layers[this.currentLayer].ctx;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.font = `${this.size * 8}px Arial`;
    ctx.fillText(text, x, y);
    ctx.restore();
    
    this.renderLayers();
    this.saveState();
  }

  // Selection tool
  startSelection(x, y) {
    // Find shape at position (simplified)
    this.selectedShape = this.findShapeAt(x, y);
    this.renderLayers();
  }

  findShapeAt(x, y) {
    // This would need to track shapes as objects
    // For now, return null (placeholder)
    return null;
  }

  drawSelectionHandles(shape) {
    // Draw selection handles around selected shape
    // Placeholder implementation
  }

  // History management
  saveState() {
    this.historyStep++;
    
    if (this.historyStep < this.history.length) {
      this.history.length = this.historyStep;
    }
    
    // Save current state of all layers
    const state = this.layers.map(layer => {
      const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
      return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        imageData: imageData
      };
    });
    
    this.history.push(state);
    
    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
      this.historyStep--;
    }
  }

  undo() {
    if (this.historyStep > 0) {
      this.historyStep--;
      this.restoreState(this.history[this.historyStep]);
      this.app.showToast('Undone', 'info');
    }
  }

  redo() {
    if (this.historyStep < this.history.length - 1) {
      this.historyStep++;
      this.restoreState(this.history[this.historyStep]);
      this.app.showToast('Redone', 'info');
    }
  }

  restoreState(state) {
    state.forEach((layerState, index) => {
      if (this.layers[index]) {
        this.layers[index].ctx.putImageData(layerState.imageData, 0, 0);
        this.layers[index].visible = layerState.visible;
        this.layers[index].opacity = layerState.opacity;
      }
    });
    
    this.renderLayers();
  }

  clear() {
    if (confirm('Are you sure you want to clear the canvas?')) {
      const ctx = this.layers[this.currentLayer].ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // If clearing background layer, fill with white
      if (this.currentLayer === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      
      this.renderLayers();
      this.saveState();
      this.app.showToast('Canvas cleared', 'success');
    }
  }

  // Zoom and pan
  zoomIn() {
    this.zoom = Math.min(this.zoom * 1.2, 5);
    this.applyTransform();
  }

  zoomOut() {
    this.zoom = Math.max(this.zoom / 1.2, 0.1);
    this.applyTransform();
  }

  resetZoom() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  applyTransform() {
    const container = this.canvas.parentElement;
    container.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  // Canvas management
  

  saveCanvas() {
    try {
      // Create a temporary canvas to combine all layers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw all visible layers
      this.layers.forEach(layer => {
        if (layer.visible) {
          tempCtx.save();
          tempCtx.globalAlpha = layer.opacity;
          tempCtx.drawImage(layer.canvas, 0, 0);
          tempCtx.restore();
        }
      });
      
      // Convert to blob and save
      tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `canvas_${new Date().toISOString().split('T')[0]}.png`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.app.showToast('Canvas saved successfully', 'success');
      }, 'image/png');
      
      // Also save to notes if desired
      this.saveToNotes(tempCanvas);
      
    } catch (error) {
      console.error('Error saving canvas:', error);
      this.app.showToast('Error saving canvas', 'error');
    }
  }

  saveToNotes(canvas) {
    const dataURL = canvas.toDataURL('image/png');
    
    const note = {
      id: this.app.generateId(),
      title: `Canvas Drawing - ${new Date().toLocaleDateString()}`,
      content: `<img src="${dataURL}" alt="Canvas Drawing" style="max-width: 100%; height: auto;">`,
      type: 'canvas',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      tags: ['canvas', 'drawing'],
      bookmarked: false,
      encrypted: false
    };
    
    this.app.data.notes.push(note);
    this.app.saveData();
    this.app.updateUI();
  }

loadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Add the image to our tracking array
          const newImage = {
              element: img,
              x: 20,
              y: 20,
              width: img.width / 2, // Start at half size
              height: img.height / 2,
              layerId: this.currentLayer
          };
          this.images.push(newImage);
          this.selectedImage = newImage; // Auto-select the new image
          this.selectTool('select'); // Switch to select tool automatically
          
          this.renderLayers();
          this.app.showToast('Image loaded. Use the select tool to move/resize.', 'success');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
}

  // --- In canvas.js, ADD this new function inside the CanvasModule class ---

redrawImagesOnLayer(layerId) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Find all images that are on the layer we are modifying
    const imagesOnThisLayer = this.images.filter(img => img.layerId === layerId);
    
    // Draw each image permanently onto the layer's canvas
    imagesOnThisLayer.forEach(img => {
        layer.ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
    });

    // VERY IMPORTANT: After drawing the images, we must remove them from the
    // 'this.images' array so they don't get drawn twice by the renderLayers() function.
    this.images = this.images.filter(img => img.layerId !== layerId);
    
    // Clear the selection
    this.selectedImage = null;
}

  

  // Add layers panel
  showLayersPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content layers-panel">
        <div class="modal-header">
          <h3>Layers</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="layers-list">
            ${this.layers.map(layer => `
              <div class="layer-item ${layer.id === this.currentLayer ? 'active' : ''}" onclick="canvasModule.selectLayer(${layer.id})">
                <div class="layer-preview">
                  <canvas width="40" height="30"></canvas>
                </div>
                <div class="layer-info">
                  <input type="text" value="${layer.name}" onchange="canvasModule.renameLayer(${layer.id}, this.value)">
                  <div class="layer-controls">
                    <label>
                      <input type="checkbox" ${layer.visible ? 'checked' : ''} onchange="canvasModule.toggleLayerVisibility(${layer.id}, this.checked)">
                      Visible
                    </label>
                    <input type="range" min="0" max="1" step="0.1" value="${layer.opacity}" onchange="canvasModule.setLayerOpacity(${layer.id}, this.value)">
                  </div>
                </div>
                <button class="layer-delete" onclick="canvasModule.deleteLayer(${layer.id})" ${layer.id === 0 ? 'disabled' : ''}>
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `).join('')}
          </div>
          <button class="btn btn--primary btn--full-width" onclick="canvasModule.addLayer(); this.closest('.modal-overlay').remove();">
            <i class="fas fa-plus"></i> Add Layer
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('visible'), 10);
    
    // Draw layer previews
    modal.querySelectorAll('.layer-item canvas').forEach((previewCanvas, index) => {
      const layer = this.layers[index];
      const previewCtx = previewCanvas.getContext('2d');
      previewCtx.drawImage(layer.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    });
  }

  selectLayer(layerId) {
    this.currentLayer = layerId;
    document.querySelectorAll('.layer-item').forEach((item, index) => {
      item.classList.toggle('active', this.layers[index].id === layerId);
    });
  }

  toggleLayerVisibility(layerId, visible) {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      layer.visible = visible;
      this.renderLayers();
    }
  }

  setLayerOpacity(layerId, opacity) {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      layer.opacity = parseFloat(opacity);
      this.renderLayers();
    }
  }

  renameLayer(layerId, name) {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      layer.name = name;
    }
  }

  deleteLayer(layerId) {
    if (layerId === 0) return; // Can't delete background layer
    
    if (confirm('Delete this layer?')) {
      this.layers = this.layers.filter(l => l.id !== layerId);
      if (this.currentLayer === layerId) {
        this.currentLayer = 0;
      }
      this.renderLayers();
    }
  }
}

// Initialize canvas module
const canvasModule = new CanvasModule(app);
window.canvasModule = canvasModule;

