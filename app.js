// app.js – Professional drawing app with text tool

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

    // ---- settings ----
    const settings = {
        brush: 'pen',
        size: 8,
        thickness: 8,
        opacity: 100,
        blur: 0,
        pressure: true,
        pressureSize: 25,
        startWidth: 8,
        endWidth: 8,
        color: '#000000',
        isEraser: false,
        isText: false
    };

    // ---- DOM refs ----
    const sizeSlider = document.getElementById('sizeSlider');
    const thicknessSlider = document.getElementById('thicknessSlider');
    const opacitySlider = document.getElementById('opacitySlider');
    const blurSlider = document.getElementById('blurSlider');
    const pressureToggle = document.getElementById('pressureToggle');
    const pressureSizeSlider = document.getElementById('pressureSizeSlider');
    const startWidthSlider = document.getElementById('startWidthSlider');
    const endWidthSlider = document.getElementById('endWidthSlider');
    const colorPicker = document.getElementById('colorPicker');
    const colorSwatch = document.getElementById('colorSwatch');
    const colorWheel = document.getElementById('colorWheel');
    const eraserBtn = document.getElementById('eraserBtn');
    const textBtn = document.getElementById('textBtn');
    const brushBtns = document.querySelectorAll('.brush-btn');

    // ---- text tool state ----
    let textToolActive = false;
    let textPlaced = false;
    let textFrameX = 0;
    let textFrameY = 0;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    function updateDisplays() {
        // all values are read directly from sliders
    }

    function applySettings() {
        ctx.globalAlpha = settings.opacity / 100;
        ctx.lineWidth = settings.size;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.strokeStyle = settings.isEraser ? '#ffffff' : settings.color;
        ctx.fillStyle = settings.isEraser ? '#ffffff' : settings.color;
        ctx.globalCompositeOperation = settings.isEraser ? 'destination-out' : 'source-over';
    }

    // ---- read sliders ----
    function readSettings() {
        settings.size = parseInt(sizeSlider.value);
        settings.thickness = parseInt(thicknessSlider.value);
        settings.opacity = parseInt(opacitySlider.value);
        settings.blur = parseInt(blurSlider.value);
        settings.pressure = pressureToggle.checked;
        settings.pressureSize = parseInt(pressureSizeSlider.value);
        settings.startWidth = parseInt(startWidthSlider.value);
        settings.endWidth = parseInt(endWidthSlider.value);
        settings.color = colorPicker.value;
        colorSwatch.style.background = settings.color;
        applySettings();
    }

    // ---- brush selection ----
    brushBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            brushBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            settings.brush = this.dataset.brush;
            settings.isEraser = false;
            settings.isText = false;
            eraserBtn.style.background = 'rgba(255,255,255,0.05)';
            textBtn.style.background = 'rgba(255,255,255,0.05)';
            deactivateTextTool();
            readSettings();
        });
    });

    // ---- eraser ----
    eraserBtn.addEventListener('click', function() {
        settings.isEraser = !settings.isEraser;
        settings.isText = false;
        textBtn.style.background = 'rgba(255,255,255,0.05)';
        deactivateTextTool();
        if (settings.isEraser) {
            this.style.background = 'rgba(255,255,255,0.2)';
            brushBtns.forEach(b => b.classList.remove('active'));
        } else {
            this.style.background = 'rgba(255,255,255,0.05)';
            document.querySelector('.brush-btn.active')?.classList.remove('active');
            document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
            settings.brush = 'pen';
        }
        readSettings();
    });

    // ---- text tool ----
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
        // remove pointer-events-none from overlay so we can detect clicks
        textOverlay.style.pointerEvents = 'auto';
        textFrame.style.pointerEvents = 'auto';
        textDisplay.style.pointerEvents = 'none';
        // store position for later
        textFrameX = window.innerWidth / 2 - 100;
        textFrameY = window.innerHeight / 2 - 30;
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
        settings.isText = false;
    }

    // ---- text button click ----
    textBtn.addEventListener('click', function() {
        if (settings.isText) {
            // if already in text mode, deactivate
            settings.isText = false;
            this.style.background = 'rgba(255,255,255,0.05)';
            deactivateTextTool();
            brushBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
            settings.brush = 'pen';
            return;
        }
        settings.isText = true;
        settings.isEraser = false;
        eraserBtn.style.background = 'rgba(255,255,255,0.05)';
        this.style.background = 'rgba(255,255,255,0.2)';
        brushBtns.forEach(b => b.classList.remove('active'));
        activateTextTool();
        readSettings();
    });

    // ---- text overlay click to place ----
    textOverlay.addEventListener('mousedown', function(e) {
        if (!textToolActive || textPlaced) return;
        if (e.target === textOverlay || e.target === canvas) {
            // place text at click position
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
            // make overlay click-through except on frame
            textOverlay.style.pointerEvents = 'none';
            textFrame.style.pointerEvents = 'auto';
            textDisplay.style.pointerEvents = 'auto';
            
            // add drag functionality
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
            // finalize text and draw to canvas
            finalizeText();
        }
        if (e.key === 'Escape') {
            deactivateTextTool();
            settings.isText = false;
            textBtn.style.background = 'rgba(255,255,255,0.05)';
            brushBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
            settings.brush = 'pen';
        }
    });

    textDisplay.addEventListener('blur', function() {
        // if text is placed and content is not empty, finalize
        if (textPlaced && textDisplay.textContent.trim() !== '') {
            finalizeText();
        }
    });

    function finalizeText() {
        if (!textPlaced) return;
        const text = textDisplay.textContent.trim();
        if (text === '' || text === 'Type something') {
            deactivateTextTool();
            settings.isText = false;
            textBtn.style.background = 'rgba(255,255,255,0.05)';
            return;
        }
        
        // draw text on canvas
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
        settings.isText = false;
        textBtn.style.background = 'rgba(255,255,255,0.05)';
        brushBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
        settings.brush = 'pen';
    }

    // ---- color wheel click ----
    colorWheel.addEventListener('click', function(e) {
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
        colorPicker.value = hslToHex(hue, sat, lig);
        settings.color = colorPicker.value;
        colorSwatch.style.background = settings.color;
        textDisplay.style.color = settings.color;
        applySettings();
    });

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

    // ---- drawing state ----
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let currentPressure = 1;

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function getPressure(e) {
        if (settings.pressure && e.pointerType === 'pen') {
            return e.pressure || 0.5;
        }
        return 0.5;
    }

    // ---- drawing ----
    function startDrawing(e) {
        if (settings.isText || textToolActive) return;
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;
        currentPressure = getPressure(e) * 2 || 1;

        ctx.beginPath();
        ctx.moveTo(x, y);
        applySettings();
        
        const size = settings.size * (0.5 + currentPressure * 0.5);
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e) {
        if (!isDrawing || settings.isText || textToolActive) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        const pressure = getPressure(e) * 2 || 1;
        currentPressure = pressure;

        let width = settings.size;
        const dx = x - lastX;
        const dy = y - lastY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0) {
            const progress = Math.min(dist / 50, 1);
            const startW = settings.startWidth;
            const endW = settings.endWidth;
            const currentW = startW + (endW - startW) * progress;
            width = settings.size * (currentW / 8);
        }

        if (settings.pressure) {
            width *= (0.5 + pressure * 0.5);
        }

        ctx.lineWidth = Math.max(1, width);
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

    // ---- slider events ----
    [sizeSlider, thicknessSlider, opacitySlider, blurSlider, pressureSizeSlider, startWidthSlider, endWidthSlider].forEach(slider => {
        slider.addEventListener('input', readSettings);
    });
    pressureToggle.addEventListener('change', readSettings);
    colorPicker.addEventListener('input', function() {
        settings.color = this.value;
        colorSwatch.style.background = settings.color;
        textDisplay.style.color = settings.color;
        applySettings();
    });

    // ---- init ----
    function init() {
        resizeCanvas();
        document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
        settings.color = '#000000';
        colorPicker.value = '#000000';
        colorSwatch.style.background = '#000000';
        textDisplay.style.color = '#000000';
        readSettings();
        applySettings();

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
                settings.isText = false;
                textBtn.style.background = 'rgba(255,255,255,0.05)';
                brushBtns.forEach(b => b.classList.remove('active'));
                document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
                settings.brush = 'pen';
            }
        });

        // click on canvas to place text
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
