// ===== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКИМ ИНТЕРФЕЙСОМ =====

// ===== ИНИЦИАЛИЗАЦИЯ UI =====
function initUI() {
    setupTooltips();
    setupShortcuts();
    setupContextMenu();
    setupColorSwap();
    setupLayerControls();
    setupPresetManagement();
    setupZoomControls();
    setupExportImport();
}

// ===== ПОДСКАЗКИ ДЛЯ ИНСТРУМЕНТОВ =====
function setupTooltips() {
    const toolButtons = document.querySelectorAll('.tool-button');
    const toolNames = {
        'pan-tool': 'Панорамирование (H)',
        'rotate-tool': 'Вращение (R)',
        'eyedropper-tool': 'Пипетка (I)',
        'select-tool': 'Выделение (V)',
        'pen-tool': 'Кисть (B)',
        'bucket-tool': 'Заливка (G)',
        'text-tool': 'Текст (T)',
        'stamp-tool': 'Штамп (S)',
        'rect-tool': 'Прямоугольник (U)',
        'circle-tool': 'Круг (O)',
        'lasso-tool': 'Лассо (L)',
        'effect-tool': 'Эффекты (E)',
        'pencil-tool': 'Карандаш (P)'
    };
    
    toolButtons.forEach(btn => {
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = toolNames[btn.id] || btn.id;
        tooltip.style.cssText = `
            position: absolute;
            left: 52px;
            background: #1a1a1a;
            color: #fff;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            white-space: nowrap;
            border: 1px solid #333;
            z-index: 1000;
        `;
        
        btn.style.position = 'relative';
        btn.appendChild(tooltip);
        
        btn.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        
        btn.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    });
}

// ===== ГОРЯЧИЕ КЛАВИШИ =====
function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Предотвращаем стандартное поведение для наших горячих клавиш
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    undoAction();
                    break;
                case 'y':
                    e.preventDefault();
                    redoAction();
                    break;
                case 's':
                    e.preventDefault();
                    exportImage();
                    break;
                case 'o':
                    e.preventDefault();
                    importImage();
                    break;
                case 'a':
                    e.preventDefault();
                    selectAll();
                    break;
            }
            return;
        }
        
        // Инструменты
        switch(e.key.toLowerCase()) {
            case 'b':
                selectTool('pen-tool');
                break;
            case 'e':
                selectTool('eraser-tool');
                break;
            case 't':
                selectTool('text-tool');
                break;
            case 'g':
                selectTool('bucket-tool');
                break;
            case 'i':
                selectTool('eyedropper-tool');
                break;
            case 'l':
                selectTool('lasso-tool');
                break;
            case 'p':
                selectTool('pencil-tool');
                break;
            case 'v':
                selectTool('select-tool');
                break;
            case 'h':
                selectTool('pan-tool');
                break;
            case 'r':
                if (e.shiftKey) {
                    selectTool('rotate-tool');
                }
                break;
            case 'u':
                selectTool('rect-tool');
                break;
            case 'o':
                if (!e.ctrlKey) {
                    selectTool('circle-tool');
                }
                break;
            case 's':
                if (!e.ctrlKey && !e.metaKey) {
                    selectTool('stamp-tool');
                }
                break;
            case 'delete':
            case 'backspace':
                deleteSelected();
                break;
            case '[':
                decreaseBrushSize();
                break;
            case ']':
                increaseBrushSize();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                if (!e.ctrlKey && !e.metaKey) {
                    const index = parseInt(e.key) - 1;
                    selectPreset(index);
                }
                break;
        }
    });
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function setupContextMenu() {
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
    });
    
    // Закрываем контекстное меню при клике вне
    document.addEventListener('click', () => {
        hideContextMenu();
    });
}

function showContextMenu(x, y) {
    const menu = document.getElementById('context-menu');
    if (!menu) {
        createContextMenu();
    }
    
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
}

function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) {
        menu.style.display = 'none';
    }
}

function createContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.style.cssText = `
        position: fixed;
        background: #2d2d2d;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 4px 0;
        min-width: 180px;
        z-index: 10000;
        display: none;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    `;
    
    const items = [
        { label: 'Отменить', shortcut: 'Ctrl+Z', action: undoAction },
        { label: 'Повторить', shortcut: 'Ctrl+Y', action: redoAction },
        { label: 'Вырезать', shortcut: 'Ctrl+X', action: cutSelection },
        { label: 'Копировать', shortcut: 'Ctrl+C', action: copySelection },
        { label: 'Вставить', shortcut: 'Ctrl+V', action: pasteSelection },
        { label: 'Очистить всё', shortcut: '', action: clearCanvas },
        { label: 'Экспорт', shortcut: 'Ctrl+S', action: exportImage },
        { label: 'Импорт', shortcut: 'Ctrl+O', action: importImage }
    ];
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #ccc;
            font-size: 13px;
        `;
        
        div.innerHTML = `
            <span>${item.label}</span>
            <span style="color: #666; font-size: 11px;">${item.shortcut}</span>
        `;
        
        div.addEventListener('mouseenter', () => {
            div.style.background = '#3a3a3a';
        });
        
        div.addEventListener('mouseleave', () => {
            div.style.background = 'transparent';
        });
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            item.action();
            hideContextMenu();
        });
        
        menu.appendChild(div);
    });
    
    document.body.appendChild(menu);
}

// ===== ОБМЕН ЦВЕТАМИ =====
function setupColorSwap() {
    const swapIcon = document.querySelector('.swap-icon');
    if (swapIcon) {
        swapIcon.addEventListener('click', () => {
            const primary = document.getElementById('primary-color');
            const secondary = document.getElementById('secondary-color');
            const tempColor = state.currentColor;
            
            state.currentColor = state.secondaryColor;
            state.secondaryColor = tempColor;
            
            primary.style.background = state.currentColor;
            secondary.style.background = state.secondaryColor;
        });
    }
    
    // Клик на вторичный цвет для выбора
    const secondarySwatch = document.getElementById('secondary-color');
    if (secondarySwatch) {
        secondarySwatch.addEventListener('click', () => {
            state.currentColor = state.secondaryColor;
            document.getElementById('primary-color').style.background = state.currentColor;
            updateToolSettings();
        });
    }
}

// ===== УПРАВЛЕНИЕ СЛОЯМИ =====
function setupLayerControls() {
    const controls = document.querySelector('.layers-controls');
    if (!controls) return;
    
    const buttons = controls.querySelectorAll('button');
    const actions = ['moveDown', 'addLayer', 'moveHorizontal', 'moveVertical', 'saveLayer'];
    
    buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const action = actions[index];
            switch(action) {
                case 'moveDown':
                    mergeLayersDown();
                    break;
                case 'addLayer':
                    addNewLayer();
                    break;
                case 'saveLayer':
                    exportLayer();
                    break;
                default:
                    console.log('Layer action:', action);
            }
        });
    });
}

function mergeLayersDown() {
    if (state.currentLayer > 0) {
        // Объединяем текущий слой с нижним
        const currentIndex = state.currentLayer;
        const belowIndex = currentIndex - 1;
        
        // В реальном приложении здесь нужно объединить слои
        state.layers.splice(currentIndex, 1);
        state.currentLayer = belowIndex;
        renderLayers();
    }
}

function addNewLayer() {
    const newLayer = {
        id: state.layers.length + 1,
        name: `Слой ${state.layers.length + 1}`,
        visible: true,
        locked: false
    };
    state.layers.push(newLayer);
    state.currentLayer = state.layers.length - 1;
    renderLayers();
}

function exportLayer() {
    // Экспорт текущего слоя
    exportImage();
}

// ===== УПРАВЛЕНИЕ ПРЕСЕТАМИ =====
function setupPresetManagement() {
    const presets = document.querySelectorAll('.preset-circle');
    
    presets.forEach(preset => {
        // Удерживание для установки
        let holdTimer = null;
        
        preset.addEventListener('mousedown', () => {
            holdTimer = setTimeout(() => {
                // Установка пресета (сохранение текущего цвета)
                const currentColor = state.currentColor;
                preset.style.background = currentColor;
                preset.dataset.color = currentColor;
                preset.querySelector('.preset-number').style.color = 
                    isLightColor(currentColor) ? '#000' : '#fff';
            }, 500);
        });
        
        preset.addEventListener('mouseup', () => {
            clearTimeout(holdTimer);
        });
        
        preset.addEventListener('mouseleave', () => {
            clearTimeout(holdTimer);
        });
    });
}

function isLightColor(hex) {
    const rgb = hexToRgb(hex);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : {r: 0, g: 0, b: 0};
}

function selectPreset(index) {
    const presets = document.querySelectorAll('.preset-circle');
    if (index >= 0 && index < presets.length) {
        presets[index].click();
    }
}

// ===== УПРАВЛЕНИЕ ЗУМОМ =====
function setupZoomControls() {
    // Колесико мыши для зума
    canvas.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Используем PanTool для зума
            if (window.panTool) {
                window.panTool.zoom(delta, x, y);
            }
        }
    });
}

// ===== ЭКСПОРТ И ИМПОРТ =====
function setupExportImport() {
    // Добавляем кнопки экспорта в интерфейс
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Экспорт';
    exportBtn.className = 'export-btn';
    exportBtn.style.cssText = `
        background: #2d2d2d;
        border: 1px solid #444;
        color: #ccc;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 8px;
        font-size: 12px;
    `;
    exportBtn.addEventListener('click', exportImage);
    
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Импорт';
    importBtn.className = 'import-btn';
    importBtn.style.cssText = `
        background: #2d2d2d;
        border: 1px solid #444;
        color: #ccc;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 8px;
        font-size: 12px;
        margin-left: 8px;
    `;
    importBtn.addEventListener('click', importImage);
    
    const container = document.querySelector('.panel-section:last-child');
    if (container) {
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = `
            display: flex;
            margin-top: 8px;
            gap: 8px;
        `;
        btnContainer.appendChild(exportBtn);
        btnContainer.appendChild(importBtn);
        container.appendChild(btnContainer);
    }
}

function exportImage() {
    const link = document.createElement('a');
    link.download = `drawing_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function importImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    saveHistory();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    input.click();
}

// ===== ДЕЙСТВИЯ =====
function selectTool(toolId) {
    const tool = document.getElementById(toolId);
    if (tool) {
        tool.click();
    }
}

function increaseBrushSize() {
    const current = parseInt(sizeInput.value) || 8;
    const newSize = Math.min(current + 2, 100);
    sizeInput.value = newSize;
    updateToolSettings();
}

function decreaseBrushSize() {
    const current = parseInt(sizeInput.value) || 8;
    const newSize = Math.max(current - 2, 1);
    sizeInput.value = newSize;
    updateToolSettings();
}

function undoAction() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = state.history[state.historyIndex];
    }
}

function redoAction() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = state.history[state.historyIndex];
    }
}

function clearCanvas() {
    if (confirm('Очистить весь холст?')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveHistory();
    }
}

function selectAll() {
    // Выделение всего холста
    alert('Функция выделения всего холста');
}

function cutSelection() {
    alert('Функция вырезания');
}

function copySelection() {
    alert('Функция копирования');
}

function pasteSelection() {
    alert('Функция вставки');
}

function deleteSelected() {
    alert('Удаление выделенного');
}

// ===== ЗАПУСК UI =====
document.addEventListener('DOMContentLoaded', initUI);
