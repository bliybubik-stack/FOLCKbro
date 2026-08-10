// app.js – FlockMod drawing app with sidebar on right

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
        // fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = settings.color;
    }

    // ---- tool settings ----
    const settings = {
        size: 8,
        opacity: 100,
        blur: 0,
        smoothing: 0,
        gap: 0,
        pressure: 100,
        color: '#000000',
        cursor: 'Круг'
    };

    // ---- DOM refs ----
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
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;
        // draw dot
        ctx.beginPath();
        ctx.arc(x, y, settings.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = settings.color;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.fill();
        // start stroke
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = settings.size;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        // gap logic
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
            saveStroke();
        }
    }

    // ---- undo (right-click) ----
    let strokeHistory = [];

    function saveStroke() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        strokeHistory.push(imageData);
        if (strokeHistory.length > 20) strokeHistory.shift();
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
            // click = load preset
            cell.addEventListener('click', function(e) {
                const size = 4 + (num % 10);
                const hue = (num * 25) % 360;
                settings.size = Math.min(40, Math.max(2, size));
                settings.color = `hsl(${hue}, 80%, 50%)`;
                updateDisplays();
                applySettings();
                this.style.borderColor = '#8888ff';
                setTimeout(() => { this.style.borderColor = '#3d3d48'; }, 200);
            });
            // hold = set preset
            let holdTimer = null;
            cell.addEventListener('mousedown', function(e) {
                if (e.button === 0) {
                    holdTimer = setTimeout(() => {
                        const size = 4 + (num % 10);
                        const hue = (num * 25) % 360;
                        settings.size = Math.min(40, Math.max(2, size));
                        settings.color = `hsl(${hue}, 80%, 50%)`;
                        updateDisplays();
                        applySettings();
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
                    settings.color = `hsl(${hue}, 80%, 50%)`;
                    updateDisplays();
                    applySettings();
                    this.style.borderColor = '#ffaa44';
                    setTimeout(() => { this.style.borderColor = '#3d3d48'; }, 400);
                }, 600);
            }, { passive: true });
            cell.addEventListener('touchend', () => { clearTimeout(touchTimer); touchTimer = null; });
            cell.addEventListener('touchcancel', () => { clearTimeout(touchTimer); touchTimer = null; });
        });
    }

    // ---- color wheel click ----
    function setupColorWheel() {
        const wheel = document.querySelector('.color-wheel-mock');
        if (wheel) {
            wheel.addEventListener('click', function() {
                const hue = Math.floor(Math.random() * 360);
                settings.color = `hsl(${hue}, 80%, 50%)`;
                applySettings();
                updateDisplays();
            });
        }
    }

    // ---- init ----
    function init() {
        resizeCanvas();
        applySettings();
        updateDisplays();
        setupPresets();
        setupColorWheel();
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
