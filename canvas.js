// Canvas Drawing Module for Shiro Notes
class CanvasModule {
  constructor(app) {
    this.app = app;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.tool = 'pen';
    this.color = '#000000';
    this.size = 2;
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
  }

  initCanvas() {
    this.canvas = document.getElementById('drawingCanvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.setupCanvas();
    this.setupEventListeners();
    this.initializeLayers();
    this.addMoreShapes();
    this.saveState();
  }

  setupCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Set canvas size
    this.canvas.width = rect.width - 20;
    this.canvas.height = rect.height - 20;
    
    // Set up canvas properties
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;
    
    // Fill with white background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Setup tool event listeners
    this.setupToolListeners();
  }

  setupToolListeners() {
    // Tool buttons
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.tool = btn.getAttribute('data-tool');
      });
    });

    // Color picker
    const colorPicker = document.getElementById('canvasColor');
    if (colorPicker) {
      colorPicker.addEventListener('change', (e) => {
        this.color = e.target.value;
      });
    }

    // Size slider
    const sizeSlider = document.getElementById('canvasSize');
    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        this.size = parseInt(e.target.value);
        this.updateCursor();
      });
    }
    const fillToggle = document.getElementById('fillShapeToggle');
    if (fillToggle) {
        this.fillEnabled = fillToggle.checked;
        fillToggle.addEventListener('change', (e) => {
            this.fillEnabled = e.target.checked;
        });
    }
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

    // Resize handler
    window.addEventListener('resize', () => {
      if (this.canvas) {
        this.resizeCanvas();
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

  renderLayers() {
    // Clear main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render all visible layers
    this.layers.forEach(layer => {
      if (layer.visible) {
        this.ctx.save();
        this.ctx.globalAlpha = layer.opacity;
        this.ctx.drawImage(layer.canvas, 0, 0);
        this.ctx.restore();
      }
    });
    
    // Draw grid if enabled
    if (this.gridEnabled) {
      this.drawGrid();
    }
    
    // Draw selection handles if shape is selected
    if (this.selectedShape) {
      this.drawSelectionHandles(this.selectedShape);
    }
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

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    
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

  startDrawing(e) {
    this.isDrawing = true;
    const pos = this.getMousePos(e);
    this.startX = pos.x;
    this.startY = pos.y;
    this.currentX = pos.x;
    this.currentY = pos.y;
    
    const ctx = this.layers[this.currentLayer].ctx;
    
    switch (this.tool) {
      case 'pen':
      case 'brush':
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.globalCompositeOperation = 'source-over';
        break;
        
      case 'eraser':
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineWidth = this.size * 2;
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
    this.currentX = pos.x;
    this.currentY = pos.y;
    
    const ctx = this.layers[this.currentLayer].ctx;
    
    switch (this.tool) {
      case 'pen':
        this.drawPen(ctx, pos);
        break;
        
      case 'brush':
        this.drawBrush(ctx, pos);
        break;
        
      case 'eraser':
        this.drawEraser(ctx, pos);
        break;
        
      case 'line':
      case 'rectangle':
      case 'circle':
      case 'arrow':
      case 'polygon':
      case 'star':
      case 'heart':
        this.drawPreview();
        break;
    }
    
    this.renderLayers();
  }

  drawPen(ctx, pos) {
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  drawBrush(ctx, pos) {
    // Create brush effect with multiple overlapping circles
    const density = 3;
    for (let i = 0; i < density; i++) {
      const offsetX = (Math.random() - 0.5) * this.size / 2;
      const offsetY = (Math.random() - 0.5) * this.size / 2;
      
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(pos.x + offsetX, pos.y + offsetY, this.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  drawEraser(ctx, pos) {
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  drawPreview() {
    // Redraw current layer without preview
    this.renderLayers();
    
    // Draw preview on main canvas
    this.ctx.save();
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.size;
    this.ctx.globalAlpha = 0.7;
    
    switch (this.tool) {
      case 'line':
        this.drawLine(this.ctx, this.startX, this.startY, this.currentX, this.currentY);
        break;
        
      case 'rectangle':
        this.drawRectangle(this.ctx, this.startX, this.startY, this.currentX, this.currentY);
        break;
        
      case 'circle':
        this.drawCircle(this.ctx, this.startX, this.startY, this.currentX, this.currentY);
        break;
        
      case 'arrow':
        this.drawArrow(this.ctx, this.startX, this.startY, this.currentX, this.currentY);
        break;
        
      case 'polygon':
        this.drawPolygon(this.ctx, this.startX, this.startY, this.currentX, this.currentY, 6);
        break;
        
      case 'star':
        this.drawStar(this.ctx, this.startX, this.startY, this.currentX, this.currentY, 5);
        break;
        
      case 'heart':
        this.drawHeart(this.ctx, this.startX, this.startY, this.currentX, this.currentY);
        break;
    }
    
    this.ctx.restore();
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
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
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Save current content
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Resize canvas
    this.canvas.width = rect.width - 20;
    this.canvas.height = rect.height - 20;
    
    // Restore content
    this.ctx.putImageData(imageData, 0, 0);
    
    // Resize all layers
    this.layers.forEach(layer => {
      const layerImageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
      layer.canvas.width = this.canvas.width;
      layer.canvas.height = this.canvas.height;
      layer.ctx = layer.canvas.getContext('2d');
      layer.ctx.putImageData(layerImageData, 0, 0);
    });
    
    this.renderLayers();
  }

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
          const ctx = this.layers[this.currentLayer].ctx;
          ctx.drawImage(img, 0, 0);
          this.renderLayers();
          this.saveState();
          this.app.showToast('Image loaded', 'success');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  }

  // Enhanced tools
  addMoreShapes() {
    const toolbar = document.querySelector('.canvas-toolbar .tool-group:nth-child(2)');
    if (!toolbar) return;
    
    const additionalShapes = [
      { tool: 'polygon', icon: 'fas fa-draw-polygon', title: 'Polygon' },
      { tool: 'star', icon: 'fas fa-star', title: 'Star' },
      { tool: 'heart', icon: 'fas fa-heart', title: 'Heart' },
      { tool: 'text', icon: 'fas fa-font', title: 'Text' }
    ];
    
    additionalShapes.forEach(shape => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.setAttribute('data-tool', shape.tool);
      btn.title = shape.title;
      btn.innerHTML = `<i class="${shape.icon}"></i>`;
      
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.tool = shape.tool;
        this.updateCursor();
      });
      
      toolbar.appendChild(btn);
    });
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

// Add canvas-specific styles
const canvasStyles = `
.canvas-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-background);
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  padding: var(--space-3);
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-card-border);
  flex-wrap: wrap;
  gap: var(--space-2);
}

.canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 20px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

#drawingCanvas {
  background-color: white;
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-lg);
  cursor: crosshair;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  border-right: 1px solid var(--color-border);
}

.tool-group:last-child {
  border-right: none;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border: none;
  background-color: var(--color-background);
  color: var(--color-text);
  border-radius: var(--radius-base);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  background-color: var(--color-secondary);
}

.tool-btn.active {
  background-color: var(--color-primary);
  color: white;
}

#canvasColor {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-base);
  cursor: pointer;
}

#canvasSize {
  width: 80px;
}

/* Layers Panel */
.layers-panel {
  max-width: 400px;
}

.layers-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: var(--space-4);
}

.layer-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  margin-bottom: var(--space-2);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.layer-item:hover {
  background-color: var(--color-secondary);
}

.layer-item.active {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-teal-500-rgb), 0.1);
}

.layer-preview {
  width: 40px;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: white;
}

.layer-preview canvas {
  width: 100%;
  height: 100%;
}

.layer-info {
  flex: 1;
}

.layer-info input[type="text"] {
  width: 100%;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-background);
  color: var(--color-text);
  margin-bottom: var(--space-2);
}

.layer-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.layer-controls label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.layer-controls input[type="range"] {
  width: 60px;
}

.layer-delete {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.layer-delete:hover {
  background-color: rgba(var(--color-red-500-rgb, 239, 68, 68), 0.1);
}

.layer-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .canvas-toolbar {
    padding: var(--space-2);
  }
  
  .tool-group {
    flex-wrap: wrap;
  }
  
  .tool-btn {
    width: 32px;
    height: 32px;
  }
  
  #canvasColor {
    width: 32px;
    height: 32px;
  }
  
  #canvasSize {
    width: 60px;
  }
}
`;

// Inject canvas styles
const canvasStyleSheet = document.createElement('style');
canvasStyleSheet.textContent = canvasStyles;
document.head.appendChild(canvasStyleSheet);