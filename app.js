// app.js – FlockMod drawing app with text tool

(function() {
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    const canvasContainer = document.getElementById('canvasContainer');
    const textFrame = document.getElementById('textFrame');
    const textContent = document.getElementById('textContent');

    // ---- canvas sizing ----
    function resizeCanvas() {
        const rect = canvasContainer.getBoundingClientRect();
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
        size: 8,
        opacity: 100,
        blur: 0,
        smoothing: 0,
        gap: 0,
        pressure: 100,
        color: '#000000',
        isEraser: false,
        isText: false
    };

    // ---- DOM refs ----
    const sizeDisplay = document.getElementById('sizeDisplay');
    const opacityDisplay = document.getElementById('opacityDisplay');
    const blurDisplay = document.getElementById('blurDisplay');
    const smoothDisplay = document.getElementById('smoothDisplay');
    const gapDisplay = document.getElementById('gapDisplay');
    const pressureDisplay = document.getElementById('pressureDisplay');
    const colorPicker = document.getElementById('colorPicker');
    const colorSwatch = document.getElementById('colorSwatch');
    const colorWheel = document.getElementById('colorWheel');
    const penBtn = document.getElementById('penBtn');
    const eraserBtn = document.getElementById('eraserBtn');
    const textBtn = document.getElementById('textBtn');

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
        ctx.strokeStyle = settings.isEraser ? '#ffffff' : settings.color;
        ctx.fillStyle = settings.isEraser ? '#ffffff' : settings.color;
        ctx.globalCompositeOperation = settings.isEraser ? 'destination-out' : 'source-over';
    }

    // ---- text tool ----
    let textPlaced = false;
    let textPosX = 0, textPosY = 0;

    function showTextFrame(x, y) {
        textFrame.style.display = 'block';
        textFrame.style.left = (x - 60) + 'px';
        textFrame.style.top = (y - 20) + 'px';
        textPosX = x;
        textPosY = y;
        textPlaced = false;
        textContent.textContent = 'type something';
        textContent.style.color = settings.color;
        textFrame.style.borderColor = 'rgba(255,255,255,0.4)';
        textFrame.style.backgroundColor = 'rgba(255,255,255,0.05)';
        // make it follow cursor initially
        textFrame.dataset.following = 'true';
    }

    function placeTextFrame(x, y) {
        textFrame.dataset.following = 'false';
        textPlaced = true;
        textFrame.style.left = (x - 60) + 'px';
        textFrame.style.top = (y - 20) + 'px';
        textPosX = x;
        textPosY = y;
        textFrame.style.borderColor = 'rgba(255,255,255,0.6)';
        textFrame.style.backgroundColor = 'rgba(255,255,255,0.1)';
        // allow editing
        textContent.contentEditable = true;
        textContent.focus();
        // select all text
        const range = document.createRange();
        range.selectNodeContents(textContent);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function finishText() {
        if (textContent.textContent.trim() === '' || textContent.textContent === 'type something') {
            textContent.textContent = 'type something';
        }
        textContent.contentEditable = false;
        // draw text on canvas
        const rect = canvas.getBoundingClientRect();
        const x = textPosX;
        const y = textPosY;
        ctx.save();
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.fillStyle = settings.color;
        ctx.font = `${settings.size * 3}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(textContent.textContent, x - 60, y - 20);
        ctx.restore();
        saveStroke();
        textFrame.style.display = 'none';
        settings.isText = false;
        textBtn.style.background = 'rgba(255,255,255,0.05)';
        penBtn.style.background = 'rgba(255,255,255,0.2)';
        penBtn.classList.add('active');
        textContent.contentEditable = false;
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

    // ---- drawing functions ----
    function startDrawing(e) {
        if (settings.isText) {
            // if text frame is following, place it
            if (textFrame.dataset.following === 'true') {
                const { x, y } = getCoords(e);
                placeTextFrame(x, y);
                return;
            }
            // if text is placed and we click elsewhere, finish it
            if (textPlaced) {
                finishText();
                return;
            }
            return;
        }
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        applySettings();
        // draw dot
        ctx.arc(x, y, settings.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e) {
        if (settings.isText) {
            // update text frame position if following
            if (textFrame.dataset.following === 'true') {
                const { x, y } = getCoords(e);
                textFrame.style.left = (x - 60) + 'px';
                textFrame.style.top = (y - 20) + 'px';
                textPosX = x;
                textPosY = y;
            }
            return;
        }
        if (!isDrawing) return;
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

    // ---- keyboard for text ----
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && settings.isText && textPlaced) {
            e.preventDefault();
            finishText();
        }
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undoLastStroke();
        }
        // Escape to cancel text
        if (e.key === 'Escape' && settings.isText) {
            textFrame.style.display = 'none';
            settings.isText = false;
            textBtn.style.background = 'rgba(255,255,255,0.05)';
            penBtn.style.background = 'rgba(255,255,255,0.2)';
            penBtn.classList.add('active');
            textContent.contentEditable = false;
        }
    });

    // ---- tool buttons ----
    penBtn.addEventListener('click', function() {
        settings.isEraser = false;
        settings.isText = false;
        textFrame.style.display = 'none';
        this.classList.add('active');
        eraserBtn.classList.remove('active');
        textBtn.classList.remove('active');
        this.style.background = 'rgba(255,255,255,0.2)';
        eraserBtn.style.background = 'rgba(255,255,255,0.05)';
        textBtn.style.background = 'rgba(255,255,255,0.05)';
        settings.color = colorPicker.value;
        applySettings();
    });

    eraserBtn.addEventListener('click', function() {
        settings.isEraser = !settings.isEraser;
        settings.isText = false;
        textFrame.style.display = 'none';
        if (settings.isEraser) {
            this.classList.add('active');
            this.style.background = 'rgba(255,255,255,0.2)';
            penBtn.classList.remove('active');
            textBtn.classList.remove('active');
            penBtn.style.background = 'rgba(255,255,255,0.05)';
            textBtn.style.background = 'rgba(255,255,255,0.05)';
        } else {
            this.classList.remove('active');
            this.style.background = 'rgba(255,255,255,0.05)';
            penBtn.classList.add('active');
            penBtn.style.background = 'rgba(255,255,255,0.2)';
        }
        applySettings();
    });

    textBtn.addEventListener('click', function() {
        if (settings.isText) {
            // if already in text mode, cancel
            textFrame.style.display = 'none';
            settings.isText = false;
            this.style.background = 'rgba(255,255,255,0.05)';
            penBtn.style.background = 'rgba(255,255,255,0.2)';
            penBtn.classList.add('active');
            textContent.contentEditable = false;
            return;
        }
        settings.isText = true;
        settings.isEraser = false;
        eraserBtn.classList.remove('active');
        eraserBtn.style.background = 'rgba(255,255,255,0.05)';
        this.classList.add('active');
        this.style.background = 'rgba(255,255,255,0.2)';
        penBtn.classList.remove('active');
        penBtn.style.background = 'rgba(255,255,255,0.05)';
        textPlaced = false;
        // show text frame at center initially
        const rect = canvas.getBoundingClientRect();
        showTextFrame(rect.width / 2, rect.height / 2);
        textContent.contentEditable = false;
        textContent.textContent = 'type something';
        textContent.style.color = settings.color;
    });

    // ---- color ----
    colorPicker.addEventListener('input', function() {
        settings.color = this.value;
        colorSwatch.style.background = settings.color;
        if (textContent) textContent.style.color = settings.color;
        applySettings();
    });

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
        function hslToHex(h, s, l) {
            h /= 360;
            s /= 100;
            l /= 100;
            let r, g, b;
            if (s === 0) { r = g = b = l; }
            else {
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
        const color = hslToHex(hue, sat, lig);
        colorPicker.value = color;
        settings.color = color;
        colorSwatch.style.background = color;
        if (textContent) textContent.style.color = color;
        applySettings();
    });

    // ---- presets ----
    function setupPresets() {
        const cells = document.querySelectorAll('#sidebar .grid span');
        cells.forEach((cell, index) => {
            const num = index + 1;
            cell.addEventListener('click', function() {
                const size = 4 + (num % 10);
                const hue = (num * 25) % 360;
                settings.size = Math.min(40, Math.max(2, size));
                const color = `hsl(${hue}, 80%, 60%)`;
                colorPicker.value = color;
                settings.color = color;
                colorSwatch.style.background = color;
                if (textContent) textContent.style.color = color;
                updateDisplays();
                applySettings();
                this.style.borderColor = 'rgba(255,255,255,0.6)';
                setTimeout(() => { this.style.borderColor = 'rgba(255,255,255,0.1)'; }, 200);
            });
            let holdTimer = null;
            cell.addEventListener('mousedown', function(e) {
                if (e.button === 0) {
                    holdTimer = setTimeout(() => {
                        const size = 4 + (num % 10);
                        const hue = (num * 25) % 360;
                        settings.size = Math.min(40, Math.max(2, size));
                        const color = `hsl(${hue}, 80%, 60%)`;
                        colorPicker.value = color;
                        settings.color = color;
                        colorSwatch.style.background = color;
                        if (textContent) textContent.style.color = color;
                        updateDisplays();
                        applySettings();
                        this.style.borderColor = 'rgba(255,200,100,0.8)';
                        setTimeout(() => { this.style.borderColor = 'rgba(255,255,255,0.1)'; }, 400);
                    }, 600);
                }
            });
            cell.addEventListener('mouseup', () => { clearTimeout(holdTimer); holdTimer = null; });
            cell.addEventListener('mouseleave', () => { clearTimeout(holdTimer); holdTimer = null; });
        });
    }

    // ---- init ----
    function init() {
        resizeCanvas();
        settings.color = '#000000';
        colorPicker.value = '#000000';
        colorSwatch.style.background = '#000000';
        penBtn.classList.add('active');
        penBtn.style.background = 'rgba(255,255,255,0.2)';
        applySettings();
        updateDisplays();
        setupPresets();

        window.addEventListener('resize', () => {
            const oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resizeCanvas();
            ctx.putImageData(oldData, 0, 0);
            applySettings();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
