// app.js – professional drawing app with pressure, start/end width

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
        size: 8,
        thickness: 100,
        opacity: 100,
        blur: 0,
        pressure: false,
        pressureSize: 100,
        startWidth: 100,
        endWidth: 100,
        color: '#000000',
        brush: 'round', // 'round', 'marker', 'pencil'
        tool: 'pen', // 'pen', 'eraser', 'text'
    };

    // ---- DOM refs ----
    const sizeDisplay = document.getElementById('sizeDisplay');
    const thicknessDisplay = document.getElementById('thicknessDisplay');
    const opacityDisplay = document.getElementById('opacityDisplay');
    const blurDisplay = document.getElementById('blurDisplay');
    const pressureSizeDisplay = document.getElementById('pressureSizeDisplay');
    const startWidthDisplay = document.getElementById('startWidthDisplay');
    const endWidthDisplay = document.getElementById('endWidthDisplay');
    const pressureToggle = document.getElementById('pressureToggle');
    const pressureStatus = document.getElementById('pressureStatus');
    const colorPicker = document.getElementById('colorPicker');

    function updateDisplays() {
        if (sizeDisplay) sizeDisplay.textContent = settings.size;
        if (thicknessDisplay) thicknessDisplay.textContent = settings.thickness;
        if (opacityDisplay) opacityDisplay.textContent = settings.opacity;
        if (blurDisplay) blurDisplay.textContent = settings.blur;
        if (pressureSizeDisplay) pressureSizeDisplay.textContent = settings.pressureSize;
        if (startWidthDisplay) startWidthDisplay.textContent = settings.startWidth;
        if (endWidthDisplay) endWidthDisplay.textContent = settings.endWidth;
    }

    function applySettings() {
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        if (settings.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = settings.color;
            ctx.fillStyle = settings.color;
        }
    }

    // ---- brush textures ----
    function getBrushTexture(brush) {
        // different line styles based on brush
        switch(brush) {
            case 'marker':
                return 'marker';
            case 'pencil':
                return 'pencil';
            default:
                return 'round';
        }
    }

    // ---- drawing state ----
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let currentPressure = 1;
    let points = [];

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
            pressure: e.pressure || e.touches?.[0]?.force || 0.5
        };
    }

    // ---- get line width based on pressure and start/end ----
    function getLineWidth(pressure, progress) {
        let baseSize = settings.size;
        let thicknessFactor = settings.thickness / 100;
        
        // pressure modifier
        let pressureMod = 1;
        if (settings.pressure) {
            pressureMod = 0.5 + (pressure * 1.5);
            // pressure size scaling
            pressureMod = pressureMod * (settings.pressureSize / 100);
        }
        
        // start/end width modifier
        let startEndMod = 1;
        if (settings.startWidth !== 100 || settings.endWidth !== 100) {
            const startFactor = settings.startWidth / 100;
            const endFactor = settings.endWidth / 100;
            // interpolate between start and end based on progress (0-1)
            startEndMod = startFactor + (endFactor - startFactor) * progress;
        }
        
        let finalWidth = baseSize * thicknessFactor * pressureMod * startEndMod;
        return Math.max(0.5, finalWidth);
    }

    // ---- drawing ----
    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const { x, y, pressure } = getCoords(e);
        lastX = x;
        lastY = y;
        currentPressure = pressure || 0.5;
        points = [{x, y, p: currentPressure}];
        
        // draw dot
        const width = getLineWidth(currentPressure, 0);
        ctx.beginPath();
        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        applySettings();
        ctx.fill();
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y, pressure } = getCoords(e);
        currentPressure = pressure || 0.5;
        
        // store point
        points.push({x, y, p: currentPressure});
        
        // calculate progress for start/end
        const totalPoints = points.length;
        const progress = Math.min(1, totalPoints / 50); // normalize
        
        // get width for this point
        const width = getLineWidth(currentPressure, progress);
        
        // apply brush texture
        const brush = settings.brush;
        applySettings();
        ctx.lineWidth = width;
        
        // different brush effects
        if (brush === 'pencil') {
            // pencil: slight opacity variation + noise
            ctx.globalAlpha = (settings.opacity / 100) * (0.8 + Math.random() * 0.2);
        } else if (brush === 'marker') {
            // marker: slight edge bleed
            ctx.shadowBlur = settings.blur + 2;
        } else {
            // round: clean
            ctx.shadowBlur = settings.blur;
        }
        
        // draw line from last point to current
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        // for pencil: add extra texture dots
        if (brush === 'pencil' && Math.random() > 0.7) {
            ctx.beginPath();
            ctx.arc(x + (Math.random()-0.5)*2, y + (Math.random()-0.5)*2, 0.5, 0, Math.PI*2);
            ctx.fill();
        }
        
        lastX = x;
        lastY = y;
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            points = [];
            applySettings();
            saveStroke();
        }
    }

    // ---- undo ----
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

    // ---- brush selection ----
    document.querySelectorAll('.brush-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            settings.brush = this.dataset.brush;
        });
    });

    // ---- tool selection ----
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            settings.tool = this.dataset.tool;
            if (settings.tool === 'eraser') {
                canvas.style.cursor = 'not-allowed';
            } else {
                canvas.style.cursor = 'crosshair';
            }
            applySettings();
        });
    });

    // ---- sliders ----
    document.getElementById('sizeSlider').addEventListener('input', function() {
        settings.size = parseInt(this.value);
        updateDisplays();
    });
    document.getElementById('thicknessSlider').addEventListener('input', function() {
        settings.thickness = parseInt(this.value);
        updateDisplays();
    });
    document.getElementById('opacitySlider').addEventListener('input', function() {
        settings.opacity = parseInt(this.value);
        applySettings();
        updateDisplays();
    });
    document.getElementById('blurSlider').addEventListener('input', function() {
        settings.blur = parseInt(this.value);
        applySettings();
        updateDisplays();
    });
    document.getElementById('startWidthSlider').addEventListener('input', function() {
        settings.startWidth = parseInt(this.value);
        updateDisplays();
    });
    document.getElementById('endWidthSlider').addEventListener('input', function() {
        settings.endWidth = parseInt(this.value);
        updateDisplays();
    });

    // ---- pressure toggle ----
    pressureToggle.addEventListener('click', function() {
        settings.pressure = !settings.pressure;
        this.classList.toggle('active');
        pressureStatus.textContent = settings.pressure ? 'ON' : 'OFF';
    });

    // ---- pressure size slider ----
    document.getElementById('pressureSizeSlider')?.addEventListener('input', function() {
        settings.pressureSize = parseInt(this.value);
        updateDisplays();
    });

    // ---- color picker ----
    colorPicker.addEventListener('input', function() {
        settings.color = this.value;
        applySettings();
    });

    // ---- color wheel click ----
    document.getElementById('colorWheel').addEventListener('click', function() {
        const hue = Math.floor(Math.random() * 360);
        settings.color = `hsl(${hue}, 80%, 60%)`;
        colorPicker.value = settings.color;
        applySettings();
    });

    // ---- presets ----
    document.querySelectorAll('#sidebar .grid span').forEach((cell, index) => {
        const num = index + 1;
        cell.addEventListener('click', function() {
            const size = 3 + (num % 8);
            const hue = (num * 20) % 360;
            settings.size = Math.min(40, Math.max(1, size));
            settings.color = `hsl(${hue}, 80%, 60%)`;
            colorPicker.value = settings.color;
            updateDisplays();
            applySettings();
            document.querySelectorAll('#sidebar .grid span').forEach(s => s.classList.remove('active-preset'));
            this.classList.add('active-preset');
        });
        
        // hold to set
        let holdTimer = null;
        cell.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                holdTimer = setTimeout(() => {
                    const size = 3 + (num % 8);
                    const hue = (num * 20) % 360;
                    settings.size = Math.min(40, Math.max(1, size));
                    settings.color = `hsl(${hue}, 80%, 60%)`;
                    colorPicker.value = settings.color;
                    updateDisplays();
                    applySettings();
                    this.style.borderColor = '#ffaa44';
                    setTimeout(() => { this.style.borderColor = '#4a4a58'; }, 400);
                }, 600);
            }
        });
        cell.addEventListener('mouseup', () => { clearTimeout(holdTimer); holdTimer = null; });
        cell.addEventListener('mouseleave', () => { clearTimeout(holdTimer); holdTimer = null; });
    });

    // ---- init ----
    function init() {
        resizeCanvas();
        applySettings();
        updateDisplays();
        // set default color
        settings.color = '#000000';
        colorPicker.value = '#000000';
        applySettings();
        
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
