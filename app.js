// app.js – Full interactive drawing app with exact sidebar replica

(function() {
    // ---- DOM refs ----
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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        applySettings();
    }

    // ---- Settings ----
    const settings = {
        size: 8,
        opacity: 100,
        blur: 0,
        smooth: 0,
        spacing: 0,
        pressure: 100,
        color: '#000000',
        tool: 'brush'
    };

    // ---- Range controls ----
    const rangePairs = [
        ['sizeRange', 'sizeValue'],
        ['opacityRange', 'opacityValue'],
        ['blurRange', 'blurValue'],
        ['smoothRange', 'smoothValue'],
        ['spacingRange', 'spacingValue'],
        ['textSizeRange', 'textSizeValue'],
        ['textOpacityRange', 'textOpacityValue'],
        ['genericSizeRange', 'genericSizeValue'],
        ['genericOpacityRange', 'genericOpacityValue']
    ];

    function updateRange(range, output) {
        output.textContent = range.value;
    }

    rangePairs.forEach(([a, b]) => {
        const r = document.getElementById(a);
        const o = document.getElementById(b);
        if (r && o) {
            r.addEventListener('input', () => {
                updateRange(r, o);
                updateSettings();
            });
        }
    });

    // ---- Update settings from UI ----
    function updateSettings() {
        const sizeEl = document.getElementById('sizeRange');
        const opacityEl = document.getElementById('opacityRange');
        const blurEl = document.getElementById('blurRange');
        const smoothEl = document.getElementById('smoothRange');
        const spacingEl = document.getElementById('spacingRange');

        if (sizeEl) settings.size = parseInt(sizeEl.value);
        if (opacityEl) settings.opacity = parseInt(opacityEl.value);
        if (blurEl) settings.blur = parseInt(blurEl.value);
        if (smoothEl) settings.smooth = parseInt(smoothEl.value);
        if (spacingEl) settings.spacing = parseInt(spacingEl.value);

        settings.color = getFgColor();
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

    // ---- Color ----
    function getFgColor() {
        const fg = document.getElementById('fgColor');
        return fg ? fg.style.background || '#000000' : '#000000';
    }

    // ---- Drawing state ----
    let isDrawing = false;
    let lastX = 0,
        lastY = 0;

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
    }

    function drawStroke(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getCoords(e);

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
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            saveState();
        }
    }

    // ---- Undo ----
    let history = [];
    let historyIndex = -1;

    function saveState() {
        const data = canvas.toDataURL();
        history = history.slice(0, historyIndex + 1);
        history.push(data);
        if (history.length > 30) history.shift();
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

    // ---- Events ----
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawStroke);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawStroke, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        undo();
    });

    // ---- Keyboard shortcuts ----
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault();
            undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault();
            redo(); }
        if (e.key === 'b') document.querySelector('[data-tab="brush"]')?.click();
        if (e.key === 'e') document.querySelector('[data-tab="eraser"]')?.click();
        if (e.key === 't') document.querySelector('[data-tab="text"]')?.click();
        if (e.key === 'p') document.querySelector('[data-tab="pencil"]')?.click();
    });

    // ---- Tool tabs ----
    const brushLike = ['brush', 'brush2', 'eraser', 'pencil'];
    const textLike = ['text'];

    document.querySelectorAll('.tool-button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-button').forEach(x => x.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            const title = document.getElementById('settingsTitle');
            const brush = document.getElementById('brushControls');
            const text = document.getElementById('textControls');
            const generic = document.getElementById('genericControls');

            settings.tool = tab;

            if (textLike.includes(tab)) {
                if (title) title.textContent = 'НАСТРОЙКИ ИНСТРУМЕНТА';
                if (brush) brush.classList.add('hidden');
                if (generic) generic.classList.add('hidden');
                if (text) text.classList.remove('hidden');
                canvas.style.cursor = 'text';
                enableTextTool();
            } else if (brushLike.includes(tab)) {
                if (title) title.textContent = 'НАСТРОЙКИ ИНСТРУМЕНТА';
                if (text) text.classList.add('hidden');
                if (generic) generic.classList.add('hidden');
                if (brush) brush.classList.remove('hidden');
                canvas.style.cursor = tab === 'eraser' ? 'cell' : 'crosshair';
                disableTextTool();

                if (tab === 'eraser') {
                    document.getElementById('sizeRange').value = 24;
                    document.getElementById('opacityRange').value = 100;
                    updateRange(document.getElementById('sizeRange'), document.getElementById('sizeValue'));
                    updateRange(document.getElementById('opacityRange'), document.getElementById('opacityValue'));
                    settings.color = '#ffffff';
                } else if (tab === 'pencil') {
                    document.getElementById('sizeRange').value = 4;
                    document.getElementById('opacityRange').value = 100;
                    updateRange(document.getElementById('sizeRange'), document.getElementById('sizeValue'));
                    updateRange(document.getElementById('opacityRange'), document.getElementById('opacityValue'));
                    settings.color = getFgColor();
                } else {
                    settings.color = getFgColor();
                }
                updateSettings();
            } else {
                if (title) title.textContent = 'НАСТРОЙКИ ИНСТРУМЕНТА';
                if (brush) brush.classList.add('hidden');
                if (text) text.classList.add('hidden');
                if (generic) generic.classList.remove('hidden');
                canvas.style.cursor = 'crosshair';
                disableTextTool();
                settings.color = getFgColor();
                updateSettings();
            }
        });
    });

    // ---- Text tool ----
    let textInput = null;

    function enableTextTool() {
        disableTextTool();
        textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'text-input-overlay';
        textInput.style.position = 'absolute';
        textInput.style.left = '50px';
        textInput.style.top = '50px';
        textInput.style.fontSize = '24px';
        textInput.style.color = settings.color;
        textInput.style.background = 'rgba(255,255,255,0.9)';
        textInput.style.border = '1px dashed #4a8aff';
        textInput.style.outline = 'none';
        textInput.style.padding = '4px 8px';
        textInput.style.borderRadius = '4px';
        textInput.style.zIndex = '20';
        textInput.placeholder = 'Type text...';
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(textInput);
        textInput.focus();

        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = textInput.value;
                if (text) {
                    const rect = textInput.getBoundingClientRect();
                    const canvasRect = canvas.getBoundingClientRect();
                    const x = rect.left - canvasRect.left;
                    const y = rect.top - canvasRect.top + 24;
                    const size = parseInt(document.getElementById('textSizeRange')?.value || 24);
                    ctx.font = size + 'px ' + (document.getElementById('fontSelect')?.value || 'Arial');
                    ctx.fillStyle = settings.color;
                    ctx.globalAlpha = settings.opacity / 100;
                    ctx.fillText(text, x, y);
                    saveState();
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

    // ---- Presets ----
    const presetGrid = document.getElementById('presetGrid');
    if (presetGrid) {
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
            const b = document.createElement('button');
            b.className = 'preset ' + ([5, 8].includes(i) ? 'black' : '');
            b.textContent = i;
            b.dataset.preset = i;
            b.addEventListener('click', () => {
                document.querySelectorAll('.preset').forEach(x => x.classList.remove('selected'));
                b.classList.add('selected');
                const [size, opacity] = presetValues[i] || [8, 100];
                const sizeRange = document.getElementById('sizeRange');
                const opacityRange = document.getElementById('opacityRange');
                if (sizeRange) {
                    sizeRange.value = size;
                    updateRange(sizeRange, document.getElementById('sizeValue'));
                }
                if (opacityRange) {
                    opacityRange.value = opacity;
                    updateRange(opacityRange, document.getElementById('opacityValue'));
                }
                updateSettings();
            });
            // Hold to set preset (Удерживайте для установки)
            let holdTimer = null;
            b.addEventListener('mousedown', () => {
                holdTimer = setTimeout(() => {
                    const [size, opacity] = presetValues[i] || [8, 100];
                    const sizeRange = document.getElementById('sizeRange');
                    const opacityRange = document.getElementById('opacityRange');
                    if (sizeRange) {
                        sizeRange.value = size;
                        updateRange(sizeRange, document.getElementById('sizeValue'));
                    }
                    if (opacityRange) {
                        opacityRange.value = opacity;
                        updateRange(opacityRange, document.getElementById('opacityValue'));
                    }
                    updateSettings();
                    b.style.borderColor = '#ffaa44';
                    setTimeout(() => { b.style.borderColor = '#bfc0c4'; }, 500);
                }, 600);
            });
            b.addEventListener('mouseup', () => { clearTimeout(holdTimer); });
            b.addEventListener('mouseleave', () => { clearTimeout(holdTimer); });
            presetGrid.appendChild(b);
        }
        // Select preset 5 by default
        const defaultPreset = presetGrid.querySelector('[data-preset="5"]');
        if (defaultPreset) defaultPreset.classList.add('selected');
    }

    // ---- Color wheel ----
    const wheel = document.getElementById('colorWheel');
    const handle = document.getElementById('wheelHandle');
    const fg = document.getElementById('fgColor');
    const bg = document.getElementById('bgColor');
    const hiddenColor = document.getElementById('hiddenColor');

    function hueToColor(deg) {
        return `hsl(${deg}, 100%, 50%)`;
    }

    function moveWheel(e) {
        if (!wheel) return;
        const rect = wheel.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left - rect.width / 2;
        const y = clientY - rect.top - rect.height / 2;
        let angle = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
        const r = Math.min(rect.width * .43, Math.sqrt(x * x + y * y));
        const rad = (angle - 90) * Math.PI / 180;
        const px = rect.width / 2 + Math.cos(rad) * r;
        const py = rect.height / 2 + Math.sin(rad) * r;
        if (handle) {
            handle.style.left = `${px/rect.width*100 - 4.2}%`;
            handle.style.top = `${py/rect.height*100 - 4.2}%`;
        }
        const c = hueToColor(angle);
        if (fg) fg.style.background = c;
        if (hiddenColor) hiddenColor.value = rgbToHex(c);
        settings.color = c;
        applySettings();
    }

    if (wheel) {
        wheel.addEventListener('click', moveWheel);
        let dragging = false;
        if (handle) {
            handle.addEventListener('pointerdown', () => { dragging = true;
                handle.setPointerCapture(event.pointerId); });
            window.addEventListener('pointerup', () => dragging = false);
            wheel.addEventListener('pointermove', e => { if (dragging) moveWheel(e); });
        }
    }

    if (hiddenColor) {
        hiddenColor.addEventListener('input', e => {
            if (fg) fg.style.background = e.target.value;
            settings.color = e.target.value;
            applySettings();
        });
    }

    const swapBtn = document.getElementById('swapColors');
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            if (fg && bg) {
                const a = fg.style.background,
                    b = bg.style.background;
                fg.style.background = b;
                bg.style.background = a;
                settings.color = b;
                applySettings();
            }
        });
    }

    function rgbToHex(hsl) {
        const m = hsl.match(/hsl\(([-\d.]+),\s*100%,\s*50%\)/);
        if (!m) return '#ff3000';
        let h = (+m[1] % 360 + 360) % 360,
            s = 1,
            l = .5;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const mm = l - c / 2;
        let r = 0,
            g = 0,
            b = 0;
        if (h < 60) { r = c;
            g = x } else if (h < 120) { r = x;
            g = c } else if (h < 180) { g = c;
            b = x } else if (h < 240) { g = x;
            b = c } else if (h < 300) { r = x;
            b = c } else { r = c;
            b = x }
        return '#' + [r, g, b].map(v => Math.round((v + mm) * 255).toString(16).padStart(2, '0')).join('');
    }

    // ---- Layers ----
    const layersList = document.getElementById('layersList');
    const newLayerBtn = document.getElementById('newLayer');

    if (newLayerBtn) {
        newLayerBtn.addEventListener('click', () => {
            if (!layersList) return;
            const count = layersList.children.length + 1;
            const layer = document.createElement('div');
            layer.className = 'layer';
            layer.innerHTML = `
                <div class="layer-thumb"></div>
                <div class="layer-number">${count + 2}</div>
                <i class="layer-icon" data-lucide="eye"></i>
                <i class="layer-icon" data-lucide="lock"></i>
            `;
            layersList.prepend(layer);
            lucide.createIcons();
            // Add click handlers for eye and lock icons
            layer.querySelectorAll('.layer-icon').forEach(icon => {
                icon.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (this.getAttribute('data-lucide') === 'eye') {
                        this.style.opacity = this.style.opacity === '0.3' ? '1' : '0.3';
                    } else if (this.getAttribute('data-lucide') === 'lock') {
                        this.style.opacity = this.style.opacity === '0.3' ? '1' : '0.3';
                    }
                });
            });
        });
    }

    // ---- Collapsible sections ----
    document.querySelectorAll('[data-collapse]').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = document.getElementById(btn.dataset.collapse);
            if (section) section.classList.toggle('closed');
        });
    });

    // ---- Init ----
    function init() {
        resizeCanvas();
        updateSettings();
        // Save initial state
        setTimeout(saveState, 100);

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

        // Trigger initial tool selection
        const activeTool = document.querySelector('.tool-button.active');
        if (activeTool) activeTool.click();

        lucide.createIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
