// ===== Canvas Drawing Tool =====

class CanvasDrawing {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas?.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.brushSize = 2;
        this.history = [];
        this.historyStep = -1;
        this.startX = 0;
        this.startY = 0;
        
        if (this.canvas) {
            this.init();
        }
    }

    init() {
        this.setupTools();
        this.setupCanvas();
        this.setupActions();
        this.saveState();
    }

    setupCanvas() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch support
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
    }

    setupTools() {
        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
            });
        });

        // Brush size
        const sizeSlider = document.getElementById('brushSize');
        const sizeValue = document.getElementById('brushSizeValue');
        
        sizeSlider?.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            sizeValue.textContent = this.brushSize;
        });

        // Color picker
        document.getElementById('brushColor')?.addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });

        // Color swatches
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                this.currentColor = swatch.style.background;
                document.getElementById('brushColor').value = this.currentColor;
            });
        });
    }

    setupActions() {
        // Undo
        document.getElementById('undoCanvasBtn')?.addEventListener('click', () => {
            this.undo();
        });

        // Redo
        document.getElementById('redoCanvasBtn')?.addEventListener('click', () => {
            this.redo();
        });

        // Clear
        document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
            if (confirm('Clear canvas?')) {
                this.clear();
            }
        });

        // Save
        document.getElementById('saveCanvasBtn')?.addEventListener('click', () => {
            this.saveDrawing();
        });

        // Export
        document.getElementById('exportCanvasBtn')?.addEventListener('click', () => {
            this.exportDrawing();
        });
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;

        if (this.currentTool === 'brush' || this.currentTool === 'pen' || this.currentTool === 'eraser') {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;

        const pos = this.getMousePos(e);

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        switch (this.currentTool) {
            case 'brush':
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineWidth = this.brushSize;
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
                break;

            case 'pen':
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineWidth = Math.max(1, this.brushSize - 2);
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
                break;

            case 'eraser':
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineWidth = this.brushSize * 2;
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
                break;
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        const pos = { x: this.startX, y: this.startY };
        const endPos = this.getMousePos(event);

        switch (this.currentTool) {
            case 'line':
                this.drawLine(this.startX, this.startY, endPos.x, endPos.y);
                break;

            case 'rect':
                this.drawRect(this.startX, this.startY, endPos.x, endPos.y);
                break;

            case 'circle':
                this.drawCircle(this.startX, this.startY, endPos.x, endPos.y);
                break;

            case 'arrow':
                this.drawArrow(this.startX, this.startY, endPos.x, endPos.y);
                break;

            case 'text':
                this.drawText(endPos.x, endPos.y);
                break;
        }

        this.saveState();
    }

    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.stroke();
    }

    drawRect(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.rect(x1, y1, x2 - x1, y2 - y1);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.stroke();
    }

    drawCircle(x1, y1, x2, y2) {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        this.ctx.beginPath();
        this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.stroke();
    }

    drawArrow(x1, y1, x2, y2) {
        const headlen = 15;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(x2, y2);
        this.ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }

    drawText(x, y) {
        const text = prompt('Enter text:');
        if (!text) return;

        this.ctx.font = `${this.brushSize * 10}px var(--font-sans)`;
        this.ctx.fillStyle = this.currentColor;
        this.ctx.fillText(text, x, y);
    }

    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        this.history.push(this.canvas.toDataURL());
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.restoreState(this.history[this.historyStep]);
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.restoreState(this.history[this.historyStep]);
        }
    }

    restoreState(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveState();
    }

    saveDrawing() {
        const title = document.getElementById('canvasTitle').value || 'Untitled Drawing';
        
        const drawing = {
            id: Date.now().toString(),
            title: title,
            data: this.canvas.toDataURL(),
            createdAt: new Date().toISOString()
        };

        app.data.drawings.push(drawing);
        app.saveData('drawings');
        app.updateStats();
        app.showToast('Drawing saved successfully', 'success');
    }

    exportDrawing() {
        const title = document.getElementById('canvasTitle').value || 'drawing';
        
        this.canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.png`;
            a.click();
            URL.revokeObjectURL(url);
            app.showToast('Drawing exported', 'success');
        });
    }
}

// Initialize canvas
const canvasDrawing = new CanvasDrawing();
