// app.js – FlockMod enhanced drawing app with 15+ tools

(function() {
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    const canvasWrapper = canvas.parentElement;

    // ---- canvas sizing ----
    function resizeCanvas() {
        const rect = canvasWrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        applySettings();
        // fill with white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = settings.color;
    }

    // ---- settings ----
    const settings = {
        tool: 'pen',
        size: 8,
        opacity: 100,
        blur: 0,
        smoothing: 0,
        gap: 0,
        pressure: 100,
        pressureEnabled: true,
        color: '#000000',
        cursor: 'Круг',
        rightClick: 'Отменить штрих'
    };

    // ---- DOM refs ----
    const sizeDisplay = document.getElementById('sizeDisplay');
    const opacityDisplay = document.getElementById('opacityDisplay');
    const blurDisplay = document.getElementById('blurDisplay');
    const smoothDisplay = document.getElementById('smoothDisplay');
    const gapDisplay = document.getElementById('gapDisplay');
    const pressureDisplay = document.getElementById('pressureDisplay');
    const rightClickDisplay = document.getElementById('rightClickDisplay');
    const cursorDisplay = document.getElementById('cursorDisplay');
    const colorPreview = document.getElementById('colorPreview');
    const colorPicker = document.getElementById('colorPicker');
    const pressureToggle = document.getElementById('pressureToggle');

    function updateDisplays() {
        if (sizeDisplay) sizeDisplay.textContent = settings.size;
        if (opacityDisplay) opacityDisplay.textContent = settings.opacity;
        if (blurDisplay) blurDisplay.textContent = settings.blur;
        if (smoothDisplay) smoothDisplay.textContent = settings.smoothing;
        if (gapDisplay) gapDisplay.textContent = settings.gap;
        if (pressureDisplay) pressureDisplay.textContent = settings.pressure;
        if (rightClickDisplay) rightClickDisplay.textContent = settings.rightClick;
        if (cursorDisplay) cursorDisplay.textContent = settings.cursor;
        if (colorPreview) colorPreview.style.background = settings.color;
        if (colorPicker) colorPicker.value = settings.color;
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
    let strokeHistory = [];

    // ---- tools ----
    const tools = {
        pen: { name: 'pen', cursor: 'crosshair' },
        marker: { name: 'marker', cursor: 'crosshair' },
        text: { name: 'text', cursor: 'text' },
        eraser: { name: 'eraser', cursor: 'crosshair' },
        fill: { name: 'fill', cursor: 'crosshair' },
        select: { name: 'select', cursor: 'crosshair' },
        drag: { name: 'drag', cursor: 'grab' },
        transform: { name: 'transform', cursor: 'move' }
    };

    // ---- tool switching ----
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            settings.tool = this.dataset.tool;
            canvas.style.cursor = tools[settings.tool]?.cursor || 'crosshair';
            updateDisplays();
        });
    });

    // ---- templates ----
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const template = this.dataset.template;
            switch(template) {
                case 'sketch':
                    settings.size = 4;
                    settings.opacity = 80;
                    settings.blur = 2;
                    settings.smoothing = 10;
                    settings.color = '#444444';
                    break;
                case 'ink':
                    settings.size = 6;
                    settings.opacity = 100;
                    settings.blur = 0;
                    settings.smoothing = 0;
                    settings.color = '#000000';
                    break;
                case 'watercolor':
                    settings.size = 20;
                    settings.opacity = 40;
                    settings.blur = 15;
                    settings.smoothing = 20;
                    settings.color = '#4488ff';
                    break;
                case 'neon':
                    settings.size = 12;
                    settings.opacity = 90;
                    settings.blur = 25;
                    settings.smoothing = 5;
                    settings.color = '#ff00ff';
                    break;
            }
            updateDisplays();
            applySettings();
        });
    });

    // ---- presets ----
    document.querySelectorAll('.preset-cell').forEach((cell, index) => {
        const num = index + 1;
        cell.addEventListener('click', function() {
            const size = 4 + (num % 10);
            const hue = (num * 25) % 360;
            settings.size = Math.min(40, Math.max(2, size));
            settings.color = `hsl(${hue}, 80%, 50%)`;
            updateDisplays();
            applySettings();
            this.style.borderColor = '#8888ff';
            setTimeout(() => { this.style.borderColor = '#3d3d48'; }, 200);
        });

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
    });

    // ---- color picker ----
    colorPicker.addEventListener('input', function() {
        settings.color = this.value;
        colorPreview.style.background = settings.color;
        applySettings();
    });

    document.getElementById('colorWheel').addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const angle = Math.atan2(y - cy, x - cx) * (180 / Math.PI);
        const hue = ((angle + 360) % 360);
        settings.color = `hsl(${hue}, 80%, 50%)`;
        colorPreview.style.background = settings.color;
        colorPicker.value = settings.color;
        applySettings();
    });

    // ---- pressure toggle ----
    pressureToggle.addEventListener('click', function() {
        settings.pressureEnabled = !settings.pressureEnabled;
        this.textContent = settings.pressureEnabled ? 'Вкл' : 'Выкл';
        this.classList.toggle('active');
    });

    // ---- get coords ----
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // ---- save/undo ----
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

    // ---- drawing functions ----
    function startDrawing(e) {
        e.preventDefault();
        const { x, y } = getCoords(e);
        
        if (settings.tool === 'text') {
            createTextInput(x, y);
            return;
        }

        if (settings.tool === 'fill') {
            floodFill(Math.round(x), Math.round(y), settings.color);
            saveStroke();
            return;
        }

        if (settings.tool === 'select' || settings.tool === 'drag' || settings.tool === 'transform') {
            // simple selection handling
            startSelection(x, y);
            return;
        }

        isDrawing = true;
        lastX = x;
        lastY = y;

        // eraser mode
        if (settings.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = settings.color;
            ctx.fillStyle = settings.color;
        }

        // dot
        ctx.beginPath();
        ctx.arc(x, y, settings.size / 2, 0, Math.PI * 2);
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = settings.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCoords(e);

        // pressure sensitivity
        let pressure = 1;
        if (settings.pressureEnabled && e.pressure) {
            pressure = e.pressure;
        }
        const currentSize = settings.size * (0.5 + pressure * 0.5);

        // gap
        if (settings.gap > 0) {
            const dx = x - lastX;
            const dy = y - lastY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < settings.gap) return;
        }

        if (settings.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = settings.color;
            ctx.fillStyle = settings.color;
        }

        ctx.lineWidth = currentSize;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;

        ctx.lineTo(x, y);
        ctx.stroke();
        lastX = x;
        lastY = y;
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            ctx.globalCompositeOperation = 'source-over';
            saveStroke();
        }
    }

    // ---- text tool ----
    function createTextInput(x, y) {
        const input = document.createElement('div');
        input.className = 'text-overlay';
        input.contentEditable = true;
        input.style.left = x + 'px';
        input.style.top = y + 'px';
        input.textContent = 'Текст';
        canvasWrapper.style.position = 'relative';
        canvasWrapper.appendChild(input);
        input.focus();

        input.addEventListener('blur', function() {
            const text = this.textContent;
            const rect = this.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const xPos = rect.left - canvasRect.left;
            const yPos = rect.top - canvasRect.top;
            
            ctx.font = '24px system-ui, sans-serif';
            ctx.fillStyle = settings.color;
            ctx.globalAlpha = settings.opacity / 100;
            ctx.shadowBlur = settings.blur;
            ctx.shadowColor = settings.color;
            ctx.fillText(text, xPos, yPos + 24);
            this.remove();
            saveStroke();
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') this.blur();
            if (e.key === 'Enter' && !e.shiftKey) this.blur();
        });
    }

    // ---- flood fill ----
    function floodFill(startX, startY, fillColor) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;
        
        const startIdx = (startY * w + startX) * 4;
        const targetR = data[startIdx];
        const targetG = data[startIdx + 1];
        const targetB = data[startIdx + 2];
        const targetA = data[startIdx + 3];

        // parse fill color
        const tempCtx = document.createElement('canvas').getContext('2d');
        tempCtx.fillStyle = fillColor;
        const fillR = parseInt(fillColor.slice(1,3), 16);
        const fillG = parseInt(fillColor.slice(3,5), 16);
        const fillB = parseInt(fillColor.slice(5,7), 16);

        if (targetR === fillR && targetG === fillG && targetB === fillB) return;

        const visited = new Uint8Array(w * h);
        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const idx = (cy * w + cx) * 4;
            if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
            if (visited[cy * w + cx]) continue;
            
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            
            if (Math.abs(r - targetR) > 10 || Math.abs(g - targetG) > 10 || 
                Math.abs(b - targetB) > 10 || Math.abs(a - targetA) > 10) continue;
            
            visited[cy * w + cx] = 1;
            data[idx] = fillR;
            data[idx + 1] = fillG;
            data[idx + 2] = fillB;
            data[idx + 3] = 255;
            
            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // ---- selection (simplified) ----
    let selectionStart = null;
    let selectionEnd = null;
    let selectionRect = null;

    function startSelection(x, y) {
        if (settings.tool === 'select') {
            selectionStart = { x, y };
            selectionEnd = null;
            if (selectionRect) selectionRect.remove();
            selectionRect = document.createElement('div');
            selectionRect.className = 'selection-rect';
            canvasWrapper.appendChild(selectionRect);
        }
    }

    // ---- right-click undo ----
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        undoLastStroke();
    });

    // ---- events ----
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // ---- init ----
    function init() {
        resizeCanvas();
        applySettings();
        updateDisplays();
        
        // set default active tool
        document.querySelector('[data-tool="pen"]')?.classList.add('active');
        
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
