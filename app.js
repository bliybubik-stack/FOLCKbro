// app.js – FlockMod drawing app with full sidebar functionality

(function() {
    // ---- DOM Refs ----
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');

    // ---- Canvas sizing ----
    function resizeCanvas() {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        applySettings();
    }

    // ---- Tool settings ----
    const settings = {
        tool: 'brush',
        size: 8,
        opacity: 100,
        blur: 0,
        smoothing: 0,
        spacing: 0,
        pressure: 100,
        color: '#ff3366',
        bgColor: '#ffffff',
        font: 'Rubik',
        rightClick: 'Next font',
        textSize: 24,
        textOpacity: 100
    };

    // ---- Color state ----
    let currentColor = '#ff3366';
    let backgroundColor = '#ffffff';

    // ---- DOM refs for controls ----
    const sizeRange = document.getElementById('sizeRange');
    const opacityRange = document.getElementById('opacityRange');
    const blurRange = document.getElementById('blurRange');
    const smoothRange = document.getElementById('smoothRange');
    const spacingRange = document.getElementById('spacingRange');
    const sizeValue = document.getElementById('sizeValue');
    const opacityValue = document.getElementById('opacityValue');
    const blurValue = document.getElementById('blurValue');
    const smoothValue = document.getElementById('smoothValue');
    const spacingValue = document.getElementById('spacingValue');

    const textSizeRange = document.getElementById('textSizeRange');
    const textOpacityRange = document.getElementById('textOpacityRange');
    const textSizeValue = document.getElementById('textSizeValue');
    const textOpacityValue = document.getElementById('textOpacityValue');
    const fontSelect = document.getElementById('fontSelect');
    const rightClickSelect = document.getElementById('rightClickSelect');

    const genericSizeRange = document.getElementById('genericSizeRange');
    const genericOpacityRange = document.getElementById('genericOpacityRange');
    const genericSizeValue = document.getElementById('genericSizeValue');
    const genericOpacityValue = document.getElementById('genericOpacityValue');

    const fgColor = document.getElementById('fgColor');
    const bgColor = document.getElementById('bgColor');
    const hiddenColor = document.getElementById('hiddenColor');
    const swapColors = document.getElementById('swapColors');
    const colorWheel = document.getElementById('colorWheel');
    const wheelHandle = document.getElementById('wheelHandle');

    // ---- Update functions ----
    function updateSettings() {
        settings.size = parseInt(sizeRange.value);
        settings.opacity = parseInt(opacityRange.value);
        settings.blur = parseInt(blurRange.value);
        settings.smoothing = parseInt(smoothRange.value);
        settings.spacing = parseInt(spacingRange.value);
        settings.color = currentColor;
        settings.bgColor = backgroundColor;
        settings.font = fontSelect.value;
        settings.rightClick = rightClickSelect.value;
        settings.textSize = parseInt(textSizeRange.value);
        settings.textOpacity = parseInt(textOpacityRange.value);

        sizeValue.textContent = settings.size;
        opacityValue.textContent = settings.opacity;
        blurValue.textContent = settings.blur;
        smoothValue.textContent = settings.smoothing;
        spacingValue.textContent = settings.spacing;
        textSizeValue.textContent = settings.textSize;
        textOpacityValue.textContent = settings.textOpacity;
        genericSizeValue.textContent = genericSizeRange.value;
        genericOpacityValue.textContent = genericOpacityRange.value;

        applySettings();
    }

    function applySettings() {
        ctx.globalAlpha = settings.opacity / 100;
        ctx.lineWidth = settings.size;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.strokeStyle = settings.color;
        ctx.fillStyle = settings.color;
        ctx.font = `${settings.textSize}px ${settings.font}, system-ui, sans-serif`;
    }

    // ---- Range inputs ----
    function setupRange(range, display) {
        range.addEventListener('input', () => {
            display.textContent = range.value;
            updateSettings();
        });
    }

    setupRange(sizeRange, sizeValue);
    setupRange(opacityRange, opacityValue);
    setupRange(blurRange, blurValue);
    setupRange(smoothRange, smoothValue);
    setupRange(spacingRange, spacingValue);
    setupRange(textSizeRange, textSizeValue);
    setupRange(textOpacityRange, textOpacityValue);
    setupRange(genericSizeRange, genericSizeValue);
    setupRange(genericOpacityRange, genericOpacityValue);

    // ---- Tool buttons ----
    const brushLike = ['brush', 'brush2', 'eraser', 'pencil'];
    const textLike = ['text'];

    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            settings.tool = tab;

            const brush = document.getElementById('brushControls');
            const text = document.getElementById('textControls');
            const generic = document.getElementById('genericControls');

            if (textLike.includes(tab)) {
                brush.classList.add('hidden');
                generic.classList.add('hidden');
                text.classList.remove('hidden');
                canvas.style.cursor = 'text';
            } else if (brushLike.includes(tab)) {
                text.classList.add('hidden');
                generic.classList.add('hidden');
                brush.classList.remove('hidden');
                canvas.style.cursor = 'crosshair';
                if (tab === 'eraser') {
                    sizeRange.value = 24;
                    sizeValue.textContent = '24';
                    updateSettings();
                }
                if (tab === 'pencil') {
                    sizeRange.value = 4;
                    sizeValue.textContent = '4';
                    updateSettings();
                }
            } else {
                brush.classList.add('hidden');
                text.classList.add('hidden');
                generic.classList.remove('hidden');
                canvas.style.cursor = 'default';
            }

            // Disable text tool if active
            if (tab !== 'text') disableTextTool();
        });
    });

    // ---- Drawing state ----
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let currentPath = [];

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        if (settings.tool === 'text') {
            enableTextTool(e);
            return;
        }
        if (settings.tool === 'fill') {
            floodFill(e);
            return;
        }
        isDrawing = true;
        const pos = getCoords(e);
        lastX = pos.x;
        lastY = pos.y;

        ctx.beginPath();
        ctx.arc(lastX, lastY, settings.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = settings.color;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = settings.size;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        currentPath = [{ x: lastX, y: lastY }];
        saveState();
    }

    function drawStroke(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getCoords(e);

        // Spacing
        if (settings.spacing > 0) {
            const dx = pos.x - lastX;
            const dy = pos.y - lastY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < settings.spacing) return;
        }

        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = settings.size;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;

        currentPath.push({ x: lastX, y: lastY });
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            saveState();
        }
    }

    // ---- Flood Fill ----
    function floodFill(e) {
        const pos = getCoords(e);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);

        const idx = (y * w + x) * 4;
        const targetR = data[idx];
        const targetG = data[idx + 1];
        const targetB = data[idx + 2];
        const targetA = data[idx + 3];

        // Parse current color
        const tempCtx = document.createElement('canvas').getContext('2d');
        tempCtx.fillStyle = settings.color;
        const colorHex = tempCtx.fillStyle;
        const fillR = parseInt(colorHex.slice(1, 3), 16);
        const fillG = parseInt(colorHex.slice(3, 5), 16);
        const fillB = parseInt(colorHex.slice(5, 7), 16);

        if (targetR === fillR && targetG === fillG && targetB === fillB) return;

        const stack = [{ x, y }];
        const visited = new Set();

        while (stack.length > 0) {
            const { x: cx, y: cy } = stack.pop();
            const key = cx + ',' + cy;
            if (visited.has(key)) continue;
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            const i = (cy * w + cx) * 4;
            if (data[i] !== targetR || data[i + 1] !== targetG || data[i + 2] !== targetB || data[i + 3] !== targetA) continue;
            visited.add(key);
            data[i] = fillR;
            data[i + 1] = fillG;
            data[i + 2] = fillB;
            data[i + 3] = 255;
            stack.push({ x: cx + 1, y: cy });
            stack.push({ x: cx - 1, y: cy });
            stack.push({ x: cx, y: cy + 1 });
            stack.push({ x: cx, y: cy - 1 });
        }

        ctx.putImageData(imageData, 0, 0);
        saveState();
    }

    // ---- Text Tool ----
    let textInput = null;
    let textPos = { x: 0, y: 0 };

    function enableTextTool(e) {
        disableTextTool();
        const pos = getCoords(e);
        textPos = pos;

        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'text-input-overlay';
        textInput.style.position = 'absolute';
        textInput.style.left = pos.x + 'px';
        textInput.style.top = pos.y + 'px';
        textInput.style.fontSize = settings.textSize + 'px';
        textInput.style.fontFamily = settings.font;
        textInput.style.color = settings.color;
        textInput.style.background = 'rgba(255,255,255,0.9)';
        textInput.style.border = '1px dashed #4a8aff';
        textInput.style.outline = 'none';
        textInput.style.padding = '2px 6px';
        textInput.style.minWidth = '20px';
        textInput.style.zIndex = '20';
        textInput.style.borderRadius = '2px';
        textInput.placeholder = 'Type...';

        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(textInput);
        textInput.focus();

        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = textInput.value;
                if (text) {
                    ctx.font = `${settings.textSize}px ${settings.font}, system-ui, sans-serif`;
                    ctx.fillStyle = settings.color;
                    ctx.globalAlpha = settings.textOpacity / 100;
                    ctx.shadowBlur = settings.blur;
                    ctx.shadowColor = settings.color;
                    ctx.fillText(text, textPos.x, textPos.y + settings.textSize);
                    saveState();
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
    let history = [];
    let historyIndex = -1;
    const MAX_HISTORY = 30;

    function saveState() {
        const data = canvas.toDataURL();
        history = history.slice(0, historyIndex + 1);
        history.push(data);
        if (history.length > MAX_HISTORY) history.shift();
        historyIndex = history.length - 1;
    }

    function undo() {
        if (historyIndex <= 0) return;
        historyIndex--;
        restoreState(history[historyIndex]);
    }

    function redo() {
        if (historyIndex >= history.length - 1) return;
        historyIndex++;
        restoreState(history[historyIndex]);
    }

    function restoreState(data) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            applySettings();
        };
        img.src = data;
    }

    // ---- Right-click (undo) ----
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        undo();
    });

    // ---- Canvas events ----
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
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        }
        if (e.key === 'Escape') disableTextTool();

        // Tool shortcuts
        const shortcuts = {
            'b': 'brush',
            'e': 'eraser',
            't': 'text',
            'p': 'pencil',
            'f': 'fill',
            'h': 'hand',
            'r': 'rectangle',
            'o': 'ellipse'
        };
        if (e.key in shortcuts) {
            const btn = document.querySelector(`[data-tab="${shortcuts[e.key]}"]`);
            if (btn) btn.click();
        }
    });

    // ---- Color Wheel ----
    let wheelDragging = false;

    function getWheelPos(e) {
        const rect = colorWheel.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        const x = clientX - rect.left - rect.width / 2;
        const y = clientY - rect.top - rect.height / 2;
        const angle = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
        const dist = Math.sqrt(x * x + y * y);
        const maxDist = rect.width * 0.43;
        const r = Math.min(dist, maxDist);
        return { angle, r, rect, x, y };
    }

    function updateWheelHandle(e) {
        const pos = getWheelPos(e);
        const rect = pos.rect;
        const angleRad = (pos.angle - 90) * Math.PI / 180;
        const px = rect.width / 2 + Math.cos(angleRad) * pos.r;
        const py = rect.height / 2 + Math.sin(angleRad) * pos.r;
        wheelHandle.style.left = `${(px / rect.width) * 100 - 4.5}%`;
        wheelHandle.style.top = `${(py / rect.height) * 100 - 4.5}%`;

        // Convert angle to HSL
        const hue = pos.angle;
        const color = `hsl(${hue}, 80%, 55%)`;
        currentColor = color;
        fgColor.style.background = color;
        hiddenColor.value = colorToHex(color);
        settings.color = color;
        applySettings();
        updateSettings();
    }

    function colorToHex(color) {
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        const computed = getComputedStyle(temp).color;
        document.body.removeChild(temp);
        const match = computed.match(/\d+/g);
        if (match) {
            return '#' + match.map(Number).slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
        }
        return '#ff3366';
    }

    colorWheel.addEventListener('mousedown', (e) => {
        wheelDragging = true;
        updateWheelHandle(e);
    });
    colorWheel.addEventListener('mousemove', (e) => {
        if (wheelDragging) updateWheelHandle(e);
    });
    colorWheel.addEventListener('mouseup', () => { wheelDragging = false; });
    colorWheel.addEventListener('mouseleave', () => { wheelDragging = false; });
    colorWheel.addEventListener('touchstart', (e) => {
        wheelDragging = true;
        updateWheelHandle(e);
    }, { passive: false });
    colorWheel.addEventListener('touchmove', (e) => {
        if (wheelDragging) updateWheelHandle(e);
    }, { passive: false });
    colorWheel.addEventListener('touchend', () => { wheelDragging = false; });

    // ---- Hidden color input ----
    hiddenColor.addEventListener('input', (e) => {
        currentColor = e.target.value;
        fgColor.style.background = currentColor;
        settings.color = currentColor;
        applySettings();
        updateSettings();
    });

    // ---- Swap colors ----
    swapColors.addEventListener('click', () => {
        const fg = fgColor.style.background;
        const bg = bgColor.style.background;
        fgColor.style.background = bg;
        bgColor.style.background = fg;
        currentColor = fgColor.style.background;
        settings.color = currentColor;
        applySettings();
        updateSettings();
    });

    // ---- Presets ----
    const presetGrid = document.getElementById('presetGrid');
    const presetValues = {
        1: [4, 100],
        2: [6, 100],
        3: [8, 100],
        4: [12, 100],
        5: [16, 100],
        6: [20, 90],
        7: [24, 90],
        8: [30, 80],
        9: [36, 80],
        10: [45, 75],
        11: [50, 75],
        12: [55, 70],
        13: [60, 65],
        14: [65, 60],
        15: [70, 55],
        16: [75, 50],
        17: [85, 45],
        18: [100, 40]
    };

    for (let i = 1; i <= 18; i++) {
        const btn = document.createElement('button');
        btn.className = 'preset' + ([5, 8].includes(i) ? ' black' : '');
        btn.textContent = i;
        btn.dataset.preset = i;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset').forEach(p => p.classList.remove('selected'));
            btn.classList.add('selected');
            const [size, opacity] = presetValues[i] || [8, 100];
            sizeRange.value = size;
            opacityRange.value = opacity;
            sizeValue.textContent = size;
            opacityValue.textContent = opacity;
            updateSettings();
        });

        // Hold to set
        let holdTimer = null;
        btn.addEventListener('mousedown', () => {
            holdTimer = setTimeout(() => {
                const [size, opacity] = presetValues[i] || [8, 100];
                sizeRange.value = size;
                opacityRange.value = opacity;
                sizeValue.textContent = size;
                opacityValue.textContent = opacity;
                updateSettings();
                btn.style.borderColor = '#ffaa44';
                setTimeout(() => { btn.style.borderColor = '#bfc0c4'; }, 400);
            }, 600);
        });
        btn.addEventListener('mouseup', () => { clearTimeout(holdTimer); });
        btn.addEventListener('mouseleave', () => { clearTimeout(holdTimer); });

        presetGrid.appendChild(btn);
    }

    // ---- Layers ----
    let layerCount = 1;
    document.getElementById('newLayer').addEventListener('click', () => {
        layerCount++;
        const list = document.getElementById('layersList');
        const layer = document.createElement('div');
        layer.className = 'layer';
        layer.innerHTML = `
            <div class="layer-thumb"></div>
            <div class="layer-number">${layerCount}</div>
            <i class="layer-icon" data-lucide="eye" size="16"></i>
            <i class="layer-icon" data-lucide="lock" size="16"></i>
        `;
        list.prepend(layer);
        // Re-init icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });

    // ---- Collapsible sections ----
    document.querySelectorAll('[data-collapse]').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = document.getElementById(btn.dataset.collapse);
            section.classList.toggle('closed');
        });
    });

    // ---- Init ----
    function init() {
        resizeCanvas();
        applySettings();
        updateSettings();
        saveState();

        // Set initial color
        currentColor = '#ff3366';
        fgColor.style.background = currentColor;
        hiddenColor.value = currentColor;
        settings.color = currentColor;
        applySettings();

        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        window.addEventListener('resize', () => {
            const data = canvas.toDataURL();
            resizeCanvas();
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                applySettings();
            };
            img.src = data;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
