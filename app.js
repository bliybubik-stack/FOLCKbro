// ===== СОСТОЯНИЕ ПРИЛОЖЕНИЯ =====
const state = {
    currentTool: 'pen', // pen, eraser, text
    currentColor: '#000000',
    secondaryColor: '#ffffff',
    brushSize: 8,
    opacity: 100,
    blur: 0,
    smoothing: 0,
    pressure: false,
    font: 'Rubik',
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    currentLayer: 0,
    layers: [],
    history: [],
    historyIndex: -1,
    maxHistory: 30,
    isTextMode: false,
    textPosition: null
};

// ===== DOM ЭЛЕМЕНТЫ =====
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const sizeInput = document.getElementById('size-setting');
const opacityInput = document.getElementById('opacity-setting');
const blurInput = document.getElementById('blur-setting');
const smoothingInput = document.getElementById('smoothing-setting');
const fontSelect = document.getElementById('font-setting');

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    setupCanvas();
    setupTools();
    setupPresets();
    setupLayers();
    setupColorWheel();
    setupEventListeners();
    loadPresetColors();
    updateToolSettings();
}

// ===== НАСТРОЙКА ХОЛСТА =====
function setupCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const padding = 40;
    
    canvas.width = rect.width - padding;
    canvas.height = rect.height - padding;
    
    // Белый фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Настройки кисти по умолчанию
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

// ===== ИНСТРУМЕНТЫ =====
function setupTools() {
    const toolButtons = document.querySelectorAll('.tool-button');
    
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Убираем активный класс со всех кнопок
            toolButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Определяем инструмент по ID
            const id = this.id;
            if (id.includes('pen')) {
                state.currentTool = 'pen';
                state.isTextMode = false;
                canvas.style.cursor = 'crosshair';
            } else if (id.includes('text')) {
                state.currentTool = 'text';
                state.isTextMode = true;
                canvas.style.cursor = 'text';
            } else if (id.includes('eraser')) {
                state.currentTool = 'eraser';
                state.isTextMode = false;
                canvas.style.cursor = 'crosshair';
            } else {
                state.currentTool = 'pen';
                state.isTextMode = false;
                canvas.style.cursor = 'crosshair';
            }
            
            updateToolSettings();
        });
    });
}

// ===== ПРЕСЕТЫ ЦВЕТОВ =====
function setupPresets() {
    const presetsGrid = document.getElementById('presets-grid');
    const presetColors = [
        '#000000', '#ffffff', '#ff0000', '#ff6b00', '#ffd700',
        '#00ff00', '#00bfff', '#0000ff', '#8b00ff',
        '#ff1493', '#ff6348', '#ffa502', '#2ed573',
        '#1e90ff', '#a29bfe', '#fd79a8', '#fdcb6e', '#00cec9'
    ];
    
    presetsGrid.innerHTML = '';
    presetColors.forEach((color, index) => {
        const div = document.createElement('div');
        div.className = 'preset-circle';
        div.style.background = color;
        div.dataset.color = color;
        div.dataset.index = index + 1;
        
        const numberSpan = document.createElement('span');
        numberSpan.className = 'preset-number';
        numberSpan.textContent = index + 1;
        div.appendChild(numberSpan);
        
        if (index === 0) div.classList.add('active');
        
        div.addEventListener('click', function() {
            document.querySelectorAll('.preset-circle').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            state.currentColor = this.dataset.color;
            document.getElementById('primary-color').style.background = state.currentColor;
            updateToolSettings();
        });
        
        presetsGrid.appendChild(div);
    });
}

// ===== СЛОИ =====
function setupLayers() {
    const layersList = document.getElementById('layers-list');
    state.layers = [
        { id: 1, name: 'Слой 1', visible: true, locked: false },
        { id: 2, name: 'Слой 2', visible: true, locked: false },
        { id: 3, name: 'Слой 3', visible: true, locked: false }
    ];
    state.currentLayer = 0;
    renderLayers();
}

function renderLayers() {
    const layersList = document.getElementById('layers-list');
    layersList.innerHTML = '';
    
    state.layers.forEach((layer, index) => {
        const div = document.createElement('div');
        div.className = `layer-item${index === state.currentLayer ? ' active' : ''}`;
        
        const thumb = document.createElement('div');
        thumb.className = 'layer-thumb';
        
        const name = document.createElement('span');
        name.className = 'layer-name';
        name.textContent = layer.name;
        
        const actions = document.createElement('div');
        actions.className = 'layer-actions';
        
        const eyeIcon = document.createElement('i');
        eyeIcon.className = layer.visible ? 'fas fa-eye' : 'fas fa-eye-slash';
        eyeIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.visible = !layer.visible;
            renderLayers();
        });
        
        const lockIcon = document.createElement('i');
        lockIcon.className = layer.locked ? 'fas fa-lock' : 'fas fa-unlock';
        lockIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            layer.locked = !layer.locked;
            renderLayers();
        });
        
        actions.appendChild(eyeIcon);
        actions.appendChild(lockIcon);
        
        div.appendChild(thumb);
        div.appendChild(name);
        div.appendChild(actions);
        
        div.addEventListener('click', function() {
            state.currentLayer = index;
            renderLayers();
        });
        
        layersList.appendChild(div);
    });
}

// ===== ЦВЕТОВОЕ КОЛЕСО =====
function setupColorWheel() {
    const wheel = document.getElementById('colorWheel');
    let isDragging = false;
    
    // Рисуем цветовое колесо
    function drawWheel() {
        const rect = wheel.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        const cx = size / 2;
        const cy = size / 2;
        const radius = size / 2 - 4;
        
        // Создаем canvas для колеса
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Рисуем радужный круг
        for (let i = 0; i < 360; i++) {
            const angle = (i * Math.PI) / 180;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            const gradient = tempCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient.addColorStop(0, `hsl(${i}, 100%, 50%)`);
            gradient.addColorStop(1, `hsl(${i}, 100%, 50%)`);
            tempCtx.beginPath();
            tempCtx.arc(x, y, 2, 0, Math.PI * 2);
            tempCtx.fillStyle = `hsl(${i}, 100%, 50%)`;
            tempCtx.fill();
        }
        
        // Рисуем внутренний квадрат с градиентом
        const innerSize = size * 0.6;
        const innerX = (size - innerSize) / 2;
        const innerY = (size - innerSize) / 2;
        
        const grad = tempCtx.createLinearGradient(innerX, innerY, innerX + innerSize, innerY + innerSize);
        grad.addColorStop(0, 'rgba(255,255,255,0.8)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.8)');
        tempCtx.fillStyle = grad;
        tempCtx.fillRect(innerX, innerY, innerSize, innerSize);
        
        // Вставляем в DOM
        wheel.style.backgroundImage = `url(${tempCanvas.toDataURL()})`;
        wheel.style.backgroundSize = 'cover';
    }
    
    // Обновляем при ресайзе
    setTimeout(drawWheel, 100);
    window.addEventListener('resize', drawWheel);
    
    // Выбор цвета
    function getColorFromWheel(e) {
        const rect = wheel.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.min(rect.width, rect.height);
        const cx = size / 2;
        const cy = size / 2;
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = size / 2 - 4;
        
        if (distance <= radius) {
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;
            
            const saturation = distance / radius * 100;
            const lightness = 50 + (1 - distance / radius) * 20;
            
            state.currentColor = `hsl(${angle}, ${saturation}%, ${lightness}%)`;
            document.getElementById('primary-color').style.background = state.currentColor;
            updateToolSettings();
        }
    }
    
    wheel.addEventListener('mousedown', (e) => {
        isDragging = true;
        getColorFromWheel(e);
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            getColorFromWheel(e);
        }
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// ===== СОБЫТИЯ ХОЛСТА =====
function setupEventListeners() {
    // Рисование
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch события для мобильных
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Изменение настроек
    sizeInput.addEventListener('change', updateToolSettings);
    opacityInput.addEventListener('change', updateToolSettings);
    blurInput.addEventListener('change', updateToolSettings);
    smoothingInput.addEventListener('change', updateToolSettings);
    fontSelect.addEventListener('change', (e) => {
        state.font = e.target.value;
    });
    
    // Окно
    window.addEventListener('resize', resizeCanvas);
}

// ===== ФУНКЦИИ РИСОВАНИЯ =====
function startDrawing(e) {
    if (state.isTextMode) {
        const pos = getMousePosition(e);
        state.textPosition = pos;
        showTextInput(pos);
        return;
    }
    
    const pos = getMousePosition(e);
    state.isDrawing = true;
    state.lastX = pos.x;
    state.lastY = pos.y;
    
    // Сохраняем состояние для undo
    saveHistory();
}

function draw(e) {
    if (!state.isDrawing || state.isTextMode) return;
    
    const pos = getMousePosition(e);
    const size = parseInt(sizeInput.value) || 8;
    const opacity = (parseInt(opacityInput.value) || 100) / 100;
    const blur = parseInt(blurInput.value) || 0;
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.shadowBlur = blur;
    ctx.lineWidth = size;
    ctx.strokeStyle = state.currentColor;
    
    if (state.currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.beginPath();
    ctx.moveTo(state.lastX, state.lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    
    state.lastX = pos.x;
    state.lastY = pos.y;
}

function stopDrawing() {
    if (state.isDrawing) {
        state.isDrawing = false;
        saveHistory();
    }
}

// ===== ОБРАБОТКА TOUCH =====
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    startDrawing(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    draw(mouseEvent);
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getMousePosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function updateToolSettings() {
    // Обновляем UI в соответствии с текущим инструментом
    const isPen = state.currentTool === 'pen';
    const isEraser = state.currentTool === 'eraser';
    const isText = state.currentTool === 'text';
    
    // Показываем/скрываем соответствующие настройки
    document.querySelectorAll('.setting-item').forEach(item => {
        const label = item.querySelector('label');
        if (label) {
            const text = label.textContent.trim();
            if (isText && text === 'Шрифт') {
                item.style.display = 'flex';
            } else if (isText && text === 'Правый клик') {
                item.style.display = 'flex';
            } else if (isText && text === 'Размер') {
                item.style.display = 'flex';
            } else if (isText && text === 'Непрозрачность') {
                item.style.display = 'flex';
            } else if (isText && (text === 'Размытие' || text === 'Сглаживание')) {
                item.style.display = 'none';
            } else if (isPen || isEraser) {
                item.style.display = 'flex';
            }
        }
    });
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const padding = 40;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    canvas.width = rect.width - padding;
    canvas.height = rect.height - padding;
    
    ctx.drawImage(tempCanvas, 0, 0);
}

// ===== ТЕКСТ =====
function showTextInput(pos) {
    // Создаем временный input для текста
    const input = document.createElement('input');
    input.type = 'text';
    input.style.position = 'fixed';
    input.style.left = pos.x + 'px';
    input.style.top = pos.y + 'px';
    input.style.fontSize = '16px';
    input.style.fontFamily = state.font;
    input.style.color = state.currentColor;
    input.style.background = 'rgba(255,255,255,0.9)';
    input.style.border = '2px solid #333';
    input.style.padding = '4px 8px';
    input.style.borderRadius = '3px';
    input.style.zIndex = '9999';
    input.style.outline = 'none';
    input.placeholder = 'Введите текст...';
    input.autofocus = true;
    
    document.body.appendChild(input);
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            addTextToCanvas(this.value, pos);
            document.body.removeChild(this);
        } else if (e.key === 'Escape') {
            document.body.removeChild(this);
        }
    });
    
    input.addEventListener('blur', function() {
        if (this.value) {
            addTextToCanvas(this.value, pos);
        }
        document.body.removeChild(this);
    });
}

function addTextToCanvas(text, pos) {
    if (!text) return;
    
    ctx.save();
    ctx.font = `24px ${state.font}`;
    ctx.fillStyle = state.currentColor;
    ctx.globalAlpha = (parseInt(opacityInput.value) || 100) / 100;
    ctx.shadowBlur = parseInt(blurInput.value) || 0;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    
    // Рисуем текст
    ctx.fillText(text, pos.x, pos.y);
    ctx.restore();
    
    state.isTextMode = false;
    canvas.style.cursor = 'crosshair';
    document.getElementById('text-tool').classList.remove('active');
}

// ===== ИСТОРИЯ (UNDO) =====
function saveHistory() {
    state.history.push(canvas.toDataURL());
    if (state.history.length > state.maxHistory) {
        state.history.shift();
    }
    state.historyIndex = state.history.length - 1;
}

// ===== ЗАГРУЗКА ПРЕСЕТОВ =====
function loadPresetColors() {
    // Устанавливаем первый пресет как активный
    const firstPreset = document.querySelector('.preset-circle');
    if (firstPreset) {
        state.currentColor = firstPreset.dataset.color;
        document.getElementById('primary-color').style.background = state.currentColor;
    }
}

// ===== ЗАПУСК =====
document.addEventListener('DOMContentLoaded', init);

// Экспортируем для использования в других файлах
window.state = state;
window.ctx = ctx;
window.canvas = canvas;
