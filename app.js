// app.js – FlockMod drawing app with text tool

(function() {
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    const canvasContainer = document.getElementById('canvasContainer');
    const textOverlay = document.getElementById('textOverlay');
    const textFrame = document.getElementById('textFrame');
    const textDisplay = document.getElementById('textDisplay');

    // ---- canvas sizing ----
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        applySettings();
    }

    // ---- settings (exact from screenshot) ----
    const settings = {
        size: 8,
        opacity: 100,
        blur: 0,
        smoothing: 0,
        gap: 0,
        pressure: 100,
        color: '#ffffff',
        cursor: 'Круг'
    };

    // ---- DOM refs for display ----
    const sizeDisplay = document.getElementById('sizeDisplay');
    const opacityDisplay = document.getElementById('opacityDisplay');
    const blurDisplay = document.getElementById('blurDisplay');
    const smoothDisplay = document.getElementById('smoothDisplay');
    const gapDisplay = document.getElementById('gapDisplay');
    const pressureDisplay = document.getElementById('pressureDisplay');

    function updateDisplays() {
        if (sizeDisplay) sizeDisplay.textContent = settings.size;
        if (opacityDisplay) opacityDisplay.textContent = settings.opacity;
        if (blurDisplay) blurDisplay.textContent = settings.blur;
        if (smoothDisplay) smoothDisplay.textContent = settings.smoothing;
        if (gapDisplay) gapDisplay.textContent = settings.gap;
        if (pressureDisplay) pressureDisplay.textContent = settings.pressure;
    }

    function applySettings() {
        ctx.globalAlpha = settings.opacity / 100;
        ctx.lineWidth = settings.size;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.strokeStyle = settings.color;
        ctx.fillStyle = settings.color;
    }

    // ---- text tool state ----
    let textToolActive = false;
    let textPlaced = false;
    let textFrameX = 0;
    let textFrameY = 0;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // ---- activate/deactivate text tool ----
    function activateTextTool() {
        textToolActive = true;
        textPlaced = false;
        textOverlay.classList.remove('hidden');
        textFrame.style.display = 'block';
        textFrame.style.left = '50%';
        textFrame.style.top = '50%';
        textFrame.style.transform = 'translate(-50%, -50%)';
        textDisplay.textContent = 'Type something';
        textDisplay.contentEditable = false;
        textDisplay.style.color = settings.color;
        textDisplay.style.fontSize = Math.max(12, settings.size * 2) + 'px';
        canvas.style.cursor = 'text';
        textFrame.style.cursor = 'move';
        textOverlay.style.pointerEvents = 'auto';
        textFrame.style.pointerEvents = 'auto';
        textDisplay.style.pointerEvents = 'none';
    }

    function deactivateTextTool() {
        textToolActive = false;
        textPlaced = false;
        textOverlay.classList.add('hidden');
        textFrame.style.display = 'none';
        canvas.style.cursor = 'crosshair';
        textOverlay.style.pointerEvents = 'none';
        textFrame.style.pointerEvents = 'none';
        textDisplay.contentEditable = false;
    }

    // ---- text button (using right-click "Следующий шрифт" - we'll use a simple toggle) ----
    // We'll add a hidden text toggle via a keyboard shortcut or we can add a small button
    // For now, we'll use the preset system to trigger text mode (click on preset 18 triggers text)
    document.querySelectorAll('#sidebar .grid span').forEach((cell, index) => {
        if (index === 17) { // preset 18
            cell.addEventListener('click', function(e) {
                if (!textToolActive) {
                    activateTextTool();
                    this.style.borderColor = '#ffaa44';
                    setTimeout(() => { this.style.borderColor = '#3d3d48'; }, 400);
                } else {
                    deactivateTextTool();
                }
            });
        }
    });

    // ---- click on canvas to place text ----
    canvas.addEventListener('click', function(e) {
        if (textToolActive && !textPlaced) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            textFrame.style.left = x + 'px';
            textFrame.style.top = y + 'px';
            textFrame.style.transform = 'none';
            textFrameX = x;
            textFrameY = y;
            textPlaced = true;
            textFrame.style.cursor = 'move';
            textDisplay.contentEditable = true;
            textDisplay.focus();
            textDisplay.select();
            textOverlay.style.pointerEvents = 'none';
            textFrame.style.pointerEvents = 'auto';
            textDisplay.style.pointerEvents = 'auto';
            
            textFrame.addEventListener('mousedown', startDrag);
            textFrame.addEventListener('touchstart', startDragTouch, { passive: false });
        }
    });

    // ---- drag functions ----
    function startDrag(e) {
        if (!textPlaced) return;
        isDragging = true;
        const rect = textFrame.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        e.preventDefault();
    }

    function startDragTouch(e) {
        if (!textPlaced) return;
        const touch = e.touches[0];
        const rect = textFrame.getBoundingClientRect();
        dragOffsetX = touch.clientX - rect.left;
        dragOffsetY = touch.clientY - rect.top;
        document.addEventListener('touchmove', onDragTouch, { passive: false });
        document.addEventListener('touchend', stopDragTouch);
        e.preventDefault();
    }

    function onDrag(e) {
        if (!isDragging) return;
        const containerRect = canvasContainer.getBoundingClientRect();
        let x = e.clientX - containerRect.left - dragOffsetX;
        let y = e.clientY - containerRect.top - dragOffsetY;
        x = Math.max(0, Math.min(x, containerRect.width - textFrame.offsetWidth));
        y = Math.max(0, Math.min(y, containerRect.height - textFrame.offsetHeight));
        textFrame.style.left = x + 'px';
        textFrame.style.top = y + 'px';
        textFrame.style.transform = 'none';
        textFrameX = x;
        textFrameY = y;
    }

    function onDragTouch(e) {
        if (!isDragging) return;
        const touch = e.touches[0];
        const containerRect = canvasContainer.getBoundingClientRect();
        let x = touch.clientX - containerRect.left - dragOffsetX;
        let y = touch.clientY - containerRect.top - dragOffsetY;
        x = Math.max(0, Math.min(x, containerRect.width - textFrame.offsetWidth));
        y = Math.max(0, Math.min(y, containerRect.height - textFrame.offsetHeight));
        textFrame.style.left = x + 'px';
        textFrame.style.top = y + 'px';
        textFrame.style.transform = 'none';
        textFrameX = x;
        textFrameY = y;
        e.preventDefault();
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }

    function stopDragTouch() {
        isDragging = false;
        document.removeEventListener('touchmove', onDragTouch);
        document.removeEventListener('touchend', stopDragTouch);
    }

    // ---- text display ----
    textDisplay.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finalizeText();
        }
        if (e.key === 'Escape') {
            deactivateTextTool();
        }
    });

    textDisplay.addEventListener('blur', function() {
        if (textPlaced && textDisplay.textContent.trim() !== '') {
            finalizeText();
        }
    });

    function finalizeText() {
        if (!textPlaced) return;
        const text = textDisplay.textContent.trim();
        if (text === '' || text === 'Type something') {
            deactivateTextTool();
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = (textFrameX + 10) * dpr;
        const y = (textFrameY + 20) * dpr;
        const fontSize = Math.max(12, settings.size * 2) * dpr;
        
        ctx.save();
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur * dpr;
        ctx.shadowColor = settings.color;
        ctx.fillStyle = settings.color;
        ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
        ctx.restore();
        
        saveStroke();
        deactivateTextTool();
    }

    // ---- drawing state ----
    let isDrawing = false;
    let lastX = 0, lastY = 0;

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // ---- drawing ----
    function startDrawing(e) {
        if (textToolActive) return;
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        applySettings();
        ctx.arc(x, y, settings.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e) {
        if (!isDrawing || textToolActive) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        if (settings.gap > 0) {
            const dx = x - lastX;
            const dy = y - lastY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < settings.gap) return;
        }
        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        applySettings();
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            saveStroke();
        }
    }

    // ---- undo ----
    let strokeHistory = [];

    function saveStroke() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        strokeHistory.push(imageData);
        if (strokeHistory.length > 30) strokeHistory.shift();
    }

    function undoLastStroke() {
        if (strokeHistory.length === 0) return;
        const prev = strokeHistory.pop();
        ctx.putImageData(prev, 0, 0);
        applySettings();
        isDrawing = false;
        ctx.beginPath();
    }

    // ---- events ----
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        undoLastStroke();
    });

    // ---- presets ----
    function setupPresets() {
        const cells = document.querySelectorAll('#sidebar .grid span');
        cells.forEach((cell, index) => {
            const num = index + 1;
            cell.addEventListener('click', function(e) {
                const size = 4 + (num % 10);
                const hue = (num * 25) % 360;
                settings.size = Math.min(40, Math.max(2, size));
                settings.color = `hsl(${hue}, 80%, 60%)`;
                updateDisplays();
                applySettings();
                // update color swatch
                document.getElementById('colorSwatch').style.background = settings.color;
                this.style.borderColor = '#8888ff';
                setTimeout(() => { this.style.borderColor = '#3d3d48'; }, 200);
            });
            // hold
            let holdTimer = null;
            cell.addEventListener('mousedown', function(e) {
                if (e.button === 0) {
                    holdTimer = setTimeout(() => {
                        const size = 4 + (num % 10);
                        const hue = (num * 25) % 360;
                        settings.size = Math.min(40, Math.max(2, size));
                        settings.color = `hsl(${hue}, 80%, 60%)`;
                        updateDisplays();
                        applySettings();
                        document.getElementById('colorSwatch').style.background = settings.color;
                        this.style.borderColor = '#ffaa44';
                        setTimeout(() => { this.style.borderColor = '#3d3d48'; }, 400);
                    }, 600);
                }
            });
            cell.addEventListener('mouseup', () => { clearTimeout(holdTimer); holdTimer = null; });
            cell.addEventListener('mouseleave', () => { clearTimeout(holdTimer); holdTimer = null; });
            // touch hold
            let touchTimer = null;
            cell.addEventListener('touchstart', function(e) {
                touchTimer = setTimeout(() => {
                    const size = 4 + (num % 10);
                    const hue = (num * 25) % 360;
                    settings.size = Math.min(40, Math.max(2, size));
                    settings.color = `hsl(${hue}, 80%, 60%)`;
                    updateDisplays();
                    applySettings();
                    document.getElementById('colorSwatch').style.background = settings.color;
                    this.style.borderColor = '#ffaa44';
                    setTimeout(() => { this.style.borderColor = '#3d3d48'; }, 400);
                }, 600);
            }, { passive: true });
            cell.addEventListener('touchend', () => { clearTimeout(touchTimer); touchTimer = null; });
            cell.addEventListener('touchcancel', () => { clearTimeout(touchTimer); touchTimer = null; });
        });
    }

    // ---- color wheel ----
    function setupColorWheel() {
        const wheel = document.getElementById('colorWheel');
        const swatch = document.getElementById('colorSwatch');
        if (wheel) {
            wheel.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;
                const angle = Math.atan2(y - cy, x - cx);
                const deg = ((angle * 180 / Math.PI) + 360) % 360;
                const hue = deg;
                const sat = 80;
                const lig = 55;
                const color = `hsl(${hue}, ${sat}%, ${lig}%)`;
                // convert to hex
                const hex = hslToHex(hue, sat, lig);
                settings.color = hex;
                swatch.style.background = hex;
                applySettings();
            });
        }
    }

    function hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // ---- init ----
    function init() {
        resizeCanvas();
        settings.color = '#ffffff';
        document.getElementById('colorSwatch').style.background = '#ffffff';
        updateDisplays();
        applySettings();
        setupPresets();
        setupColorWheel();

        window.addEventListener('resize', () => {
            const oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resizeCanvas();
            ctx.putImageData(oldData, 0, 0);
            applySettings();
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                undoLastStroke();
            }
            if (e.key === 'Escape' && textToolActive) {
                deactivateTextTool();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
