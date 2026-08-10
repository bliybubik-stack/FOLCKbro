// app.js – drawing app with FlockMod style

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
        // reset drawing style
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // apply current settings
        applySettings();
    }

    // ---- tool settings (defaults from screenshot) ----
    const settings = {
        size: 8,
        opacity: 100,
        blur: 0,
        smoothing: 0,
        gap: 0,
        pressure: 100,
        color: '#ffffff',
    };

    // ---- DOM references for display ----
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
        // blur simulation: we use shadowBlur (canvas native)
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        // smoothing: canvas does not have direct 'smoothing' for strokes,
        // but we can set imageSmoothingQuality (affects images, not lines).
        // We'll ignore smoothing for strokes (just keep as is).
        // gap is not used in canvas line drawing (it's a brush spacing param)
        // pressure is also not directly used (we keep for display)
        ctx.strokeStyle = settings.color;
        ctx.fillStyle = settings.color;
    }

    // ---- drawing state ----
    let isDrawing = false;
    let lastX = 0, lastY = 0;

    // ---- get canvas coordinates (in CSS pixels) ----
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
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;
        // draw a dot (for single click)
        ctx.beginPath();
        ctx.arc(x, y, settings.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = settings.color;
        ctx.globalAlpha = settings.opacity / 100;
        ctx.shadowBlur = settings.blur;
        ctx.shadowColor = settings.color;
        ctx.fill();
        // reset for stroke
        ctx.beginPath();
        ctx.moveTo(x, y);
        // apply stroke settings
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
        // apply gap (if gap > 0, skip drawing if distance < gap)
        if (settings.gap > 0) {
            const dx = x - lastX;
            const dy = y - lastY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < settings.gap) {
                // still update last position? We'll keep lastX/Y for continuity
                // but we don't draw.
                // Actually we want to skip drawing but keep last point?
                // Better: don't update lastX/Y so we don't lose the point.
                return;
            }
        }
        ctx.lineTo(x, y);
        ctx.stroke();
        // update last position
        lastX = x;
        lastY = y;
        // for next segment, begin new path to avoid connecting across gaps
        ctx.beginPath();
        ctx.moveTo(x, y);
        // re-apply stroke settings (they persist but just in case)
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
        }
    }

    // ---- event listeners (mouse + touch) ----
    function attachEvents() {
        // mouse
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        // touch
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);
        // prevent context menu on right-click (we want to keep "отменить штрих" in UI)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // in FlockMod, right-click "undo stroke" – we implement undo last stroke
            undoLastStroke();
        });
    }

    // ---- UNDO (right-click "Отменить штрих") ----
    let strokeHistory = [];

    function saveStroke() {
        // save the current canvas as an image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        strokeHistory.push(imageData);
        // limit history to 20 strokes (to avoid memory issues)
        if (strokeHistory.length > 20) {
            strokeHistory.shift();
        }
    }

    function undoLastStroke() {
        if (strokeHistory.length === 0) return;
        // restore previous state
        const prev = strokeHistory.pop();
        ctx.putImageData(prev, 0, 0);
        // re-apply settings (since putImageData resets style)
        applySettings();
        // also reset drawing state
        isDrawing = false;
        ctx.beginPath();
    }

    // ---- override start/stop to save history ----
    const originalStart = startDrawing;
    startDrawing = function(e) {
        // save state before drawing new stroke (if we are not drawing)
        if (!isDrawing) {
            // we save the current canvas as a "before stroke" state
            // but we want to save after the stroke ends, easier: save on stop
            // we'll use a flag to save once per stroke
            this._strokeSaved = false;
        }
        originalStart.call(this, e);
    };

    // override stopDrawing to save stroke
    const originalStop = stopDrawing;
    stopDrawing = function(e) {
        if (isDrawing) {
            // save the stroke (after drawing)
            saveStroke();
            this._strokeSaved = true;
        }
        originalStop.call(this, e);
    };

    // ---- right-click undo (calls undoLastStroke) ----
    // already attached via contextmenu event

    // ---- preset loading (click on numbers) ----
    function setupPresets() {
        const presetCells = document.querySelectorAll('#sidebar .grid span');
        presetCells.forEach((cell, index) => {
            const presetNumber = index + 1;
            cell.addEventListener('click', function(e) {
                // load preset: just a demo – we change size and color based on number
                const size = 4 + (presetNumber % 10);
                const hue = (presetNumber * 25) % 360;
                settings.size = Math.min(40, Math.max(2, size));
                settings.color = `hsl(${hue}, 80%, 60%)`;
                // update displays
                updateDisplays();
                applySettings();
                // visual feedback: flash border
                this.style.borderColor = '#8888ff';
                setTimeout(() => { this.style.borderColor = '#3a3a44'; }, 200);
            });
            // hold to set (right-click or long press) – we use right-click for undo, so we use "hold" via mousedown + timer
            let holdTimer = null;
            cell.addEventListener('mousedown', function(e) {
                if (e.button === 0) { // left click
                    holdTimer = setTimeout(() => {
                        // "Удерживайте для установки" – set current settings to this preset number
                        const size = 4 + (presetNumber % 10);
                        const hue = (presetNumber * 25) % 360;
                        settings.size = Math.min(40, Math.max(2, size));
                        settings.color = `hsl(${hue}, 80%, 60%)`;
                        updateDisplays();
                        applySettings();
                        this.style.borderColor = '#ffaa44';
                        setTimeout(() => { this.style.borderColor = '#3a3a44'; }, 400);
                    }, 600);
                }
            });
            cell.addEventListener('mouseup', function(e) {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
            });
            cell.addEventListener('mouseleave', function(e) {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
            });
            // touch support for hold
            let touchTimer = null;
            cell.addEventListener('touchstart', function(e) {
                touchTimer = setTimeout(() => {
                    const size = 4 + (presetNumber % 10);
                    const hue = (presetNumber * 25) % 360;
                    settings.size = Math.min(40, Math.max(2, size));
                    settings.color = `hsl(${hue}, 80%, 60%)`;
                    updateDisplays();
                    applySettings();
                    this.style.borderColor = '#ffaa44';
                    setTimeout(() => { this.style.borderColor = '#3a3a44'; }, 400);
                }, 600);
            }, { passive: true });
            cell.addEventListener('touchend', function(e) {
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
            });
            cell.addEventListener('touchcancel', function(e) {
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
            });
        });
    }

    // ---- init ----
    function init() {
        resizeCanvas();
        // set default color
        settings.color = '#ffffff';
        applySettings();
        updateDisplays();
        attachEvents();
        setupPresets();

        // handle window resize
        window.addEventListener('resize', () => {
            // save current drawing before resize?
            // we save canvas data to restore after resize
            const oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resizeCanvas();
            // restore image data (scaled)
            ctx.putImageData(oldData, 0, 0);
            applySettings();
        });

        // extra: click on color wheel mock – change color (demo)
        const wheel = document.querySelector('.color-wheel-mock');
        if (wheel) {
            wheel.addEventListener('click', function() {
                const hue = Math.floor(Math.random() * 360);
                settings.color = `hsl(${hue}, 80%, 60%)`;
                applySettings();
                updateDisplays();
            });
        }
    }

    // wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
