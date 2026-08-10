// app.js – Professional drawing app with brush, eraser, layers, undo/redo

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
        // redraw current layer
        if (currentLayer) {
            ctx.putImageData(currentLayer, 0, 0);
        }
    }

    // ---- state ----
    const state = {
        size: 8,
        opacity: 100,
        color: '#000000',
        tool: 'brush', // 'brush', 'eraser', 'bucket', 'picker'
        isDrawing: false,
        lastX: 0,
        lastY: 0,
    };

    // ---- layers (simple undo/redo via imageData stack) ----
    let layerStack = [];
    let currentLayerIndex = 0;
    let currentLayer = null; // ImageData

    function saveLayerState() {
        // save current canvas as imageData
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // if we're not at the end of stack, truncate
        if (currentLayerIndex < layerStack.length - 1) {
            layerStack = layerStack.slice(0, currentLayerIndex + 1);
        }
        layerStack.push(imageData);
        currentLayerIndex = layerStack.length - 1;
        currentLayer = imageData;
        updateLayerCount();
    }

    function undo() {
        if (currentLayerIndex > 0) {
            currentLayerIndex--;
            currentLayer = layerStack[currentLayerIndex];
            ctx.putImageData(currentLayer, 0, 0);
            updateLayerCount();
        }
    }

    function redo() {
        if (currentLayerIndex < layerStack.length - 1) {
            currentLayerIndex++;
            currentLayer = layerStack[currentLayerIndex];
            ctx.putImageData(currentLayer, 0, 0);
            updateLayerCount();
        }
    }

    function addLayer() {
        // save current state
        saveLayerState();
        // clear canvas (new layer)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // save as new layer
        const newLayer = ctx.getImageData(0, 0, canvas.width, canvas.height);
        layerStack.push(newLayer);
        currentLayerIndex = layerStack.length - 1;
        currentLayer = newLayer;
        updateLayerCount();
        applySettings();
    }

    function updateLayerCount() {
        const countEl = document.getElementById('layerCount');
        if (countEl) countEl.textContent = layerStack.length;
    }

    // ---- color management ----
    function setColor(color) {
        state.color = color;
        document.getElementById('colorPreview').style.background = color;
        applySettings();
    }
    window.setColor = setColor; // expose for inline onclick

    // ---- apply settings to context ----
    function applySettings() {
        const isEraser = state.tool === 'eraser';
        ctx.globalAlpha = state.opacity / 100;
        ctx.lineWidth = state.size;
        ctx.shadowBlur = 0; // no shadow for clean look
        if (isEraser) {
            ctx.strokeStyle = 'white';
            ctx.fillStyle = 'white';
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.strokeStyle = state.color;
            ctx.fillStyle = state.color;
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // ---- drawing functions ----
    function startDrawing(e) {
        e.preventDefault();
        state.isDrawing = true;
        const { x, y } = getCoords(e);
        state.lastX = x;
        state.lastY = y;

        // for bucket tool
        if (state.tool === 'bucket') {
            floodFill(x, y, state.color);
            saveLayerState();
            state.isDrawing = false;
            return;
        }

        // for picker
        if (state.tool === 'picker') {
            pickColor(x, y);
            state.isDrawing = false;
            return;
        }

        // draw dot
        ctx.beginPath();
        ctx.arc(x, y, state.size / 2, 0, Math.PI * 2);
        ctx.fill();
        // start stroke
        ctx.beginPath();
        ctx.moveTo(x, y);
        applySettings();
    }

    function draw(e) {
        if (!state.isDrawing) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        state.lastX = x;
        state.lastY = y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        applySettings();
    }

    function stopDrawing(e) {
        if (state.isDrawing) {
            state.isDrawing = false;
            ctx.closePath();
            saveLayerState();
        }
    }

    // ---- coordinate helper ----
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // ---- picker (eyedropper) ----
    function pickColor(x, y) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const hex = '#' + [pixel[0], pixel[1], pixel[2]]
            .map(v => v.toString(16).padStart(2, '0'))
            .join('');
        setColor(hex);
    }

    // ---- flood fill (bucket) ----
    function floodFill(x, y, fillColor) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;

        const targetColor = getPixelColor(data, x, y, w);
        const fillRGB = hexToRgb(fillColor);

        if (colorsMatch(targetColor, fillRGB)) return;

        const queue = [[x, y]];
        const visited = new Set();
        const key = (px, py) => `${px},${py}`;

        while (queue.length > 0) {
            const [px, py] = queue.shift();
            const k = key(px, py);
            if (visited.has(k)) continue;
            if (px < 0 || px >= w || py < 0 || py >= h) continue;
            const idx = (py * w + px) * 4;
            const currentColor = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
            if (!colorsMatch(currentColor, targetColor)) continue;

            // fill
            data[idx] = fillRGB[0];
            data[idx+1] = fillRGB[1];
            data[idx+2] = fillRGB[2];
            data[idx+3] = 255;

            visited.add(k);
            queue.push([px+1, py], [px-1, py], [px, py+1], [px, py-1]);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function getPixelColor(data, x, y, w) {
        const idx = (y * w + x) * 4;
        return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
    }

    function colorsMatch(c1, c2) {
        return Math.abs(c1[0] - c2[0]) < 5 &&
               Math.abs(c1[1] - c2[1]) < 5 &&
               Math.abs(c1[2] - c2[2]) < 5 &&
               Math.abs(c1[3] - c2[3]) < 5;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
            255
        ] : [0,0,0,255];
    }

    // ---- tool switching ----
    function setTool(tool) {
        state.tool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        // update cursor
        if (tool === 'eraser') {
            canvas.style.cursor = 'cell';
        } else if (tool === 'bucket') {
            canvas.style.cursor = 'pointer';
        } else if (tool === 'picker') {
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'crosshair';
        }
        applySettings();
    }

    // ---- UI bindings ----
    function setupUI() {
        // size slider
        const sizeSlider = document.getElementById('sizeSlider');
        const sizeDisplay = document.getElementById('sizeDisplay');
        sizeSlider.addEventListener('input', function() {
            state.size = parseInt(this.value);
            sizeDisplay.textContent = state.size;
            applySettings();
        });

        // opacity slider
        const opSlider = document.getElementById('opacitySlider');
        const opDisplay = document.getElementById('opacityDisplay');
        opSlider.addEventListener('input', function() {
            state.opacity = parseInt(this.value);
            opDisplay.textContent = state.opacity;
            applySettings();
        });

        // tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                setTool(this.dataset.tool);
            });
        });

        // undo/redo
        document.getElementById('undoBtn').addEventListener('click', undo);
        document.getElementById('redoBtn').addEventListener('click', redo);

        // add layer
        document.getElementById('addLayerBtn').addEventListener('click', addLayer);

        // color preview click (open color picker)
        document.getElementById('colorPreview').addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = state.color;
            input.addEventListener('input', function() {
                setColor(this.value);
            });
            input.click();
        });
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

    // ---- init ----
    function init() {
        resizeCanvas();
        // set initial color
        setColor('#000000');
        // initial layer
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveLayerState();
        // set default tool
        setTool('brush');
        setupUI();

        window.addEventListener('resize', () => {
            const oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resizeCanvas();
            ctx.putImageData(oldData, 0, 0);
            currentLayer = oldData;
            applySettings();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
