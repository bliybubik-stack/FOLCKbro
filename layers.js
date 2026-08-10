// ===== РАСШИРЕННОЕ УПРАВЛЕНИЕ СЛОЯМИ =====

// ===== КЛАСС ДЛЯ РАБОТЫ СО СЛОЯМИ =====
class LayerManager {
    constructor() {
        this.layers = [];
        this.activeLayerIndex = 0;
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.layerCache = new Map();
        this.maxUndoSteps = 30;
        this.undoStack = [];
        this.redoStack = [];
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    initialize(width, height, layerCount = 3) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        
        for (let i = 1; i <= layerCount; i++) {
            this.addLayer(`Слой ${i}`, i === layerCount - 1);
        }
        
        this.activeLayerIndex = 0;
        this.renderLayers();
    }

    // ===== ДОБАВЛЕНИЕ СЛОЯ =====
    addLayer(name, isActive = false) {
        const layer = {
            id: this.layers.length + 1,
            name: name || `Слой ${this.layers.length + 1}`,
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'normal',
            canvas: document.createElement('canvas'),
            context: null,
            thumbnail: null
        };
        
        layer.canvas.width = this.canvasWidth;
        layer.canvas.height = this.canvasHeight;
        layer.context = layer.canvas.getContext('2d');
        
        // Очищаем слой (прозрачный)
        layer.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        this.layers.push(layer);
        this.updateThumbnail(layer);
        
        if (isActive) {
            this.activeLayerIndex = this.layers.length - 1;
        }
        
        this.renderLayers();
        this.updateMainCanvas();
        return layer;
    }

    // ===== УДАЛЕНИЕ СЛОЯ =====
    removeLayer(index) {
        if (this.layers.length <= 1) {
            alert('Нельзя удалить последний слой');
            return false;
        }
        
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return false;
        
        const layer = this.layers[index];
        if (layer.locked) {
            alert('Слой заблокирован');
            return false;
        }
        
        this.layers.splice(index, 1);
        
        if (this.activeLayerIndex >= this.layers.length) {
            this.activeLayerIndex = this.layers.length - 1;
        } else if (this.activeLayerIndex === index) {
            this.activeLayerIndex = Math.min(index, this.layers.length - 1);
        }
        
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
        return true;
    }

    // ===== ДУБЛИРОВАНИЕ СЛОЯ =====
    duplicateLayer(index) {
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return false;
        
        const sourceLayer = this.layers[index];
        const newLayer = {
            id: this.layers.length + 1,
            name: `${sourceLayer.name} (копия)`,
            visible: true,
            locked: false,
            opacity: sourceLayer.opacity,
            blendMode: sourceLayer.blendMode,
            canvas: document.createElement('canvas'),
            context: null,
            thumbnail: null
        };
        
        newLayer.canvas.width = this.canvasWidth;
        newLayer.canvas.height = this.canvasHeight;
        newLayer.context = newLayer.canvas.getContext('2d');
        
        // Копируем содержимое
        newLayer.context.drawImage(sourceLayer.canvas, 0, 0);
        
        this.layers.splice(index + 1, 0, newLayer);
        this.updateThumbnail(newLayer);
        this.activeLayerIndex = index + 1;
        
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
        return true;
    }

    // ===== ПЕРЕМЕЩЕНИЕ СЛОЯ =====
    moveLayer(fromIndex, toIndex) {
        if (fromIndex === toIndex) return false;
        if (fromIndex < 0 || fromIndex >= this.layers.length) return false;
        if (toIndex < 0 || toIndex >= this.layers.length) return false;
        
        const layer = this.layers.splice(fromIndex, 1)[0];
        this.layers.splice(toIndex, 0, layer);
        
        if (this.activeLayerIndex === fromIndex) {
            this.activeLayerIndex = toIndex;
        } else if (this.activeLayerIndex > fromIndex && this.activeLayerIndex <= toIndex) {
            this.activeLayerIndex--;
        } else if (this.activeLayerIndex < fromIndex && this.activeLayerIndex >= toIndex) {
            this.activeLayerIndex++;
        }
        
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
        return true;
    }

    // ===== ОБЪЕДИНЕНИЕ СЛОЕВ =====
    mergeLayers(fromIndex, toIndex) {
        if (fromIndex === toIndex) return false;
        if (fromIndex < 0 || fromIndex >= this.layers.length) return false;
        if (toIndex < 0 || toIndex >= this.layers.length) return false;
        
        const minIndex = Math.min(fromIndex, toIndex);
        const maxIndex = Math.max(fromIndex, toIndex);
        
        // Проверяем, не заблокированы ли слои
        for (let i = minIndex; i <= maxIndex; i++) {
            if (this.layers[i].locked) {
                alert(`Слой "${this.layers[i].name}" заблокирован`);
                return false;
            }
        }
        
        // Объединяем слои в один
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = this.canvasWidth;
        mergedCanvas.height = this.canvasHeight;
        const mergedCtx = mergedCanvas.getContext('2d');
        
        for (let i = minIndex; i <= maxIndex; i++) {
            if (this.layers[i].visible) {
                mergedCtx.globalAlpha = this.layers[i].opacity;
                mergedCtx.globalCompositeOperation = this.layers[i].blendMode;
                mergedCtx.drawImage(this.layers[i].canvas, 0, 0);
            }
        }
        
        // Удаляем объединенные слои
        this.layers.splice(minIndex, maxIndex - minIndex + 1);
        
        // Добавляем объединенный слой
        const newLayer = {
            id: this.layers.length + 1,
            name: `Объединенный ${this.layers.length + 1}`,
            visible: true,
            locked: false,
            opacity: 1.0,
            blendMode: 'normal',
            canvas: mergedCanvas,
            context: mergedCtx,
            thumbnail: null
        };
        
        this.layers.splice(minIndex, 0, newLayer);
        this.updateThumbnail(newLayer);
        this.activeLayerIndex = minIndex;
        
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
        return true;
    }

    // ===== ИЗМЕНЕНИЕ НАСТРОЕК СЛОЯ =====
    updateLayerSettings(index, settings) {
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return false;
        
        const layer = this.layers[index];
        
        if (settings.name !== undefined) layer.name = settings.name;
        if (settings.visible !== undefined) layer.visible = settings.visible;
        if (settings.locked !== undefined) layer.locked = settings.locked;
        if (settings.opacity !== undefined) {
            layer.opacity = Math.max(0, Math.min(1, settings.opacity));
        }
        if (settings.blendMode !== undefined) {
            layer.blendMode = settings.blendMode;
        }
        
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
        return true;
    }

    // ===== РАБОТА С МАСКОЙ СЛОЯ =====
    addLayerMask(index) {
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return false;
        
        const layer = this.layers[index];
        if (layer.mask) return false;
        
        layer.mask = document.createElement('canvas');
        layer.mask.width = this.canvasWidth;
        layer.mask.height = this.canvasHeight;
        const maskCtx = layer.mask.getContext('2d');
        maskCtx.fillStyle = '#ffffff';
        maskCtx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        layer.maskContext = maskCtx;
        
        this.renderLayers();
        return true;
    }

    removeLayerMask(index) {
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return false;
        
        const layer = this.layers[index];
        if (!layer.mask) return false;
        
        delete layer.mask;
        delete layer.maskContext;
        
        this.renderLayers();
        this.updateMainCanvas();
        return true;
    }

    // ===== ПРИМЕНЕНИЕ МАСКИ =====
    applyLayerMask(index) {
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return false;
        
        const layer = this.layers[index];
        if (!layer.mask) return false;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvasWidth;
        tempCanvas.height = this.canvasHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(layer.canvas, 0, 0);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(layer.mask, 0, 0);
        
        layer.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        layer.context.drawImage(tempCanvas, 0, 0);
        
        delete layer.mask;
        delete layer.maskContext;
        
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
        return true;
    }

    // ===== ОБНОВЛЕНИЕ ПРЕВЬЮ СЛОЯ =====
    updateThumbnail(layer) {
        const thumbSize = 32;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = thumbSize;
        tempCanvas.height = thumbSize;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Рисуем шахматный фон
        const pattern = this.createCheckerboard(8);
        tempCtx.fillStyle = pattern;
        tempCtx.fillRect(0, 0, thumbSize, thumbSize);
        
        // Рисуем слой
        tempCtx.drawImage(layer.canvas, 0, 0, thumbSize, thumbSize);
        
        layer.thumbnail = tempCanvas;
    }

    createCheckerboard(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size * 2;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#d0d0d0';
        ctx.fillRect(0, 0, size * 2, size * 2);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, size, size);
        ctx.fillRect(size, size, size, size);
        
        return ctx.createPattern(canvas, 'repeat');
    }

    // ===== ОТОБРАЖЕНИЕ СЛОЕВ =====
    renderLayers() {
        const layersList = document.getElementById('layers-list');
        if (!layersList) return;
        
        layersList.innerHTML = '';
        
        // Отображаем слои в обратном порядке (верхний слой сверху)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            const isActive = i === this.activeLayerIndex;
            
            const div = document.createElement('div');
            div.className = `layer-item${isActive ? ' active' : ''}`;
            
            // Превью
            const thumb = document.createElement('div');
            thumb.className = 'layer-thumb';
            if (layer.thumbnail) {
                thumb.style.backgroundImage = `url(${layer.thumbnail.toDataURL()})`;
                thumb.style.backgroundSize = 'cover';
            } else {
                this.updateThumbnail(layer);
                thumb.style.backgroundImage = `url(${layer.thumbnail.toDataURL()})`;
                thumb.style.backgroundSize = 'cover';
            }
            
            // Имя слоя
            const name = document.createElement('span');
            name.className = 'layer-name';
            name.textContent = layer.name;
            name.style.opacity = layer.visible ? '1' : '0.4';
            
            // Действия
            const actions = document.createElement('div');
            actions.className = 'layer-actions';
            
            // Кнопка видимости
            const eyeIcon = document.createElement('i');
            eyeIcon.className = layer.visible ? 'fas fa-eye' : 'fas fa-eye-slash';
            eyeIcon.style.color = layer.visible ? '#aaa' : '#444';
            eyeIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVisibility(i);
            });
            
            // Кнопка блокировки
            const lockIcon = document.createElement('i');
            lockIcon.className = layer.locked ? 'fas fa-lock' : 'fas fa-unlock';
            lockIcon.style.color = layer.locked ? '#ff6b6b' : '#666';
            lockIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLock(i);
            });
            
            // Кнопка удаления
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-trash';
            deleteIcon.style.color = '#666';
            deleteIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Удалить слой "${layer.name}"?`)) {
                    this.removeLayer(i);
                }
            });
            
            actions.appendChild(eyeIcon);
            actions.appendChild(lockIcon);
            actions.appendChild(deleteIcon);
            
            div.appendChild(thumb);
            div.appendChild(name);
            div.appendChild(actions);
            
            // Клик для активации слоя
            div.addEventListener('click', () => {
                this.activeLayerIndex = i;
                this.renderLayers();
                this.updateMainCanvas();
            });
            
            layersList.appendChild(div);
        }
    }

    // ===== ОБНОВЛЕНИЕ ОСНОВНОГО ХОЛСТА =====
    updateMainCanvas() {
        // Очищаем основной холст
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Рисуем все видимые слои
        this.layers.forEach(layer => {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity;
                ctx.globalCompositeOperation = layer.blendMode;
                ctx.drawImage(layer.canvas, 0, 0);
            }
        });
        
        // Сбрасываем настройки
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ===== ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ =====
    toggleVisibility(index) {
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return;
        
        const layer = this.layers[index];
        layer.visible = !layer.visible;
        
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
    }

    // ===== ПЕРЕКЛЮЧЕНИЕ БЛОКИРОВКИ =====
    toggleLock(index) {
        if (index === undefined) {
            index = this.activeLayerIndex;
        }
        
        if (index < 0 || index >= this.layers.length) return;
        
        const layer = this.layers[index];
        layer.locked = !layer.locked;
        
        this.renderLayers();
    }

    // ===== ИСТОРИЯ ИЗМЕНЕНИЙ =====
    saveState() {
        const state = this.layers.map(layer => ({
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            data: layer.canvas.toDataURL()
        }));
        
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length <= 1) return;
        
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);
        
        const previousState = this.undoStack[this.undoStack.length - 1];
        this.restoreState(previousState);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);
        this.restoreState(nextState);
    }

    restoreState(state) {
        state.forEach((layerData, index) => {
            if (index < this.layers.length) {
                const layer = this.layers[index];
                layer.name = layerData.name;
                layer.visible = layerData.visible;
                layer.locked = layerData.locked;
                layer.opacity = layerData.opacity;
                layer.blendMode = layerData.blendMode;
                
                const img = new Image();
                img.onload = () => {
                    layer.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                    layer.context.drawImage(img, 0, 0);
                    this.updateThumbnail(layer);
                };
                img.src = layerData.data;
            }
        });
        
        this.renderLayers();
        this.updateMainCanvas();
    }

    // ===== ЭКСПОРТ СЛОЕВ =====
    exportLayers() {
        const layersData = this.layers.map(layer => ({
            name: layer.name,
            data: layer.canvas.toDataURL()
        }));
        return layersData;
    }

    importLayers(layersData) {
        this.layers = [];
        layersData.forEach((data, index) => {
            const layer = this.addLayer(data.name || `Слой ${index + 1}`);
            const img = new Image();
            img.onload = () => {
                layer.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
                layer.context.drawImage(img, 0, 0);
                this.updateThumbnail(layer);
            };
            img.src = data.data;
        });
        
        this.activeLayerIndex = 0;
        this.renderLayers();
        this.updateMainCanvas();
        this.saveState();
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ МЕНЕДЖЕРА СЛОЕВ =====
let layerManager;

function initLayerManager() {
    const width = canvas.width;
    const height = canvas.height;
    
    layerManager = new LayerManager();
    layerManager.initialize(width, height, 3);
    
    // Сохраняем начальное состояние
    layerManager.saveState();
    
    // Экспортируем для использования в других файлах
    window.layerManager = layerManager;
}

// ===== ПЕРЕХВАТ РИСОВАНИЯ ДЛЯ СЛОЕВ =====
// Модифицируем функции рисования для работы со слоями
const originalDraw = draw;
draw = function(e) {
    if (!state.isDrawing || state.isTextMode) return;
    
    const pos = getMousePosition(e);
    const size = parseInt(sizeInput.value) || 8;
    const opacity = (parseInt(opacityInput.value) || 100) / 100;
    const blur = parseInt(blurInput.value) || 0;
    
    // Получаем активный слой
    const layer = layerManager.layers[layerManager.activeLayerIndex];
    if (!layer || layer.locked) return;
    
    const layerCtx = layer.context;
    
    layerCtx.save();
    layerCtx.globalAlpha = opacity;
    layerCtx.shadowColor = 'rgba(0,0,0,0)';
    layerCtx.shadowBlur = blur;
    layerCtx.lineWidth = size;
    layerCtx.strokeStyle = state.currentColor;
    layerCtx.lineCap = 'round';
    layerCtx.lineJoin = 'round';
    
    if (state.currentTool === 'eraser') {
        layerCtx.globalCompositeOperation = 'destination-out';
        layerCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        layerCtx.globalCompositeOperation = 'source-over';
    }
    
    layerCtx.beginPath();
    layerCtx.moveTo(state.lastX, state.lastY);
    layerCtx.lineTo(pos.x, pos.y);
    layerCtx.stroke();
    layerCtx.restore();
    
    // Обновляем превью слоя
    layerManager.updateThumbnail(layer);
    
    // Обновляем основной холст
    layerManager.updateMainCanvas();
    
    state.lastX = pos.x;
    state.lastY = pos.y;
};

// ===== ЗАПУСК МЕНЕДЖЕРА СЛОЕВ =====
document.addEventListener('DOMContentLoaded', () => {
    // Ждем инициализации canvas
    setTimeout(initLayerManager, 100);
});

// ===== ЭКСПОРТ =====
window.LayerManager = LayerManager;
window.layerManager = layerManager;
