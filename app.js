// app.js – Professional drawing app with glassmorphism UI

(function() {
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');

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
        color: '#ffffff',
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
            readSettings();
        });
    });

    // ---- eraser ----
    eraserBtn.addEventListener('click', function() {
        settings.isEraser = !settings.isEraser;
        settings.isText = false;
        textBtn.style.background = 'rgba(255,255,255,0.05)';
        if (settings.isEraser) {
            this.style.background = 'rgba(255,255,255,0.2)';
            brushBtns.forEach(b => b.classList.remove('active'));
        } else {
            this.style.background = 'rgba(255,255,255,0.05)';
            // re-activate last brush
            document.querySelector('.brush-btn.active')?.classList.remove('active');
            document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
            settings.brush = 'pen';
        }
        readSettings();
    });

    // ---- text tool ----
    textBtn.addEventListener('click', function() {
        settings.isText = !settings.isText;
        settings.isEraser = false;
        eraserBtn.style.background = 'rgba(255,255,255,0.05)';
        if (settings.isText) {
            this.style.background = 'rgba(255,255,255,0.2)';
            brushBtns.forEach(b => b.classList.remove('active'));
            // prompt for text
            const text = prompt('Enter text:', 'Hello Art!');
            if (text) {
                const rect = canvas.getBoundingClientRect();
                const x = rect.width / 2 - 50;
                const y = rect.height / 2;
                ctx.save();
                ctx.globalAlpha = settings.opacity / 100;
                ctx.shadowBlur = settings.blur;
                ctx.shadowColor = settings.color;
                ctx.fillStyle = settings.color;
                ctx.font = `${settings.size * 4}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x, y);
                ctx.restore();
                saveStroke();
            }
            settings.isText = false;
            this.style.background = 'rgba(255,255,255,0.05)';
            document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
            settings.brush = 'pen';
        }
        readSettings();
    });

    // ---- color wheel click ----
    colorWheel.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const angle = Math.atan2(y - cy, x - cx);
        const deg = ((angle * 180 / Math.PI) + 360) % 360;
        // simple hue mapping
        const hue = deg;
        const sat = 80;
        const lig = 55;
        const color = `hsl(${hue}, ${sat}%, ${lig}%)`;
        colorPicker.value = hslToHex(hue, sat, lig);
        settings.color = colorPicker.value;
        colorSwatch.style.background = settings.color;
        applySettings();
    });

    // helper: hsl to hex
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
        if (settings.isText) return;
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;
        currentPressure = getPressure(e) * 2 || 1;

        // start stroke
        ctx.beginPath();
        ctx.moveTo(x, y);
        applySettings();
        
        // dot for single tap
        const size = settings.size * (0.5 + currentPressure * 0.5);
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function draw(e) {
        if (!isDrawing || settings.isText) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        const pressure = getPressure(e) * 2 || 1;
        currentPressure = pressure;

        // apply start/end width
        let width = settings.size;
        // simulate start/end width by adjusting size based on distance from start
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

        // pressure
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
        applySettings();
    });

    // ---- init ----
    function init() {
        resizeCanvas();
        // set default brush active
        document.querySelector('.brush-btn[data-brush="pen"]')?.classList.add('active');
        settings.color = '#000000';
        colorPicker.value = '#000000';
        colorSwatch.style.background = '#000000';
        readSettings();
        applySettings();

        window.addEventListener('resize', () => {
            const oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resizeCanvas();
            ctx.putImageData(oldData, 0, 0);
            applySettings();
        });

        // keyboard shortcut: Ctrl+Z for undo
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                undoLastStroke();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
