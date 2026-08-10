// app.js – full drawing app logic

(function() {
    "use strict";

    // ----- DOM refs -----
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');

    // toolbar buttons
    const toolBtns = document.querySelectorAll('.tool-btn');
    const clearBtn = document.getElementById('clearCanvas');

    // settings
    const sizeSlider = document.getElementById('brushSize');
    const sizeSpan = document.getElementById('sizeValue');
    const opacitySlider = document.getElementById('brushOpacity');
    const opacitySpan = document.getElementById('opacityValue');
    const colorPicker = document.getElementById('brushColor');
    const smoothSlider = document.getElementById('smoothness');
    const smoothSpan = document.getElementById('smoothValue');
    const hardnessSlider = document.getElementById('hardness');
    const hardnessSpan = document.getElementById('hardnessValue');
    const spacingSlider = document.getElementById('spacing');
    const spacingSpan = document.getElementById('spacingValue');
    const flowSlider = document.getElementById('flow');
    const flowSpan = document.getElementById('flowValue');

    // ----- state -----
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let currentTool = 'pen';       // 'pen' , 'eraser', 'text'
    let textInputActive = false;

    // brush settings (mirror UI)
    let brush = {
        size: 8,
        opacity: 1.0,      // 0..1
        color: '#1a1a2e',
        smooth: 4,         // 0..10
        hardness: 0.8,     // 0..1
        spacing: 4,
        flow: 0.9          // 0..1
    };

    // for smoothing (simple averaging)
    let smoothPoints = [];

    // ----- helpers: sync UI to brush object -----
    function updateBrushFromUI() {
        brush.size = parseInt(sizeSlider.value, 10);
        brush.opacity = parseInt(opacitySlider.value, 10) / 100;
        brush.color = colorPicker.value;
        brush.smooth = parseInt(smoothSlider.value, 10);
        brush.hardness = parseInt(hardnessSlider.value, 10) / 100;
        brush.spacing = parseInt(spacingSlider.value, 10);
        brush.flow = parseInt(flowSlider.value, 10) / 100;

        // update value displays
        sizeSpan.textContent = brush.size;
        opacitySpan.textContent = Math.round(brush.opacity * 100) + '%';
        smoothSpan.textContent = brush.smooth;
        hardnessSpan.textContent = Math.round(brush.hardness * 100) + '%';
        spacingSpan.textContent = brush.spacing;
        flowSpan.textContent = Math.round(brush.flow * 100) + '%';
    }

    // update UI sliders from brush (on init)
    function syncUIFromBrush() {
        sizeSlider.value = brush.size;
        opacitySlider.value = brush.opacity * 100;
        colorPicker.value = brush.color;
        smoothSlider.value = brush.smooth;
        hardnessSlider.value = brush.hardness * 100;
        spacingSlider.value = brush.spacing;
        flowSlider.value = brush.flow * 100;
        updateBrushFromUI();
    }

    // ----- drawing primitives -----

    // draw a single dot (with hardness / flow simulated via radial gradient)
    function drawDot(x, y, size, color, opacity, hardness, flow) {
        const radius = size / 2;
        // flow: modulate opacity (simple)
        const finalOpacity = opacity * flow;

        // create radial gradient for hardness
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const alpha = Math.min(1, Math.max(0, finalOpacity));
        if (hardness >= 0.99) {
            // hard edge
            grad.addColorStop(0, color);
            grad.addColorStop(0.99, color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
            const stop = 0.3 + (1 - hardness) * 0.7; // softer = wider falloff
            grad.addColorStop(0, color);
            grad.addColorStop(stop, color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // draw a line from (x1,y1) to (x2,y2) with spacing
    function drawLine(x1, y1, x2, y2, brushSettings) {
        const { size, color, opacity, hardness, spacing, flow } = brushSettings;
        const dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist < 0.01) {
            drawDot(x1, y1, size, color, opacity, hardness, flow);
            return;
        }

        const step = Math.max(1, spacing);
        const steps = Math.max(1, Math.floor(dist / step));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const cx = x1 + (x2 - x1) * t;
            const cy = y1 + (y2 - y1) * t;
            drawDot(cx, cy, size, color, opacity, hardness, flow);
        }
    }

    // smooth: average last N points
    function getSmoothPoint(x, y) {
        smoothPoints.push({ x, y });
        const limit = Math.min(brush.smooth + 1, 12); // cap
        if (smoothPoints.length > limit) {
            smoothPoints.shift();
        }
        let avgX = 0, avgY = 0;
        for (const p of smoothPoints) {
            avgX += p.x;
            avgY += p.y;
        }
        avgX /= smoothPoints.length;
        avgY /= smoothPoints.length;
        return { x: avgX, y: avgY };
    }

    function resetSmooth() {
        smoothPoints = [];
    }

    // ----- main drawing event handlers -----

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
            e.preventDefault();
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        if (textInputActive) return;

        const { x, y } = getCanvasCoords(e);
        isDrawing = true;
        lastX = x;
        lastY = y;
        resetSmooth();

        // if text tool: place text on click (not drag)
        if (currentTool === 'text') {
            isDrawing = false;
            showTextInput(x, y);
            return;
        }

        // pen / eraser: draw a single dot at start
        if (currentTool === 'pen' || currentTool === 'eraser') {
            const color = currentTool === 'eraser' ? '#ffffff' : brush.color;
            drawDot(x, y, brush.size, color, brush.opacity, brush.hardness, brush.flow);
        }
    }

    function draw(e) {
        e.preventDefault();
        if (!isDrawing) return;
        if (currentTool === 'text') return;

        const { x, y } = getCanvasCoords(e);

        // smoothing
        let drawX = x, drawY = y;
        if (brush.smooth > 0) {
            const smoothed = getSmoothPoint(x, y);
            drawX = smoothed.x;
            drawY = smoothed.y;
        } else {
            resetSmooth();
            drawX = x;
            drawY = y;
        }

        const color = currentTool === 'eraser' ? '#ffffff' : brush.color;

        // draw line from last to current
        drawLine(lastX, lastY, drawX, drawY, {
            size: brush.size,
            color: color,
            opacity: brush.opacity,
            hardness: brush.hardness,
            spacing: brush.spacing,
            flow: brush.flow
        });

        lastX = drawX;
        lastY = drawY;
    }

    function stopDrawing(e) {
        e.preventDefault();
        isDrawing = false;
        resetSmooth();
    }

    // ----- text tool -----
    function showTextInput(x, y) {
        if (textInputActive) return;
        textInputActive = true;

        // create an off-canvas input
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type text…';
        input.style.position = 'fixed';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.padding = '12px 20px';
        input.style.fontSize = '1.2rem';
        input.style.border = '2px solid #3b82f6';
        input.style.borderRadius = '40px';
        input.style.background = 'white';
        input.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
        input.style.zIndex = '999';
        input.style.width = '280px';
        input.style.outline = 'none';
        input.style.fontFamily = 'system-ui, sans-serif';

        document.body.appendChild(input);
        input.focus();

        const finishText = () => {
            const text = input.value.trim();
            if (text) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                // convert mouse pos to canvas coords (use stored x,y from click)
                const canvasX = x;
                const canvasY = y;

                ctx.save();
                ctx.font = `${Math.max(16, brush.size * 2.5)}px system-ui, sans-serif`;
                ctx.fillStyle = brush.color;
                ctx.globalAlpha = brush.opacity;
                ctx.textBaseline = 'top';
                ctx.fillText(text, canvasX, canvasY);
                ctx.restore();
            }
            input.remove();
            textInputActive = false;
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishText();
            }
            if (e.key === 'Escape') {
                input.remove();
                textInputActive = false;
            }
        });

        input.addEventListener('blur', () => {
            // if not finished yet, finish on blur
            if (textInputActive) finishText();
        });
    }

    // ----- tool switching -----
    function setTool(tool) {
        currentTool = tool;
        toolBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        // update cursor
        if (tool === 'text') {
            canvas.style.cursor = 'text';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }

    // ----- clear canvas -----
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // ----- init canvas with white bg -----
    function initCanvas() {
        clearCanvas();
    }

    // ----- event binding -----
    function bindEvents() {
        // mouse
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);

        // touch
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing, { passive: false });
        canvas.addEventListener('touchcancel', stopDrawing, { passive: false });

        // tool buttons
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setTool(btn.dataset.tool);
            });
        });

        // clear
        clearBtn.addEventListener('click', clearCanvas);

        // settings
        [sizeSlider, opacitySlider, colorPicker, smoothSlider, hardnessSlider, spacingSlider, flowSlider].forEach(el => {
            el.addEventListener('input', updateBrushFromUI);
        });

        // prevent context menu on canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // window resize: keep canvas crisp (no extra action needed)
    }

    // ----- start -----
    function init() {
        initCanvas();
        syncUIFromBrush();
        setTool('pen');
        bindEvents();
    }

    init();
})();
