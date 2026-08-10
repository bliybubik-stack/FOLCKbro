// app.js – Full FlockMod drawing app with all tools, layers, color wheel

(function() {
    // ---- DOM refs ----
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    const colorWheelCanvas = document.getElementById('colorWheel');
    const wheelCtx = colorWheelCanvas.getContext('2d');
    const colorPreview = document.getElementById('colorPreview');
    const hexInput = document.getElementById('hexInput');
    const copyColorBtn = document.getElementById('copyColorBtn');
    const colorHistoryContainer = document.getElementById('colorHistory');
    const toast = document.getElementById('toast');

    // ---- Canvas sizing ----
    let canvasWidth = 0, canvasHeight = 0;
    let scale = 1;

    function resizeCanvas() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        scale = dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Redraw all layers
        renderAllLayers();
    }

    // ---- Color state ----
    let currentColor = { h: 345, s: 80, l: 55 };
    let colorHistory = JSON.parse(localStorage.getItem('flockmod-colors') || '[]');

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [
            Math.round(255 * f(0)),
            Math.round(255 * f(8)),
            Math.round(255 * f(4))
        ];
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
        return [
            parseInt(hex.substring(0, 2), 16),
            parseInt(hex.substring(2, 4), 16),
            parseInt(hex.substring(4, 6), 16)
        ];
    }

    function getColorHex() {
        const rgb = hslToRgb(currentColor.h, currentColor.s, currentColor.l);
        return rgbToHex(rgb);
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
        const rgb = getColorRgb();
        colorPreview.style.background = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        hexInput.value = hex;
        drawColorWheel();
    }

    function addColorToHistory(color) {
        colorHistory = [color, ...colorHistory.filter(c => c !== color)].slice(0, 20);
        localStorage.setItem('flockmod-colors', JSON.stringify(colorHistory));
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

    // ---- Color Wheel ----
    let wheelDragging = false;
    let wheelLightness = 55;

    function drawColorWheel() {
        const rect = colorWheelCanvas.parentElement.getBoundingClientRect();
        const size = Math.min(rect.width - 16, 280);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        colorWheelCanvas.width = size * dpr;
        colorWheelCanvas.height = size * dpr;
        colorWheelCanvas.style.width = size + 'px';
        colorWheelCanvas.style.height = size + 'px';
        wheelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const cx = size / 2;
        const cy = size / 2;
        const radius = size * 0.42;
        const ringWidth = size * 0.095;
        const inner = radius - ringWidth;

        wheelCtx.clearRect(0, 0, size, size);

        // Saturation/Lightness area
        const imageData = wheelCtx.createImageData(size * dpr, size * dpr);
        const W = imageData.width;
        const H = imageData.height;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const px = x / dpr;
                const py = y / dpr;
                const dx = px - cx;
                const dy = py - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= inner) {
                    const s = Math.min((dist / inner) * 100, 100);
                    const rgb = hslToRgb(currentColor.h, s, wheelLightness);
                    const i = (y * W + x) * 4;
                    imageData.data[i] = rgb[0];
                    imageData.data[i + 1] = rgb[1];
                    imageData.data[i + 2] = rgb[2];
                    imageData.data[i + 3] = 255;
                }
            }
        }
        wheelCtx.putImageData(imageData, 0, 0);

        // Hue ring
        const grad = wheelCtx.createConicGradient(-Math.PI / 2, cx, cy);
        grad.addColorStop(0, '#ff0000');
        grad.addColorStop(1/6, '#ffff00');
        grad.addColorStop(2/6, '#00ff00');
        grad.addColorStop(3/6, '#00ffff');
        grad.addColorStop(4/6, '#0000ff');
        grad.addColorStop(5/6, '#ff00ff');
        grad.addColorStop(1, '#ff0000');

        wheelCtx.beginPath();
        wheelCtx.arc(cx, cy, radius - ringWidth/2, 0, Math.PI * 2);
        wheelCtx.lineWidth = ringWidth;
        wheelCtx.strokeStyle = grad;
        wheelCtx.stroke();

        // Inner border
        wheelCtx.beginPath();
        wheelCtx.arc(cx, cy, inner, 0, Math.PI * 2);
        wheelCtx.lineWidth = 1;
        wheelCtx.strokeStyle = 'rgba(255,255,255,0.2)';
        wheelCtx.stroke();

        // Hue selector
        const angle = (currentColor.h - 90) * Math.PI / 180;
        const hx = cx + Math.cos(angle) * (radius - ringWidth/2);
        const hy = cy + Math.sin(angle) * (radius - ringWidth/2);
        wheelCtx.beginPath();
        wheelCtx.arc(hx, hy, 8, 0, Math.PI * 2);
        wheelCtx.fillStyle = '#fff';
        wheelCtx.fill();
        wheelCtx.lineWidth = 2;
        wheelCtx.strokeStyle = '#222';
        wheelCtx.stroke();

        // Saturation selector
        const satDist = inner * (currentColor.s / 100);
        const sx = cx + Math.cos(angle) * satDist;
        const sy = cy + Math.sin(angle) * satDist;
        wheelCtx.beginPath();
        wheelCtx.arc(sx, sy, 7, 0, Math.PI * 2);
        wheelCtx.fillStyle = '#fff';
        wheelCtx.fill();
        wheelCtx.lineWidth = 2;
        wheelCtx.strokeStyle = '#222';
        wheelCtx.stroke();
    }

    function getWheelPos(e) {
        const rect = colorWheelCanvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
        const size = rect.width;
        const cx = size / 2;
        const cy = size / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        if (angle < 0) angle += 360;
        const radius = size * 0.42;
        const ringWidth = size * 0.095;
        const inner = radius - ringWidth;
        return { dist, angle, inner, radius, cx, cy, x, y };
    }

    function handleWheelPick(e) {
        e.preventDefault();
        const pos = getWheelPos(e);
        if (pos.dist <= pos.inner) {
            const s = Math.min((pos.dist / pos.inner) * 100, 100);
            currentColor.h = pos.angle;
            currentColor.s = s;
            currentColor.l = wheelLightness;
        } else if (pos.dist >= pos.inner - 2 && pos.dist <= pos.radius + 2) {
            currentColor.h = pos.angle;
        } else {
            return;
        }
        updateColorUI();
        applySettings();
    }

    colorWheelCanvas.addEventListener('mousedown', (e) => {
        wheelDragging = true;
        handleWheelPick(e);
    });
    colorWheelCanvas.addEventListener('mousemove', (e) => {
        if (wheelDragging) handleWheelPick(e);
    });
    colorWheelCanvas.addEventListener('mouseup', () => {
        if (wheelDragging) {
            wheelDragging = false;
            addColorToHistory('#' + getColorHex());
        }
    });
    colorWheelCanvas.addEventListener('mouseleave', () => { wheelDragging = false; });
    colorWheelCanvas.addEventListener('touchstart', (e) => {
        wheelDragging = true;
        handleWheelPick(e);
    }, { passive: false });
    colorWheelCanvas.addEventListener('touchmove', (e) => {
        if (wheelDragging) handleWheelPick(e);
    }, { passive: false });
    colorWheelCanvas.addEventListener('touchend', () => {
        if (wheelDragging) {
            wheelDragging = false;
            addColorToHistory('#' + getColorHex());
        }
    });

    // ---- Tool settings ----
    const settings = {
        tool: 'pen',
        size: 8,
        opacity: 100,
        blur: 0,
        pressure: 100,
        gap: 0,
        color: '#ff3366',
        pressureEnabled: false
    };

    const sizeSlider = document.getElementById('sizeSlider');
    const opacitySlider = document.getElementById('opacitySlider');
    const blurSlider = document.getElementById('blurSlider');
    const pressureSlider = document.getElementById('pressureSlider');
    const gapSlider = document.getElementById('gapSlider');
    const sizeDisplay = document.getElementById('sizeDisplay');
    const opacityDisplay = document.getElementById('opacityDisplay');
    const blurDisplay = document.getElementById('blurDisplay');
    const pressureDisplay = document.getElementById('pressureDisplay');
    const gapDisplay = document.getElementById('gapDisplay');

    function updateSettings() {
        settings.size = parseInt(sizeSlider.value);
        settings.opacity = parseInt(opacitySlider.value);
        settings.blur = parseInt(blurSlider.value);
        settings.pressure = parseInt(pressureSlider.value);
        settings.gap = parseInt(gapSlider.value);
        settings.color = getColorStyle();
        sizeDisplay.textContent = settings.size;
        opacityDisplay.textContent = settings.opacity;
        blurDisplay.textContent = settings.blur;
        pressureDisplay.textContent = settings.pressure;
        gapDisplay.textContent = settings.gap;
        applySettings();
    }

    function applySettings() {
        ctx.globalAlpha = settings.opacity / 100;
        ctx.lineWidth = settings.size;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.strokeStyle = settings.color;
        ctx.fillStyle = settings.color;
    }

    sizeSlider.addEventListener('input', updateSettings);
    opacitySlider.addEventListener('input', updateSettings);
    blurSlider.addEventListener('input', updateSettings);
    pressureSlider.addEventListener('input', updateSettings);
    gapSlider.addEventListener('input', updateSettings);

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

    copyColorBtn.addEventListener('click', () => {
        const hex = '#' + getColorHex();
        navigator.clipboard.writeText(hex).then(() => showToast('Copied ' + hex));
    });

    // ---- Tools ----
    const toolBtns = document.querySelectorAll('.tool-btn');
    let currentTool = 'pen';

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            settings.tool = currentTool;
            canvas.style.cursor = currentTool === 'eraser' ? 'cell' : 'crosshair';
            if (currentTool === 'text') {
                enableTextTool();
            } else {
                disableTextTool();
            }
        });
    });
    // Set default active
    document.querySelector('[data-tool="pen"]')?.classList.add('active');

    // ---- Drawing state ----
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let currentPath = [];

    // ---- Layers ----
    let layers = [];
    let activeLayerIndex = 0;
    let layerIdCounter = 0;

    function createLayer(name = `Layer ${layers.length + 1}`) {
        const canvasEl = document.createElement('canvas');
        canvasEl.width = canvas.width;
        canvasEl.height = canvas.height;
        const layerCtx = canvasEl.getContext('2d');
        layerCtx.fillStyle = 'rgba(0,0,0,0)';
        layerCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        const layer = {
            id: layerIdCounter++,
            name: name,
            canvas: canvasEl,
            ctx: layerCtx,
            opacity: 100,
            visible: true,
            locked: false
        };
        return layer;
    }

    function initLayers() {
        layers = [];
        const bgLayer = createLayer('Background');
        bgLayer.ctx.fillStyle = '#ffffff';
        bgLayer.ctx.fillRect(0, 0, bgLayer.canvas.width, bgLayer.canvas.height);
        layers.push(bgLayer);
        const layer2 = createLayer('Layer 1');
        layers.push(layer2);
        activeLayerIndex = layers.length - 1;
        renderLayerList();
        renderAllLayers();
    }

    function getActiveLayer() {
        return layers[activeLayerIndex] || layers[0];
    }

    function renderAllLayers() {
        ctx.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
        layers.forEach(layer => {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity / 100;
                ctx.drawImage(layer.canvas, 0, 0, canvas.width / scale, canvas.height / scale);
            }
        });
        ctx.globalAlpha = 1;
        applySettings();
    }

    function renderLayerList() {
        const container = document.getElementById('layerList');
        container.innerHTML = '';
        layers.forEach((layer, index) => {
            const div = document.createElement('div');
            div.className = `layer-item ${index === activeLayerIndex ? 'active' : ''}`;
            div.innerHTML = `
                <span>${layer.name}</span>
                <input type="range" class="layer-opacity" min="0" max="100" value="${layer.opacity}">
                <button class="layer-vis-toggle text-[9px] bg-transparent hover:bg-[#4a4a54] px-1 rounded">${layer.visible ? '👁' : '🔒'}</button>
            `;
            div.addEventListener('click', (e) => {
                if (!e.target.closest('input') && !e.target.closest('button')) {
                    activeLayerIndex = index;
                    renderLayerList();
                }
            });
            const opacityInput = div.querySelector('.layer-opacity');
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
            container.appendChild(div);
        });
    }

    document.getElementById('addLayer').addEventListener('click', () => {
        const layer = createLayer(`Layer ${layers.length}`);
        layers.push(layer);
        activeLayerIndex = layers.length - 1;
        renderLayerList();
        renderAllLayers();
    });

    document.getElementById('removeLayer').addEventListener('click', () => {
        if (layers.length > 1) {
            layers.splice(activeLayerIndex, 1);
            if (activeLayerIndex >= layers.length) activeLayerIndex = layers.length - 1;
            renderLayerList();
            renderAllLayers();
        }
    });

    // ---- Drawing functions ----
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: (clientX - rect.left),
            y: (clientY - rect.top)
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        if (currentTool === 'text' || currentTool === 'fill' || currentTool === 'select' || currentTool === 'drag' || currentTool === 'transform') {
            handleToolAction(e);
            return;
        }
        isDrawing = true;
        const pos = getCoords(e);
        lastX = pos.x;
        lastY = pos.y;
        const layer = getActiveLayer();
        if (!layer || layer.locked) return;
        const lctx = layer.ctx;
        const size = settings.pressureEnabled ? Math.max(1, settings.size * (settings.pressure / 100)) : settings.size;
        lctx.beginPath();
        lctx.arc(lastX, lastY, size / 2, 0, Math.PI * 2);
        lctx.fillStyle = settings.color;
        lctx.globalAlpha = settings.opacity / 100;
        lctx.shadowBlur = settings.blur;
        lctx.shadowColor = settings.color;
        lctx.fill();
        lctx.beginPath();
        lctx.moveTo(lastX, lastY);
        lctx.strokeStyle = settings.color;
        lctx.lineWidth = size;
        lctx.globalAlpha = settings.opacity / 100;
        lctx.shadowBlur = settings.blur;
        lctx.shadowColor = settings.color;
        lctx.lineCap = 'round';
        lctx.lineJoin = 'round';
        currentPath = [{x: lastX, y: lastY}];
        renderAllLayers();
    }

    function drawStroke(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getCoords(e);
        const layer = getActiveLayer();
        if (!layer || layer.locked) return;
        const lctx = layer.ctx;
        const size = settings.pressureEnabled ? Math.max(1, settings.size * (settings.pressure / 100)) : settings.size;
        if (settings.gap > 0) {
            const dx = pos.x - lastX;
            const dy = pos.y - lastY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < settings.gap) return;
        }
        lctx.lineTo(pos.x, pos.y);
        lctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
        lctx.beginPath();
        lctx.moveTo(lastX, lastY);
        lctx.strokeStyle = settings.color;
        lctx.lineWidth = size;
        lctx.globalAlpha = settings.opacity / 100;
        lctx.shadowBlur = settings.blur;
        lctx.shadowColor = settings.color;
        currentPath.push({x: lastX, y: lastY});
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
    }

    // ---- Undo ----
    let strokeHistory = [];
    let historyIndex = -1;

    function saveStrokeState() {
        const state = layers.map(layer => {
            const data = layer.canvas.toDataURL();
            return { data, opacity: layer.opacity, visible: layer.visible };
        });
        strokeHistory = strokeHistory.slice(0, historyIndex + 1);
        strokeHistory.push(state);
        if (strokeHistory.length > 30) strokeHistory.shift();
        historyIndex = strokeHistory.length - 1;
    }

    function undoLastStroke() {
        if (historyIndex <= 0) return;
        historyIndex--;
        restoreState(strokeHistory[historyIndex]);
    }

    function redoStroke() {
        if (historyIndex >= strokeHistory.length - 1) return;
        historyIndex++;
        restoreState(strokeHistory[historyIndex]);
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

    // ---- Right-click undo ----
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        undoLastStroke();
    });

    // ---- Tool actions ----
    function handleToolAction(e) {
        const pos = getCoords(e);
        const layer = getActiveLayer();
        if (!layer || layer.locked) return;

        if (currentTool === 'fill') {
            // Flood fill
            const imageData = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
            const data = imageData.data;
            const w = layer.canvas.width;
            const h = layer.canvas.height;
            const x = Math.floor(pos.x);
            const y = Math.floor(pos.y);
            const idx = (y * w + x) * 4;
            const targetR = data[idx];
            const targetG = data[idx + 1];
            const targetB = data[idx + 2];
            const targetA = data[idx + 3];
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
                if (data[i] !== targetR || data[i+1] !== targetG || data[i+2] !== targetB || data[i+3] !== targetA) continue;
                visited.add(key);
                data[i] = fillR;
                data[i+1] = fillG;
                data[i+2] = fillB;
                data[i+3] = 255;
                stack.push({x: cx+1, y: cy});
                stack.push({x: cx-1, y: cy});
                stack.push({x: cx, y: cy+1});
                stack.push({x: cx, y: cy-1});
            }
            layer.ctx.putImageData(imageData, 0, 0);
            renderAllLayers();
            saveStrokeState();
        } else if (currentTool === 'text') {
            enableTextTool(pos);
        }
    }

    // ---- Text tool ----
    let textInput = null;

    function enableTextTool(pos = null) {
        disableTextTool();
        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'text-input-overlay';
        textInput.style.position = 'absolute';
        textInput.style.left = (pos?.x || 50) + 'px';
        textInput.style.top = (pos?.y || 50) + 'px';
        textInput.style.fontSize = settings.size + 16 + 'px';
        textInput.style.color = settings.color;
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
                        lctx.font = (settings.size + 16) + 'px system-ui, sans-serif';
                        lctx.fillStyle = settings.color;
                        lctx.globalAlpha = settings.opacity / 100;
                        lctx.shadowBlur = settings.blur;
                        lctx.shadowColor = settings.color;
                        const rect = textInput.getBoundingClientRect();
                        const canvasRect = canvas.getBoundingClientRect();
                        const x = rect.left - canvasRect.left;
                        const y = rect.top - canvasRect.top + parseInt(textInput.style.fontSize);
                        lctx.fillText(text, x, y);
                        renderAllLayers();
                        saveStrokeState();
                    }
                }
                disableTextTool();
            }
            if (e.key === 'Escape') disableTextTool();
        });
        textInput.addEventListener('blur', () => {
            setTimeout(disableTextTool, 300);
        });
    }

    function disableTextTool() {
        if (textInput && textInput.parentElement) {
            textInput.parentElement.removeChild(textInput);
        }
        textInput = null;
    }

    // ---- Templates ----
    const templates = {
        'Карандаш': { size: 4, opacity: 80, blur: 0, gap: 0, pressure: 100 },
        'Акварель': { size: 20, opacity: 40, blur: 8, gap: 2, pressure: 60 },
        'Масло': { size: 15, opacity: 85, blur: 3, gap: 1, pressure: 80 },
        'Пастель': { size: 12, opacity: 70, blur: 5, gap: 3, pressure: 70 },
        'Маркер': { size: 10, opacity: 90, blur: 0, gap: 0, pressure: 50 },
        'Каллиграфия': { size: 6, opacity: 100, blur: 0, gap: 0, pressure: 30 },
        'Штриховка': { size: 3, opacity: 60, blur: 0, gap: 4, pressure: 100 },
        'Аэрограф': { size: 25, opacity: 25, blur: 10, gap: 2, pressure: 40 }
    };

    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.textContent.trim();
            const template = templates[name];
            if (template) {
                sizeSlider.value = template.size;
                opacitySlider.value = template.opacity;
                blurSlider.value = template.blur;
                gapSlider.value = template.gap;
                pressureSlider.value = template.pressure;
                updateSettings();
                showToast('Loaded: ' + name);
            }
        });
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const name = btn.textContent.trim();
            templates[name] = {
                size: settings.size,
                opacity: settings.opacity,
                blur: settings.blur,
                gap: settings.gap,
                pressure: settings.pressure
            };
            showToast('Saved: ' + name);
        });
    });

    // ---- Preset numbers ----
    document.querySelectorAll('.preset-num').forEach((el, index) => {
        el.addEventListener('click', () => {
            const num = index + 1;
            const size = 4 + (num % 10);
            const hue = (num * 25) % 360;
            settings.size = Math.min(40, Math.max(2, size));
            currentColor.h = hue;
            currentColor.s = 75 + (num % 25);
            currentColor.l = 50 + (num % 30);
            sizeSlider.value = settings.size;
            updateColorUI();
            updateSettings();
            el.style.borderColor = '#8888ff';
            setTimeout(() => { el.style.borderColor = '#3d3d48'; }, 300);
            addColorToHistory('#' + getColorHex());
        });
        let holdTimer = null;
        el.addEventListener('mousedown', () => {
            holdTimer = setTimeout(() => {
                const num = index + 1;
                const size = 4 + (num % 10);
                const hue = (num * 25) % 360;
                settings.size = Math.min(40, Math.max(2, size));
                currentColor.h = hue;
                currentColor.s = 75 + (num % 25);
                currentColor.l = 50 + (num % 30);
                sizeSlider.value = settings.size;
                updateColorUI();
                updateSettings();
                el.style.borderColor = '#ffaa44';
                setTimeout(() => { el.style.borderColor = '#3d3d48'; }, 500);
                showToast('Preset ' + num + ' loaded');
            }, 600);
        });
        el.addEventListener('mouseup', () => { clearTimeout(holdTimer); });
        el.addEventListener('mouseleave', () => { clearTimeout(holdTimer); });
    });

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

    // ---- Events ----
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawStroke);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawStroke, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // ---- Keyboard shortcuts ----
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undoLastStroke(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redoStroke(); }
        if (e.key === 'Escape') disableTextTool();
    });

    // ---- Init ----
    function init() {
        resizeCanvas();
        initLayers();
        updateColorUI();
        updateSettings();
        renderColorHistory();
        // Initial save state
        saveStrokeState();

        window.addEventListener('resize', () => {
            // Save current layers data
            const layerData = layers.map(l => l.canvas.toDataURL());
            resizeCanvas();
            // Restore layers with new size
            layers.forEach((layer, i) => {
                const newCanvas = document.createElement('canvas');
                newCanvas.width = canvas.width;
                newCanvas.height = canvas.height;
                const newCtx = newCanvas.getContext('2d');
                if (i < layerData.length) {
                    const img = new Image();
                    img.onload = () => {
                        newCtx.drawImage(img, 0, 0, canvas.width / scale, canvas.height / scale);
                    };
                    img.src = layerData[i];
                }
                layer.canvas = newCanvas;
                layer.ctx = newCtx;
            });
            renderAllLayers();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
