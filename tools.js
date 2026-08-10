// ===== РАСШИРЕННЫЕ ИНСТРУМЕНТЫ =====

// ===== ИНСТРУМЕНТ "ЛАССО" =====
class LassoTool {
    constructor() {
        this.points = [];
        this.isDrawing = false;
        this.isComplete = false;
        this.selectedArea = null;
    }

    startDrawing(x, y) {
        this.points = [{x, y}];
        this.isDrawing = true;
        this.isComplete = false;
        this.selectedArea = null;
    }

    addPoint(x, y) {
        if (this.isDrawing && !this.isComplete) {
            this.points.push({x, y});
            this.drawSelectionPreview();
        }
    }

    endDrawing() {
        if (this.points.length > 2) {
            this.isComplete = true;
            this.isDrawing = false;
            this.createSelection();
        } else {
            this.points = [];
            this.isDrawing = false;
        }
    }

    drawSelectionPreview() {
        if (this.points.length < 2) return;
        
        // Сохраняем текущее состояние
        ctx.save();
        
        // Рисуем линию выделения
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    createSelection() {
        if (this.points.length < 3) return;
        
        // Создаем временный canvas для выделения
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Рисуем выделенную область
        tempCtx.beginPath();
        tempCtx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            tempCtx.lineTo(this.points[i].x, this.points[i].y);
        }
        tempCtx.closePath();
        tempCtx.clip();
        tempCtx.drawImage(canvas, 0, 0);
        
        // Сохраняем выделенную область
        this.selectedArea = tempCanvas;
        
        // Визуализируем выделение
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    clearSelection() {
        this.points = [];
        this.isDrawing = false;
        this.isComplete = false;
        this.selectedArea = null;
        // Перерисовываем холст
        // (В реальном приложении здесь нужно восстановить состояние)
    }
}

// ===== ИНСТРУМЕНТ "ЗАЛИВКА" =====
class BucketTool {
    constructor() {
        this.tolerance = 30;
    }

    fill(x, y, fillColor) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        // Получаем цвет пикселя
        const pixelIndex = (y * width + x) * 4;
        const targetColor = [
            data[pixelIndex],
            data[pixelIndex + 1],
            data[pixelIndex + 2],
            data[pixelIndex + 3]
        ];
        
        // Если цвет совпадает с цветом заливки, выходим
        const fillRgb = this.hexToRgb(fillColor);
        if (this.colorsMatch(targetColor, [fillRgb.r, fillRgb.g, fillRgb.b, 255])) {
            return;
        }
        
        // Используем алгоритм заливки с очередью
        const queue = [{x, y}];
        const visited = new Set();
        const fillColorArray = [fillRgb.r, fillRgb.g, fillRgb.b, 255];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            
            if (visited.has(key)) continue;
            if (current.x < 0 || current.x >= width || current.y < 0 || current.y >= height) continue;
            
            const index = (current.y * width + current.x) * 4;
            const currentColor = [
                data[index],
                data[index + 1],
                data[index + 2],
                data[index + 3]
            ];
            
            if (!this.colorsMatch(currentColor, targetColor, this.tolerance)) continue;
            
            visited.add(key);
            
            // Заливаем пиксель
            data[index] = fillColorArray[0];
            data[index + 1] = fillColorArray[1];
            data[index + 2] = fillColorArray[2];
            data[index + 3] = fillColorArray[3];
            
            // Добавляем соседние пиксели
            queue.push({x: current.x + 1, y: current.y});
            queue.push({x: current.x - 1, y: current.y});
            queue.push({x: current.x, y: current.y + 1});
            queue.push({x: current.x, y: current.y - 1});
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    colorsMatch(color1, color2, tolerance = 30) {
        const diff = Math.abs(color1[0] - color2[0]) +
                     Math.abs(color1[1] - color2[1]) +
                     Math.abs(color1[2] - color2[2]) +
                     Math.abs(color1[3] - color2[3]);
        return diff / 4 <= tolerance;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 0, b: 0};
    }
}

// ===== ИНСТРУМЕНТ "ПИПЕТКА" =====
class EyedropperTool {
    getColorAt(x, y) {
        const imageData = ctx.getImageData(x, y, 1, 1);
        const data = imageData.data;
        if (data[3] === 0) {
            return '#ffffff'; // Прозрачный пиксель
        }
        const hex = '#' + 
            data[0].toString(16).padStart(2, '0') +
            data[1].toString(16).padStart(2, '0') +
            data[2].toString(16).padStart(2, '0');
        return hex;
    }
}

// ===== ИНСТРУМЕНТ "ФИГУРЫ" =====
class ShapeTool {
    constructor() {
        this.startX = 0;
        this.startY = 0;
        this.isDrawing = false;
        this.tempCanvas = document.createElement('canvas');
        this.tempCanvas.width = canvas.width;
        this.tempCanvas.height = canvas.height;
        this.tempCtx = this.tempCanvas.getContext('2d');
    }

    startShape(x, y) {
        this.startX = x;
        this.startY = y;
        this.isDrawing = true;
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
    }

    drawShape(x, y, type) {
        if (!this.isDrawing) return;
        
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        
        const width = x - this.startX;
        const height = y - this.startY;
        const size = parseInt(sizeInput.value) || 8;
        const color = state.currentColor;
        const opacity = (parseInt(opacityInput.value) || 100) / 100;
        
        this.tempCtx.save();
        this.tempCtx.globalAlpha = opacity;
        this.tempCtx.strokeStyle = color;
        this.tempCtx.lineWidth = size;
        this.tempCtx.fillStyle = 'rgba(0,0,0,0)';
        
        switch(type) {
            case 'rect':
                this.tempCtx.strokeRect(this.startX, this.startY, width, height);
                break;
            case 'circle':
                const radius = Math.sqrt(width * width + height * height) / 2;
                const centerX = this.startX + width / 2;
                const centerY = this.startY + height / 2;
                this.tempCtx.beginPath();
                this.tempCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.tempCtx.stroke();
                break;
            case 'line':
                this.tempCtx.beginPath();
                this.tempCtx.moveTo(this.startX, this.startY);
                this.tempCtx.lineTo(x, y);
                this.tempCtx.stroke();
                break;
        }
        
        this.tempCtx.restore();
        
        // Отображаем временный холст поверх основного
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.tempCanvas, 0, 0);
        ctx.restore();
    }

    endShape() {
        this.isDrawing = false;
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
    }
}

// ===== ИНСТРУМЕНТ "ПЕРЕМЕЩЕНИЕ/ПАНОРАМИРОВАНИЕ" =====
class PanTool {
    constructor() {
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
    }

    startPan(x, y) {
        this.isPanning = true;
        this.startX = x - this.offsetX;
        this.startY = y - this.offsetY;
        canvas.style.cursor = 'grabbing';
    }

    pan(x, y) {
        if (!this.isPanning) return;
        this.offsetX = x - this.startX;
        this.offsetY = y - this.startY;
        this.applyTransform();
    }

    endPan() {
        this.isPanning = false;
        canvas.style.cursor = 'grab';
    }

    applyTransform() {
        // В реальном приложении здесь нужно применить трансформацию к холсту
        // Для простоты используем transform CSS
        canvas.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
    }

    zoom(factor, centerX, centerY) {
        const newScale = this.scale * factor;
        if (newScale < 0.1 || newScale > 10) return;
        
        this.scale = newScale;
        this.applyTransform();
    }
}

// ===== ИНСТРУМЕНТ "ВРАЩЕНИЕ" =====
class RotateTool {
    constructor() {
        this.rotation = 0;
        this.startAngle = 0;
        this.isRotating = false;
    }

    startRotate(x, y) {
        this.isRotating = true;
        this.startAngle = Math.atan2(y - canvas.height/2, x - canvas.width/2);
    }

    rotate(x, y) {
        if (!this.isRotating) return;
        const currentAngle = Math.atan2(y - canvas.height/2, x - canvas.width/2);
        this.rotation += currentAngle - this.startAngle;
        this.startAngle = currentAngle;
        this.applyRotation();
    }

    endRotate() {
        this.isRotating = false;
    }

    applyRotation() {
        // В реальном приложении здесь нужно применить вращение
        canvas.style.transform = `rotate(${this.rotation}rad)`;
    }
}

// ===== ЭКСПОРТ =====
window.LassoTool = LassoTool;
window.BucketTool = BucketTool;
window.EyedropperTool = EyedropperTool;
window.ShapeTool = ShapeTool;
window.PanTool = PanTool;
window.RotateTool = RotateTool;
