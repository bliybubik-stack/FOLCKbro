// ============================================
// APP STATE
// ============================================
const state = {
    username: '',
    room: 'fallback',
    color: '#ff6b6b',
    brushSize: 8,
    opacity: 100,
    font: 'Rubik',
    rightClick: 'nextFont',
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    users: [],
    strokes: [],
    currentStroke: [],
    isTyping: false,
    textInput: null,
    textX: 0,
    textY: 0,
};

// ============================================
// DOM REFS
// ============================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorWheel = document.getElementById('colorWheel');
const wheelCtx = colorWheel.getContext('2d');
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const userList = document.getElementById('userList');
const currentUserDisplay = document.getElementById('currentUserDisplay');
const brushSize = document.getElementById('brushSize');
const sizeValue = document.getElementById('sizeValue');
const brushOpacity = document.getElementById('brushOpacity');
const opacityValue = document.getElementById('opacityValue');
const fontSelect = document.getElementById('fontSelect');
const rightClickAction = document.getElementById('rightClickAction');
const colorPicker = document.getElementById('colorPicker');
const selectedColor = document.getElementById('selectedColor');
const userLabels = document.getElementById('userLabels');

// ============================================
// CANVAS SETUP
// ============================================
function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    redrawAll();
}

function redrawAll() {
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    state.strokes.forEach(stroke => {
        if (stroke.type === 'text') {
            ctx.font = `${stroke.size}px ${stroke.font}`;
            ctx.fillStyle = stroke.color;
            ctx.globalAlpha = stroke.opacity / 100;
            ctx.textBaseline = 'top';
            ctx.fillText(stroke.text, stroke.x, stroke.y);
            ctx.globalAlpha = 1;
        } else if (stroke.type === 'draw') {
            drawStroke(stroke);
        }
    });
}

function drawStroke(stroke) {
    if (stroke.points.length < 2) {
        if (stroke.points.length === 1) {
            ctx.fillStyle = stroke.color;
            ctx.globalAlpha = stroke.opacity / 100;
            ctx.beginPath();
            ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        return;
    }

    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity / 100;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// ============================================
// DRAWING
// ============================================
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        // Right click
        e.preventDefault();
        if (state.rightClick === 'undo') {
            if (state.strokes.length > 0) {
                state.strokes.pop();
                redrawAll();
            }
        } else if (state.rightClick === 'nextFont') {
            const fonts = ['Rubik', 'Arial', 'Courier New', 'Georgia'];
            const currentIndex = fonts.indexOf(state.font);
            state.font = fonts[(currentIndex + 1) % fonts.length];
            fontSelect.value = state.font;
        } else if (state.rightClick === 'eraser') {
            // Simple eraser: draw with white
            const pos = getCanvasPos(e);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, state.brushSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            // Add to strokes as eraser stroke
            state.strokes.push({
                type: 'draw',
                points: [{ x: pos.x, y: pos.y }],
                color: 'white',
                size: state.brushSize * 1.4,
                opacity: 100,
            });
        }
        return;
    }

    const pos = getCanvasPos(e);
    state.isDrawing = true;
    state.lastX = pos.x;
    state.lastY = pos.y;
    state.currentStroke = {
        points: [{ x: pos.x, y: pos.y }],
        color: state.color,
        size: state.brushSize,
        opacity: state.opacity,
        type: 'draw',
    };
});

canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    
    // Update user label position
    updateUserLabel(pos.x, pos.y);

    if (!state.isDrawing) return;

    state.currentStroke.points.push({ x: pos.x, y: pos.y });
    // Draw incrementally
    ctx.strokeStyle = state.color;
    ctx.globalAlpha = state.opacity / 100;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(state.lastX, state.lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    state.lastX = pos.x;
    state.lastY = pos.y;
});

canvas.addEventListener('mouseup', (e) => {
    if (state.isDrawing && state.currentStroke.points.length > 0) {
        state.strokes.push(state.currentStroke);
        state.currentStroke = [];
        state.isDrawing = false;
    }
});

canvas.addEventListener('mouseleave', () => {
    if (state.isDrawing && state.currentStroke.points.length > 0) {
        state.strokes.push(state.currentStroke);
        state.currentStroke = [];
        state.isDrawing = false;
    }
    hideUserLabel();
});

// ============================================
// TEXT INPUT
// ============================================
canvas.addEventListener('click', (e) => {
    if (state.isTyping) return;
    const pos = getCanvasPos(e);
    state.textX = pos.x;
    state.textY = pos.y;
    state.isTyping = true;
    
    // Create text input overlay
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'absolute bg-transparent text-white border border-[#4a4a8a] rounded px-2 py-1 text-base outline-none';
    input.style.left = pos.x + 'px';
    input.style.top = pos.y + 'px';
    input.style.fontFamily = state.font;
    input.style.fontSize = state.brushSize + 6 + 'px';
    input.style.color = state.color;
    input.style.zIndex = 20;
    input.style.minWidth = '100px';
    input.style.background = 'rgba(15, 22, 51, 0.8)';
    input.style.backdropFilter = 'blur(4px)';
    input.placeholder = 'Type text...';
    
    const rect = canvas.getBoundingClientRect();
    input.style.left = (rect.left + pos.x) + 'px';
    input.style.top = (rect.top + pos.y) + 'px';
    input.style.position = 'fixed';
    
    document.body.appendChild(input);
    input.focus();
    
    input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
            const text = input.value.trim();
            if (text) {
                state.strokes.push({
                    type: 'text',
                    text: text,
                    x: pos.x,
                    y: pos.y,
                    color: state.color,
                    size: state.brushSize + 6,
                    font: state.font,
                    opacity: state.opacity,
                });
                redrawAll();
            }
            document.body.removeChild(input);
            state.isTyping = false;
        }
    });
    
    input.addEventListener('blur', () => {
        if (document.body.contains(input)) {
            document.body.removeChild(input);
            state.isTyping = false;
        }
    });
});

// ============================================
// USER LABELS
// ============================================
let userLabelElement = null;

function updateUserLabel(x, y) {
    if (!userLabelElement) {
        userLabelElement = document.createElement('div');
        userLabelElement.className = 'user-label';
        userLabels.appendChild(userLabelElement);
    }
    const rect = canvas.getBoundingClientRect();
    userLabelElement.textContent = state.username || 'You';
    userLabelElement.style.left = (rect.left + x) + 'px';
    userLabelElement.style.top = (rect.top + y) + 'px';
    userLabelElement.style.display = 'block';
}

function hideUserLabel() {
    if (userLabelElement) {
        userLabelElement.style.display = 'none';
    }
}

// ============================================
// COLOR WHEEL
// ============================================
function drawColorWheel() {
    const w = colorWheel.width;
    const h = colorWheel.height;
    const gradient = wheelCtx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.17, '#ff8800');
    gradient.addColorStop(0.33, '#ffff00');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(0.67, '#0088ff');
    gradient.addColorStop(0.83, '#8800ff');
    gradient.addColorStop(1, '#ff0000');
    wheelCtx.fillStyle = gradient;
    wheelCtx.fillRect(0, 0, w, h);
    
    const gradient2 = wheelCtx.createLinearGradient(0, 0, 0, h);
    gradient2.addColorStop(0, 'rgba(255,255,255,0)');
    gradient2.addColorStop(0.5, 'rgba(255,255,255,0)');
    gradient2.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient2.addColorStop(1, 'rgba(0,0,0,1)');
    wheelCtx.fillStyle = gradient2;
    wheelCtx.fillRect(0, 0, w, h);
}

colorWheel.addEventListener('click', (e) => {
    const rect = colorWheel.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * colorWheel.width;
    const y = (e.clientY - rect.top) / rect.height * colorWheel.height;
    const pixel = wheelCtx.getImageData(x, y, 1, 1).data;
    if (pixel[3] > 0) {
        const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
        state.color = hex;
        colorPicker.value = hex;
        selectedColor.style.background = hex;
    }
});

// ============================================
// UI CONTROLS
// ============================================
brushSize.addEventListener('input', () => {
    state.brushSize = parseInt(brushSize.value);
    sizeValue.textContent = state.brushSize;
});

brushOpacity.addEventListener('input', () => {
    state.opacity = parseInt(brushOpacity.value);
    opacityValue.textContent = state.opacity;
});

fontSelect.addEventListener('change', () => {
    state.font = fontSelect.value;
});

rightClickAction.addEventListener('change', () => {
    state.rightClick = rightClickAction.value;
});

colorPicker.addEventListener('input', () => {
    state.color = colorPicker.value;
    selectedColor.style.background = state.color;
});

// ============================================
// PRESETS
// ============================================
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Load preset - different colors for demo
        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bff', '#ff9f43', '#00d2d3', '#a29bfe', '#fd79a8', '#fdcb6e', '#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fdcb6e', '#e84393', '#00cec9', '#fd79a8'];
        const index = parseInt(btn.textContent) - 1;
        state.color = colors[index % colors.length];
        colorPicker.value = state.color;
        selectedColor.style.background = state.color;
    });
});

// ============================================
// LOGIN
// ============================================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim() || 'Anonymous';
    state.username = username;
    currentUserDisplay.textContent = username;
    
    // Add user to list
    state.users = [username, 'Anonymous2', 'User3'];
    renderUserList();
    
    loginScreen.style.opacity = '0';
    setTimeout(() => {
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        setTimeout(() => {
            mainApp.style.opacity = '1';
            resizeCanvas();
        }, 50);
    }, 300);
});

function renderUserList() {
    userList.innerHTML = '';
    state.users.forEach((user, index) => {
        const div = document.createElement('div');
        div.className = 'text-white text-sm flex items-center gap-2';
        const dot = document.createElement('span');
        dot.className = `w-2 h-2 rounded-full ${index === 0 ? 'bg-green-400' : 'bg-[#4a4a8a]'}`;
        div.appendChild(dot);
        const name = document.createTextNode(user);
        div.appendChild(name);
        userList.appendChild(div);
    });
}

// ============================================
// INIT
// ============================================
window.addEventListener('resize', resizeCanvas);
drawColorWheel();

console.log('🖌️ #fallback - FlockMod clone loaded!');
console.log('👤 Join room: fallback');
console.log('🎨 Draw, type text, and collaborate!');
