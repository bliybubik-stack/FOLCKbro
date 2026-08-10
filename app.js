// app.js – Professional Drawing App with 15+ Brushes, 7 Tools, 50+ Features

(function() {
    'use strict';

    // ---- DOM References ----
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    const colorPreview = document.getElementById('colorPreview');
    const miniColorPreview = document.getElementById('miniColorPreview');
    const hexInput = document.getElementById('hexInput');
    const colorHistoryContainer = document.getElementById('colorHistory');
    const brushGrid = document.getElementById('brushGrid');
    const layerList = document.getElementById('layerList');
    const toast = document.getElementById('toast');
    const canvasInfo = document.getElementById('canvasInfo');

    // ---- Canvas Setup ----
    let canvasWidth = 0, canvasHeight = 0;
    let scale = 1;

    function resizeCanvas() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width;
        const h = rect.height;
        canvasWidth = w;
        canvasHeight = h;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        scale = dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        canvasInfo.textContent = `${Math.round(w)} × ${Math.round(h)}`;
        renderAllLayers();
    }

    // ---- Color Management ----
    let currentColor = { h: 340, s: 85, l: 55 };
    let colorHistory = JSON.parse(localStorage.getItem('canvas-studio-colors') || '[]');

    function hslToRgb(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = d / (1 - Math.abs(2 * l - 1));
            switch (max) {
                case r: h = 60 * (((g - b) / d) % 6); break;
                case g: h = 60 * ((b - r) / d + 2); break;
                case b: h = 60 * ((r - g) / d + 4); break;
            }
            if (h < 0) h += 360;
        }
        return [h, s * 100, l * 100];
    }

    function rgbToHex(rgb) {
        return rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '').trim();
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
    }

    function getColorHex() {
        return rgbToHex(hslToRgb(currentColor.h, currentColor.s, currentColor.l));
    }

    function getColorRgb() {
        return hslToRgb(currentColor.h, currentColor.s, currentColor.l);
    }

    function getColorStyle() {
        const rgb = getColorRgb();
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }

    function updateColorUI() {
        const hex = getColorHex();
        const style = getColorStyle();
        colorPreview.style.background = style;
        miniColorPreview.style.background = style;
        hexInput.value = hex;
        applySettings();
    }

    function addColorToHistory(color) {
        colorHistory = [color, ...colorHistory.filter(c => c !== color)].slice(0, 24);
        localStorage.setItem('canvas-studio-colors', JSON.stringify(colorHistory));
        renderColorHistory();
    }

    function renderColorHistory() {
        colorHistoryContainer.innerHTML = '';
        if (colorHistory.length === 0) {
            colorHistoryContainer.innerHTML = '<span class="text-[9px] text-gray-500">No recent colors</span>';
            return;
        }
        colorHistory.forEach(color => {
            const div = document.createElement('div');
            div.className = 'color-history-item';
            div.style.background = color;
            div.title = color;
            div.addEventListener('click', () => {
                const rgb = hexToRgb(color);
                if (rgb) {
                    const [h, s, l] = rgbToHsl(...rgb);
                    currentColor.h = h;
                    currentColor.s = s;
                    currentColor.l = l;
                    updateColorUI();
                    applySettings();
                }
            });
            colorHistoryContainer.appendChild(div);
        });
    }

    // ---- Brushes ----
    const brushes = [
        { id: 'basic', name: 'Basic', icon: '🖊', size: 8, opacity: 100, flow: 100, hardness: 100, spacing: 0 },
        { id: 'pencil', name: 'Pencil', icon: '✏️', size: 3, opacity: 90, flow: 85, hardness: 100, spacing: 2 },
        { id: 'marker', name: 'Marker', icon: '🖌', size: 12, opacity: 85, flow: 95, hardness: 90, spacing: 1 },
        { id: 'airbrush', name: 'Airbrush', icon: '💨', size: 25, opacity: 35, flow: 40, hardness: 20, spacing: 8 },
        { id: 'calligraphy', name: 'Calligraphy', icon: '✒️', size: 6, opacity: 100, flow: 80, hardness: 100, spacing: 0 },
        { id: 'charcoal', name: 'Charcoal', icon: '🔥', size: 18, opacity: 60, flow: 55, hardness: 30, spacing: 5 },
        { id: 'watercolor', name: 'Watercolor', icon: '🎨', size: 30, opacity: 30, flow: 25, hardness: 10, spacing: 10 },
        { id: 'oil', name: 'Oil Paint', icon: '🖼', size: 14, opacity: 80, flow: 70, hardness: 60, spacing: 3 },
        { id: 'pastel', name: 'Pastel', icon: '🌈', size: 16, opacity: 55, flow: 50, hardness: 40, spacing: 6 },
        { id: 'ink', name: 'Ink Pen', icon: '🖋', size: 2, opacity: 100, flow: 100, hardness: 100, spacing: 0 },
        { id: 'spray', name: 'Spray', icon: '💦', size: 40, opacity: 20, flow: 30, hardness: 5, spacing: 12 },
        { id: 'crayon', name: 'Crayon', icon: '🖍', size: 10, opacity: 75, flow: 65, hardness: 70, spacing: 4 },
        { id: 'marker2', name: 'Highlighter', icon: '🟡', size: 20, opacity: 40, flow: 50, hardness: 50, spacing: 2 },
        { id: 'sketch', name: 'Sketch', icon: '📝', size: 5, opacity: 80, flow: 75, hardness: 90, spacing: 3 },
        { id: 'blend', name: 'Blender', icon: '🌀', size: 30, opacity: 25, flow: 20, hardness: 15, spacing: 6 },
        { id: 'texture', name: 'Texture', icon: '🔲', size: 22, opacity: 50, flow: 45, hardness: 35, spacing: 7 },
        { id: 'glow', name: 'Glow', icon: '✨', size: 35, opacity: 30, flow: 35, hardness: 25, spacing: 9 },
        { id: 'dotted', name: 'Dotted', icon: '🔵', size: 6, opacity: 90, flow: 85, hardness: 100, spacing: 15 }
    ];

    let currentBrush = brushes[0];

    function renderBrushes() {
        brushGrid.innerHTML = '';
        brushes.forEach(brush => {
            const div = document.createElement('div');
            div.className = `brush-item ${brush.id === currentBrush.id ? 'active' : ''}`;
            div.innerHTML = `
                <span class="brush-icon">${brush.icon}</span>
                <span class="brush-name">${brush.name}</span>
            `;
            div.addEventListener('click', () => {
                currentBrush = brush;
                renderBrushes();
                loadBrushSettings(brush);
                showToast(`Switched to ${brush.name}`);
            });
            brushGrid.appendChild(div);
        });
    }

    function loadBrushSettings(brush) {
        sizeSlider.value = brush.size;
        opacitySlider.value = brush.opacity;
        flowSlider.value = brush.flow || 100;
        hardnessSlider.value = brush.hardness || 100;
        spacingSlider.value = brush.spacing || 0;
        updateSettings();
        applySettings();
    }

    // ---- Tools ----
    const tools = ['brush', 'pencil', 'marker', 'airbrush', 'calligraphy', 'charcoal', 'watercolor', 'eraser', 'fill', 'text', 'select'];
    let currentTool = 'brush';
    let toolButtons = document.querySelectorAll('.tool-btn');

    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            canvas.style.cursor = currentTool === 'eraser' ? 'cell' : 'crosshair';
            if (currentTool === 'text') {
                enableTextTool();
            } else {
                disableTextTool();
            }
            // Show toast
            const toolNames = {
                brush: 'Brush', pencil: 'Pencil', marker: 'Marker',
                airbrush: 'Airbrush', calligraphy: 'Calligraphy',
                charcoal: 'Charcoal', watercolor: 'Watercolor',
                eraser: 'Eraser', fill: 'Fill', text: 'Text', select: 'Select'
            };
            showToast(`Tool: ${toolNames[currentTool] || currentTool}`);
        });
    });

    // ---- Settings ----
    const sizeSlider = document.getElementById('sizeSlider');
    const opacitySlider = document.getElementById('opacitySlider');
    const flowSlider = document.getElementById('flowSlider');
    const hardnessSlider = document.getElementById('hardnessSlider');
    const spacingSlider = document.getElementById('spacingSlider');
    const sizeDisplay = document.getElementById('sizeDisplay');
    const opacityDisplay = document.getElementById('opacityDisplay');
    const flowDisplay = document.getElementById('flowDisplay');
    const hardnessDisplay = document.getElementById('hardnessDisplay');
    const spacingDisplay = document.getElementById('spacingDisplay');
    const pressureToggle = document.getElementById('pressureToggle');
    const smoothingToggle = document.getElementById('smoothingToggle');

    const settings = {
        size: 8,
        opacity: 100,
        flow: 100,
        hardness: 100,
        spacing: 0,
        pressure: false,
        smoothing: false,
        color: '#ff3366'
    };

    function updateSettings() {
        settings.size = parseInt(sizeSlider.value);
        settings.opacity = parseInt(opacitySlider.value);
        settings.flow = parseInt(flowSlider.value);
        settings.hardness = parseInt(hardnessSlider.value);
        settings.spacing = parseInt(spacingSlider.value);
        settings.pressure = pressureToggle.checked;
        settings.smoothing = smoothingToggle.checked;
        settings.color = getColorStyle();

        sizeDisplay.textContent = settings.size + 'px';
        opacityDisplay.textContent = settings.opacity + '%';
        flowDisplay.textContent = settings.flow + '%';
        hardnessDisplay.textContent = settings.hardness + '%';
        spacingDisplay.textContent = settings.spacing + '%';
        applySettings();
    }

    function applySettings() {
        const rgb = getColorRgb();
        const color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.lineWidth = settings.size;
        ctx.shadowBlur = Math.max(0, (100 - settings.hardness) / 100 * settings.size * 0.5);
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
    }

    sizeSlider.addEventListener('input', updateSettings);
    opacitySlider.addEventListener('input', updateSettings);
    flowSlider.addEventListener('input', updateSettings);
    hardnessSlider.addEventListener('input', updateSettings);
    spacingSlider.addEventListener('input', updateSettings);
    pressureToggle.addEventListener('change', updateSettings);
    smoothingToggle.addEventListener('change', updateSettings);

    hexInput.addEventListener('input', (e) => {
        const rgb = hexToRgb(e.target.value);
        if (rgb) {
            const [h, s, l] = rgbToHsl(...rgb);
            currentColor.h = h;
            currentColor.s = s;
            currentColor.l = l;
            updateColorUI();
            applySettings();
        }
    });
    hexInput.addEventListener('change', () => {
        addColorToHistory('#' + getColorHex());
    });

    document.getElementById('randomColorBtn').addEventListener('click', () => {
        currentColor.h = Math.random() * 360;
        currentColor.s = 60 + Math.random() * 35;
        currentColor.l = 40 + Math.random() * 35;
        updateColorUI();
        applySettings();
        addColorToHistory('#' + getColorHex());
        showToast('Random color');
    });

    // ---- Layers ----
    let layers = [];
    let activeLayerIndex = 0;
    let layerIdCounter = 0;

    function createLayer(name = `Layer ${layers.length + 1}`) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = canvas.width;
        layerCanvas.height = canvas.height;
        const layerCtx = layerCanvas.getContext('2d');
        layerCtx.fillStyle = 'rgba(0,0,0,0)';
        layerCtx.fillRect(0, 0, layerCanvas.width, layerCanvas.height);
        return {
            id: layerIdCounter++,
            name: name,
            canvas: layerCanvas,
            ctx: layerCtx,
            opacity: 100,
            visible: true,
            locked: false
        };
    }

    function initLayers() {
        layers = [];
        const bg = createLayer('Background');
        bg.ctx.fillStyle = '#ffffff';
        bg.ctx.fillRect(0, 0, bg.canvas.width, bg.canvas.height);
        layers.push(bg);
        const layer1 = createLayer('Layer 1');
        layers.push(layer1);
        activeLayerIndex = layers.length - 1;
        renderLayerList();
        renderAllLayers();
    }

    function getActiveLayer() {
        return layers[activeLayerIndex] || layers[0];
    }

    function renderAllLayers() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        layers.forEach(layer => {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity / 100;
                ctx.drawImage(layer.canvas, 0, 0, canvasWidth, canvasHeight);
            }
        });
        ctx.globalAlpha = 1;
        applySettings();
    }

    function renderLayerList() {
        layerList.innerHTML = '';
        layers.forEach((layer, index) => {
            const div = document.createElement('div');
            div.className = `layer-item ${index === activeLayerIndex ? 'active' : ''}`;
            div.innerHTML = `
                <span class="layer-name">${layer.name}</span>
                <input type="range" class="layer-opacity-input" min="0" max="100" value="${layer.opacity}">
                <button class="layer-vis-toggle">${layer.visible ? '👁' : '👁‍🗨'}</button>
                <button class="layer-lock-toggle ${layer.locked ? 'locked' : ''}">${layer.locked ? '🔒' : '🔓'}</button>
            `;
            div.addEventListener('click', (e) => {
                if (!e.target.closest('input') && !e.target.closest('button')) {
                    activeLayerIndex = index;
                    renderLayerList();
                }
            });
            const opacityInput = div.querySelector('.layer-opacity-input');
            opacityInput.addEventListener('input', (e) => {
                layer.opacity = parseInt(e.target.value);
                renderAllLayers();
            });
            const visBtn = div.querySelector('.layer-vis-toggle');
            visBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                renderLayerList();
                renderAllLayers();
            });
            const lockBtn = div.querySelector('.layer-lock-toggle');
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                layer.locked = !layer.locked;
                renderLayerList();
            });
            layerList.appendChild(div);
        });
    }

    document.getElementById('addLayerBtn').addEventListener('click', () => {
        const layer = createLayer(`Layer ${layers.length}`);
        layers.push(layer);
        activeLayerIndex = layers.length - 1;
        renderLayerList();
        renderAllLayers();
        showToast('Layer added');
    });

    document.getElementById('removeLayerBtn').addEventListener('click', () => {
        if (layers.length > 1) {
            layers.splice(activeLayerIndex, 1);
            if (activeLayerIndex >= layers.length) activeLayerIndex = layers.length - 1;
            renderLayerList();
            renderAllLayers();
            showToast('Layer removed');
        }
    });

    document.getElementById('mergeLayerBtn').addEventListener('click', () => {
        if (layers.length > 1) {
            const merged = createLayer('Merged');
            layers.forEach(layer => {
                if (layer.visible) {
                    merged.ctx.globalAlpha = layer.opacity / 100;
                    merged.ctx.drawImage(layer.canvas, 0, 0);
                }
            });
            merged.ctx.globalAlpha = 1;
            layers = [merged];
            activeLayerIndex = 0;
            renderLayerList();
            renderAllLayers();
            showToast('Layers merged');
        }
    });

    // ---- Drawing State ----
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let lastPressure = 1;
    let points = [];
    let strokeHistory = [];
    let historyIndex = -1;

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        const pressure = e.pressure || e.touches?.[0]?.force || 1;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
            pressure: Math.min(pressure, 1)
        };
    }

    function getSize() {
        let size = settings.size;
        if (settings.pressure && lastPressure) {
            size = size * (0.3 + 0.7 * lastPressure);
        }
        return Math.max(1, size);
    }

    function startDrawing(e) {
        e.preventDefault();
        const layer = getActiveLayer();
        if (!layer || layer.locked) return;

        if (currentTool === 'fill') {
            floodFill(e);
            return;
        }
        if (currentTool === 'text') {
            enableTextTool(e);
            return;
        }
        if (currentTool === 'select') {
            startSelection(e);
            return;
        }

        isDrawing = true;
        const pos = getCoords(e);
        lastX = pos.x;
        lastY = pos.y;
        lastPressure = pos.pressure || 1;
        points = [{x: pos.x, y: pos.y, pressure: lastPressure}];

        const lctx = layer.ctx;
        const size = getSize();
        lctx.beginPath();
        lctx.arc(lastX, lastY, size / 2, 0, Math.PI * 2);
        lctx.fillStyle = settings.color;
        lctx.globalAlpha = settings.opacity / 100;
        lctx.shadowBlur = Math.max(0, (100 - settings.hardness) / 100 * size * 0.5);
        lctx.shadowColor = settings.color;
        lctx.fill();

        lctx.beginPath();
        lctx.moveTo(lastX, lastY);
        lctx.strokeStyle = settings.color;
        lctx.lineWidth = size;
        lctx.globalAlpha = settings.opacity / 100;
        lctx.shadowBlur = Math.max(0, (100 - settings.hardness) / 100 * size * 0.5);
        lctx.shadowColor = settings.color;
        lctx.lineCap = 'round';
        lctx.lineJoin = 'round';
        renderAllLayers();
    }

    function drawStroke(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const layer = getActiveLayer();
        if (!layer || layer.locked) return;

        const pos = getCoords(e);
        lastPressure = pos.pressure || 1;
        const lctx = layer.ctx;
        const size = getSize();

        // Spacing
        if (settings.spacing > 0) {
            const dx = pos.x - lastX;
            const dy = pos.y - lastY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const minDist = settings.spacing / 100 * 10;
            if (dist < minDist) return;
        }

        // Smoothing
        let targetX = pos.x, targetY = pos.y;
        if (settings.smoothing && points.length > 1) {
            const avg = 0.5;
            targetX = points[points.length - 1].x * avg + pos.x * (1 - avg);
            targetY = points[points.length - 1].y * avg + pos.y * (1 - avg);
        }

        lctx.lineTo(targetX, targetY);
        lctx.stroke();

        lastX = targetX;
        lastY = targetY;
        points.push({x: targetX, y: targetY, pressure: lastPressure});

        lctx.beginPath();
        lctx.moveTo(lastX, lastY);
        lctx.strokeStyle = settings.color;
        lctx.lineWidth = size;
        lctx.globalAlpha = settings.opacity / 100;
        lctx.shadowBlur = Math.max(0, (100 - settings.hardness) / 100 * size * 0.5);
        lctx.shadowColor = settings.color;
        renderAllLayers();
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            const layer = getActiveLayer();
            if (layer) {
                layer.ctx.closePath();
                saveStrokeState();
            }
            renderAllLayers();
        }
        if (currentTool === 'select') {
            endSelection();
        }
    }

    // ---- Flood Fill ----
    function floodFill(e) {
        const layer = getActiveLayer();
        if (!layer || layer.locked) return;
        const pos = getCoords(e);
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);
        const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        const data = imageData.data;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const idx = (y * w + x) * 4;
        const targetR = data[idx], targetG = data[idx+1], targetB = data[idx+2], targetA = data[idx+3];
        const fillR = Math.round(currentColor.h / 360 * 255);
        const fillG = Math.round(currentColor.s / 100 * 255);
        const fillB = Math.round(currentColor.l / 100 * 255);
        if (targetR === fillR && targetG === fillG && targetB === fillB) return;

        const stack = [{x, y}];
        const visited = new Set();
        while (stack.length > 0) {
            const {x: cx, y: cy} = stack.pop();
            const key = cx + ',' + cy;
            if (visited.has(key)) continue;
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            const i = (cy * w + cx) * 4;
            if (Math.abs(data[i] - targetR) > 10 || Math.abs(data[i+1] - targetG) > 10 || Math.abs(data[i+2] - targetB) > 10) continue;
            visited.add(key);
            data[i] = fillR; data[i+1] = fillG; data[i+2] = fillB; data[i+3] = 255;
            stack.push({x: cx+1, y: cy}, {x: cx-1, y: cy}, {x: cx, y: cy+1}, {x: cx, y: cy-1});
        }
        layer.ctx.putImageData(imageData, 0, 0);
        renderAllLayers();
        saveStrokeState();
        showToast('Fill applied');
    }

    // ---- Selection Tool ----
    let selectionStart = null;
    let selectionEnd = null;
    let selectionOverlay = null;

    function startSelection(e) {
        const pos = getCoords(e);
        selectionStart = {x: pos.x, y: pos.y};
        selectionEnd = null;
        if (selectionOverlay) {
            selectionOverlay.remove();
            selectionOverlay = null;
        }
        selectionOverlay = document.createElement('div');
        selectionOverlay.className = 'selection-overlay';
        canvas.parentElement.appendChild(selectionOverlay);
        isDrawing = true;
    }

    function endSelection() {
        isDrawing = false;
        if (selectionOverlay && selectionStart && selectionEnd) {
            const rect = getSelectionRect();
            if (rect.w > 5 && rect.h > 5) {
                showToast(`Selected area: ${Math.round(rect.w)}×${Math.round(rect.h)}`);
                // Copy selection to clipboard
                copySelection(rect);
            }
        }
        if (selectionOverlay) {
            selectionOverlay.remove();
            selectionOverlay = null;
        }
        selectionStart = null;
        selectionEnd = null;
    }

    function getSelectionRect() {
        if (!selectionStart || !selectionEnd) return {x: 0, y: 0, w: 0, h: 0};
        const x = Math.min(selectionStart.x, selectionEnd.x);
        const y = Math.min(selectionStart.y, selectionEnd.y);
        const w = Math.abs(selectionEnd.x - selectionStart.x);
        const h = Math.abs(selectionEnd.y - selectionStart.y);
        return {x, y, w, h};
    }

    function copySelection(rect) {
        const layer = getActiveLayer();
        if (!layer) return;
        const imageData = layer.ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rect.w;
        tempCanvas.height = rect.h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        tempCanvas.toBlob(blob => {
            if (blob) {
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    showToast('Selection copied to clipboard');
                }).catch(() => {
                    showToast('Selection ready');
                });
            }
        });
    }

    // ---- Text Tool ----
    let textInput = null;

    function enableTextTool(e) {
        disableTextTool();
        const pos = e ? getCoords(e) : {x: 100, y: 100};
        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'text-input-overlay';
        textInput.style.position = 'absolute';
        textInput.style.left = pos.x + 'px';
        textInput.style.top = pos.y + 'px';
        textInput.style.fontSize = Math.max(14, settings.size + 10) + 'px';
        textInput.style.color = settings.color;
        textInput.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
        textInput.placeholder = 'Type text...';
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(textInput);
        textInput.focus();
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = textInput.value;
                if (text) {
                    const layer = getActiveLayer();
                    if (layer && !layer.locked) {
                        const lctx = layer.ctx;
                        const size = Math.max(14, settings.size + 10);
                        lctx.font = `${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
                        lctx.fillStyle = settings.color;
                        lctx.globalAlpha = settings.opacity / 100;
                        lctx.shadowBlur = Math.max(0, (100 - settings.hardness) / 100 * size * 0.3);
                        lctx.shadowColor = settings.color;
                        const rect = textInput.getBoundingClientRect();
                        const canvasRect = canvas.getBoundingClientRect();
                        const x = rect.left - canvasRect.left;
                        const y = rect.top - canvasRect.top + parseInt(textInput.style.fontSize);
                        lctx.fillText(text, x, y);
                        renderAllLayers();
                        saveStrokeState();
                        showToast('Text added');
                    }
                }
                disableTextTool();
            }
            if (e.key === 'Escape') disableTextTool();
        });
        textInput.addEventListener('blur', () => {
            setTimeout(disableTextTool, 200);
        });
    }

    function disableTextTool() {
        if (textInput && textInput.parentElement) {
            textInput.parentElement.removeChild(textInput);
        }
        textInput = null;
    }

    // ---- Undo/Redo ----
    function saveStrokeState() {
        const state = layers.map(layer => {
            const data = layer.canvas.toDataURL();
            return { data, opacity: layer.opacity, visible: layer.visible };
        });
        strokeHistory = strokeHistory.slice(0, historyIndex + 1);
        strokeHistory.push(state);
        if (strokeHistory.length > 50) strokeHistory.shift();
        historyIndex = strokeHistory.length - 1;
    }

    function restoreState(state) {
        layers.forEach((layer, i) => {
            if (state[i]) {
                const img = new Image();
                img.onload = () => {
                    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                    layer.ctx.drawImage(img, 0, 0);
                    layer.opacity = state[i].opacity;
                    layer.visible = state[i].visible;
                    renderAllLayers();
                    renderLayerList();
                };
                img.src = state[i].data;
            }
        });
    }

    function undo() {
        if (historyIndex <= 0) return;
        historyIndex--;
        restoreState(strokeHistory[historyIndex]);
        showToast('Undo');
    }

    function redo() {
        if (historyIndex >= strokeHistory.length - 1) return;
        historyIndex++;
        restoreState(strokeHistory[historyIndex]);
        showToast('Redo');
    }

    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all layers?')) {
            layers.forEach(layer => {
                layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                if (layer.name === 'Background') {
                    layer.ctx.fillStyle = '#ffffff';
                    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
                }
            });
            renderAllLayers();
            saveStrokeState();
            showToast('Canvas cleared');
        }
    });

    // ---- Canvas Events ----
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawStroke);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawStroke, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // Right-click undo
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        undo();
    });

    // ---- Keyboard Shortcuts ----
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
        if (e.key === 'Escape') disableTextTool();
        // Number shortcuts for tools
        const toolMap = {
            '1': 'brush', '2': 'pencil', '3': 'marker', '4': 'airbrush',
            '5': 'calligraphy', '6': 'charcoal', '7': 'watercolor',
            '8': 'eraser', '9': 'fill', '0': 'text'
        };
        if (e.key in toolMap) {
            const tool = toolMap[e.key];
            toolButtons.forEach(btn => {
                if (btn.dataset.tool === tool) {
                    btn.click();
                }
            });
        }
    });

    // ---- Tabs ----
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = {
        brushes: document.getElementById('tab-brushes'),
        settings: document.getElementById('tab-settings'),
        layers: document.getElementById('tab-layers')
    };

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            Object.keys(tabContents).forEach(key => {
                tabContents[key].classList.toggle('hidden', key !== tab);
            });
        });
    });
    // Set default tab
    tabButtons[0].classList.add('active');

    // ---- Toast ----
    let toastTimeout = null;

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // ---- Init ----
    function init() {
        resizeCanvas();
        initLayers();
        renderBrushes();
        updateColorUI();
        updateSettings();
        renderColorHistory();
        // Load default brush
        loadBrushSettings(brushes[0]);
        // Initial save
        saveStrokeState();

        window.addEventListener('resize', () => {
            const layerData = layers.map(l => l.canvas.toDataURL());
            resizeCanvas();
            layers.forEach((layer, i) => {
                const newCanvas = document.createElement('canvas');
                newCanvas.width = canvas.width;
                newCanvas.height = canvas.height;
                const newCtx = newCanvas.getContext('2d');
                if (i < layerData.length) {
                    const img = new Image();
                    img.onload = () => {
                        newCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                        layer.canvas = newCanvas;
                        layer.ctx = newCtx;
                        renderAllLayers();
                    };
                    img.src = layerData[i];
                } else {
                    layer.canvas = newCanvas;
                    layer.ctx = newCtx;
                }
            });
            renderLayerList();
        });

        // Init Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        showToast('Welcome to Canvas Studio! 🎨');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
