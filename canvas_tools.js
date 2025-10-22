// Canvas Drawing Tools Implementation Module for Shiro Notes
class CanvasTools {
    constructor(app) {
        this.app = app;
        // Temporary storage for shape previews
        this.previewData = null;
    }

    // --- Tool Action Routers ---

    startDrawing(layerCtx, pos, toolSettings) {
        if (!layerCtx || !toolSettings) return;

        const { tool, color, size, opacity } = toolSettings;

        // Common setup for drawing context
        layerCtx.globalAlpha = opacity;
        layerCtx.lineWidth = size;
        layerCtx.strokeStyle = color;
        layerCtx.fillStyle = color; // For fillable shapes and spray

        // Tool-specific start actions
        switch (tool) {
            case 'pen':
            case 'brush':
            case 'calligraphy':
                layerCtx.beginPath();
                layerCtx.moveTo(pos.x, pos.y);
                layerCtx.globalCompositeOperation = 'source-over';
                break;
            case 'eraser':
                layerCtx.beginPath();
                layerCtx.moveTo(pos.x, pos.y);
                layerCtx.lineWidth = size * 1.5; // Eraser might be larger
                layerCtx.globalCompositeOperation = 'destination-out'; // Erase effect
                break;
            case 'spray':
                // No specific start action needed, drawing happens in 'draw'
                layerCtx.globalCompositeOperation = 'source-over';
                break;
            case 'line':
            case 'rectangle':
            case 'circle':
            case 'arrow':
            case 'polygon':
            case 'star':
            case 'heart':
                // Shapes only draw previews during move, finalize on stop
                this.previewData = { startX: pos.x, startY: pos.y }; // Store start point for preview
                break;
            case 'text':
                // Text is added immediately on click
                this.addText(layerCtx, pos, toolSettings);
                break;
            case 'eyedropper':
                 // Eyedropper picks color immediately on click
                 // Needs access to the *visible* canvas context, handled by UI module
                 window.canvasUI?.pickColorAt(pos.x, pos.y);
                break;
            case 'select':
                // Selection logic is handled directly in canvas_core.js
                break;
            default:
                console.warn("Unknown tool start:", tool);
        }
    }

    draw(layerCtx, mainCtx, pos, details, toolSettings) {
        if (!toolSettings) return;
        const { tool } = toolSettings;

        // Tool-specific drawing actions during pointer move
        switch (tool) {
            case 'pen':
            case 'brush':
            case 'calligraphy':
            case 'eraser':
                // These tools draw continuously on the active layer
                 if (!layerCtx) return;
                const drawFuncBrush = this['draw' + tool.charAt(0).toUpperCase() + tool.slice(1)];
                if (drawFuncBrush) {
                    drawFuncBrush(layerCtx, pos, details, toolSettings);
                }
                break;
            case 'spray':
                 if (!layerCtx) return;
                 this.drawSpray(layerCtx, pos, details, toolSettings);
                 break;
            case 'line':
            case 'rectangle':
            case 'circle':
            case 'arrow':
            case 'polygon':
            case 'star':
            case 'heart':
                // These tools draw a temporary preview on the main (visible) canvas
                if (!mainCtx || !this.previewData) return;
                // 1. Clear previous preview by re-rendering layers (done by core)
                 window.canvasCore.renderLayers({ includeGrid: true, includeSelection: true }); // Full render to clear preview
                // 2. Draw the new preview
                const drawFuncShape = this['draw' + tool.charAt(0).toUpperCase() + tool.slice(1)];
                if (drawFuncShape) {
                    mainCtx.save();
                     // Apply current tool settings to the preview context
                     mainCtx.globalAlpha = toolSettings.opacity * 0.7; // Preview slightly transparent
                     mainCtx.lineWidth = toolSettings.size;
                     mainCtx.strokeStyle = toolSettings.color;
                     mainCtx.fillStyle = toolSettings.color;
                    drawFuncShape(mainCtx, this.previewData.startX, this.previewData.startY, pos.x, pos.y, toolSettings);
                    mainCtx.restore();
                }
                break;
            case 'select':
                 // Moving/resizing is handled in canvas_core.js's handlePointerMove
                break;
            // No action needed during move for text, eyedropper
        }
    }

    stopDrawing(layerCtx, pos, details, toolSettings) {
        if (!toolSettings) return;
        const { tool } = toolSettings;

        // Finalize drawing for certain tools
        switch (tool) {
            case 'pen':
            case 'brush':
            case 'calligraphy':
            case 'eraser':
            case 'spray':
                // Continuous drawing tools might do cleanup if needed, but usually nothing here
                if(layerCtx) layerCtx.closePath(); // Close path for safety
                break;
            case 'line':
            case 'rectangle':
            case 'circle':
            case 'arrow':
            case 'polygon':
            case 'star':
            case 'heart':
                // Shapes draw the final version onto the active layer context
                if (!layerCtx || !this.previewData) return;
                const drawFuncShape = this['draw' + tool.charAt(0).toUpperCase() + tool.slice(1)];
                if (drawFuncShape) {
                     layerCtx.save();
                     // Apply final settings from toolSettings
                      layerCtx.globalAlpha = toolSettings.opacity;
                      layerCtx.lineWidth = toolSettings.size;
                      layerCtx.strokeStyle = toolSettings.color;
                      layerCtx.fillStyle = toolSettings.color;
                      layerCtx.globalCompositeOperation = 'source-over'; // Ensure drawing normally
                     drawFuncShape(layerCtx, this.previewData.startX, this.previewData.startY, pos.x, pos.y, toolSettings);
                     layerCtx.restore();
                }
                this.previewData = null; // Clear preview data
                break;
             case 'select':
                 // Selection finalization logic is in canvas_core.js handlePointerUp
                 break;
            // No stop action needed for text, eyedropper
        }
        // Final render and history save happen in canvas_core.js handlePointerUp
    }

    // --- Specific Tool Drawing Implementations ---

    // Brush-like tools (draw on layerCtx continuously)
    drawPen(ctx, pos, details, toolSettings) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    drawBrush(ctx, pos, details, toolSettings) {
        // Could add pressure sensitivity or different brush styles here later
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    drawEraser(ctx, pos, details, toolSettings) {
        // Uses destination-out composite operation set in startDrawing
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    drawCalligraphy(ctx, pos, details, toolSettings) {
        // Simple variable width effect
        const distance = Math.sqrt(Math.pow(pos.x - details.prevX, 2) + Math.pow(pos.y - details.prevY, 2));
        const thickness = Math.max(1, toolSettings.size - distance / 2); // Thinner on faster strokes
        ctx.lineWidth = thickness;
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.lineWidth = toolSettings.size; // Reset for next segment? Or keep varying? Keep varying for now.
    }

    drawSpray(ctx, pos, details, toolSettings) {
        const density = Math.max(5, toolSettings.size * 2); // Density based on size
        const radius = toolSettings.size;
        ctx.fillStyle = toolSettings.color; // Ensure fillStyle is set

        for (let i = 0; i < density; i++) {
            const angle = Math.random() * Math.PI * 2;
            const sprayRadius = Math.random() * radius;
            const offsetX = Math.cos(angle) * sprayRadius;
            const offsetY = Math.sin(angle) * sprayRadius;
            // Draw small rects instead of arc for potentially better performance
            ctx.fillRect(pos.x + offsetX, pos.y + offsetY, 1, 1);
        }
    }

    // Shape tools (draw on ctx provided - could be layerCtx or mainCtx for preview)
    drawLine(ctx, x1, y1, x2, y2, toolSettings) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    drawRectangle(ctx, x1, y1, x2, y2, toolSettings) {
        const width = x2 - x1;
        const height = y2 - y1;
        ctx.beginPath();
        ctx.rect(x1, y1, width, height);
        if (toolSettings.fillEnabled) {
             const currentAlpha = ctx.globalAlpha;
             ctx.globalAlpha *= 0.5; // Make fill semi-transparent
             ctx.fill();
             ctx.globalAlpha = currentAlpha; // Restore alpha for stroke
        }
        ctx.stroke();
    }

    drawCircle(ctx, x1, y1, x2, y2, toolSettings) {
        // Use start point as center, drag determines radius
        const dx = x2 - x1;
        const dy = y2 - y1;
        const radius = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(x1, y1, radius, 0, Math.PI * 2);
        if (toolSettings.fillEnabled) {
            const currentAlpha = ctx.globalAlpha;
            ctx.globalAlpha *= 0.5;
            ctx.fill();
            ctx.globalAlpha = currentAlpha;
        }
        ctx.stroke();
    }

    drawArrow(ctx, x1, y1, x2, y2, toolSettings) {
        const headLength = Math.max(10, toolSettings.size * 3); // Arrow head size based on line width
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Draw the line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw the arrowhead
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 7), y2 - headLength * Math.sin(angle - Math.PI / 7));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 7), y2 - headLength * Math.sin(angle + Math.PI / 7));
        ctx.stroke();
    }

    drawPolygon(ctx, x1, y1, x2, y2, toolSettings, sides = 6) {
        // Use start point as center, drag determines radius
        const centerX = x1;
        const centerY = y1;
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        sides = Math.max(3, sides); // Minimum 3 sides

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; // Start from top
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        if (toolSettings.fillEnabled) {
             const currentAlpha = ctx.globalAlpha;
             ctx.globalAlpha *= 0.5;
             ctx.fill();
             ctx.globalAlpha = currentAlpha;
        }
        ctx.stroke();
    }

    drawStar(ctx, x1, y1, x2, y2, toolSettings, points = 5) {
        const centerX = x1;
        const centerY = y1;
        const outerRadius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const innerRadius = outerRadius * 0.4; // Standard star ratio
        points = Math.max(3, points);

        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points - Math.PI / 2; // Rotate to point upwards
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        if (toolSettings.fillEnabled) {
             const currentAlpha = ctx.globalAlpha;
             ctx.globalAlpha *= 0.5;
             ctx.fill();
             ctx.globalAlpha = currentAlpha;
        }
        ctx.stroke();
    }

    drawHeart(ctx, x1, y1, x2, y2, toolSettings) {
        // Draw heart shape based on bounding box defined by start/end points
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        ctx.beginPath();
        const startX = left + width / 2;
        const startY = top + height * 0.3;
        ctx.moveTo(startX, startY);
        // Top left curve
        ctx.bezierCurveTo(left + width * 0.1, top, left, top + height * 0.6, startX, top + height);
        // Top right curve mirrored
        ctx.bezierCurveTo(left + width, top + height * 0.6, left + width - width * 0.1, top, startX, startY);
        ctx.closePath();

        if (toolSettings.fillEnabled) {
             const currentAlpha = ctx.globalAlpha;
             ctx.globalAlpha *= 0.5;
             ctx.fill();
             ctx.globalAlpha = currentAlpha;
        }
        ctx.stroke();
    }

     // --- Other Tools ---

     addText(layerCtx, pos, toolSettings) {
         if (!layerCtx) return;
         const text = prompt('Enter text:');
         if (!text) return;

         layerCtx.save();
         layerCtx.fillStyle = toolSettings.color;
         layerCtx.globalAlpha = toolSettings.opacity;
         // Adjust font size based on tool size setting - make it more usable
         const fontSize = Math.max(10, toolSettings.size * 3); // Example scaling
         layerCtx.font = `${fontSize}px Arial`; // TODO: Allow font selection from UI
         layerCtx.textAlign = 'left';
         layerCtx.textBaseline = 'top';
          layerCtx.globalCompositeOperation = 'source-over';
         layerCtx.fillText(text, pos.x, pos.y);
         layerCtx.restore();

         // Text is added immediately, save state
         window.canvasCore.saveState();
          // No need to call renderLayers explicitly, saveState usually follows pointerUp which calls renderLayers
     }


    // --- Select Tool Specific Logic ---

    drawSelectionHandles(ctx, image) {
        if (!image) return;
        ctx.save();
        ctx.strokeStyle = '#007bff'; // Blue selection handles
        ctx.lineWidth = 1; // Thin lines for handles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white fill

        const handleSize = 8;
        const halfHandle = handleSize / 2;

        // Draw dashed main selection box
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(image.x, image.y, image.width, image.height);
        ctx.setLineDash([]); // Reset dash

        // Define handle positions
        const handles = {
            'top-left': { x: image.x, y: image.y },
            'top-right': { x: image.x + image.width, y: image.y },
            'bottom-left': { x: image.x, y: image.y + image.height },
            'bottom-right': { x: image.x + image.width, y: image.y + image.height },
            // Add mid-point handles if desired
            // 'mid-top': { x: image.x + image.width / 2, y: image.y },
            // 'mid-bottom': { x: image.x + image.width / 2, y: image.y + image.height },
            // 'mid-left': { x: image.x, y: image.y + image.height / 2 },
            // 'mid-right': { x: image.x + image.width, y: image.y + image.height / 2 }
        };

        // Draw handles
        for (const pos of Object.values(handles)) {
            ctx.fillRect(pos.x - halfHandle, pos.y - halfHandle, handleSize, handleSize);
            ctx.strokeRect(pos.x - halfHandle, pos.y - halfHandle, handleSize, handleSize);
        }
        ctx.restore();
    }

    getHandleAt(image, x, y) {
        if (!image) return null;
        const handleHitboxSize = 12; // Larger hitbox for easier grabbing
        const halfHandle = handleHitboxSize / 2;

        const handles = {
            'top-left': { x: image.x, y: image.y },
            'top-right': { x: image.x + image.width, y: image.y },
            'bottom-left': { x: image.x, y: image.y + image.height },
            'bottom-right': { x: image.x + image.width, y: image.y + image.height },
            // Add mid-points if implemented
        };

        for (const [name, pos] of Object.entries(handles)) {
            if (x >= pos.x - halfHandle && x <= pos.x + halfHandle &&
                y >= pos.y - halfHandle && y <= pos.y + halfHandle) {
                return name; // Return the name of the handle hit
            }
        }
        return null; // No handle hit
    }

    resizeImage(image, handleName, currentX, currentY) {
        if (!image) return;

        const originalX = image.x;
        const originalY = image.y;
        const originalWidth = image.width;
        const originalHeight = image.height;
         const minSize = 10; // Minimum width/height

        // Calculate new dimensions/positions based on the handle being dragged
        switch (handleName) {
            case 'top-left':
                image.width = Math.max(minSize, originalX + originalWidth - currentX);
                image.height = Math.max(minSize, originalY + originalHeight - currentY);
                image.x = currentX;
                image.y = currentY;
                // Adjust position if size reached minimum
                if(image.width === minSize) image.x = originalX + originalWidth - minSize;
                if(image.height === minSize) image.y = originalY + originalHeight - minSize;
                break;
            case 'top-right':
                image.width = Math.max(minSize, currentX - originalX);
                image.height = Math.max(minSize, originalY + originalHeight - currentY);
                // image.x remains originalX
                image.y = currentY;
                if(image.height === minSize) image.y = originalY + originalHeight - minSize;
                break;
            case 'bottom-left':
                image.width = Math.max(minSize, originalX + originalWidth - currentX);
                image.height = Math.max(minSize, currentY - originalY);
                image.x = currentX;
                // image.y remains originalY
                 if(image.width === minSize) image.x = originalX + originalWidth - minSize;
                break;
            case 'bottom-right':
                image.width = Math.max(minSize, currentX - originalX);
                image.height = Math.max(minSize, currentY - originalY);
                // image.x and image.y remain originalX, originalY
                break;
             // Add cases for mid-point handles if implemented (resizing only one dimension)
        }
         // Prevent negative width/height flipping if cursor dragged past opposite edge
         if (image.width < minSize) {
              image.x = (handleName.includes('left')) ? originalX + originalWidth - minSize : originalX;
              image.width = minSize;
         }
          if (image.height < minSize) {
               image.y = (handleName.includes('top')) ? originalY + originalHeight - minSize : originalY;
               image.height = minSize;
          }

    }


} // End of CanvasTools class

// Instantiate and attach to window
if (window.app) {
    window.canvasTools = new CanvasTools(window.app);
     // Connect to core module if it exists
     if(window.canvasCore) {
         window.canvasCore.setToolHandler(window.canvasTools);
     }
} else {
    console.error("Main app instance not found for CanvasTools initialization.");
}
