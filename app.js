class CollabDraw {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('canvasContainer');
        
        // State
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentTool = 'brush';
        this.currentColor = '#ff6b6b';
        this.brushSize = 8;
        this.opacity = 100;
        this.fontFamily = 'Rubik';
        this.isTextMode = false;
        this.textInput = document.getElementById('textInput');
        this.textInputContainer = document.getElementById('textInputContainer');
        this.textPosition = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // User
        this.username = '';
        this.room = '';
        this.ws = null;
        this.users = [];
        this.cursors = {};
        this.typingUsers = {};
        this.typingTimeout = null;
        
        // Drawing data
        this.drawingData = [];
        this.textElements = [];
        this.pendingDrawData = [];
        this.isInitialized = false;
        
        // Load saved data
        this.loadSavedData();
        this.init();
    }
    
    init() {
        this.setupLogin();
        this.setupCanvas();
        this.setupTools();
        this.setupSettings();
        this.setupPresets();
        this.setupResize();
    }
    
    loadSavedData() {
        try {
            // Load saved login data
            const savedUsername = localStorage.getItem('collabdraw_username');
            const savedRoom = localStorage.getItem('collabdraw_room');
            const savedPassword = localStorage.getItem('collabdraw_password');
            
            if (savedUsername) {
                document.getElementById('username').value = savedUsername;
            }
            if (savedRoom) {
                document.getElementById('room').value = savedRoom;
            }
            if (savedPassword) {
                document.getElementById('password').value = savedPassword;
            }
            
            // Load saved settings
            const savedSettings = localStorage.getItem('collabdraw_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.brushSize) {
                    this.brushSize = settings.brushSize;
                    document.getElementById('brushSize').value = settings.brushSize;
                    document.getElementById('sizeDisplay').textContent = settings.brushSize;
                }
                if (settings.opacity) {
                    this.opacity = settings.opacity;
                    document.getElementById('opacity').value = settings.opacity;
                    document.getElementById('opacityDisplay').textContent = settings.opacity + '%';
                }
                if (settings.font) {
                    this.fontFamily = settings.font;
                    document.getElementById('fontSelect').value = settings.font;
                }
                if (settings.color) {
                    this.currentColor = settings.color;
                    document.getElementById('colorPicker').value = settings.color;
                }
            }
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                brushSize: this.brushSize,
                opacity: this.opacity,
                font: this.fontFamily,
                color: this.currentColor
            };
            localStorage.setItem('collabdraw_settings', JSON.stringify(settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }
    
    setupLogin() {
        const form = document.getElementById('loginForm');
        const statusEl = document.getElementById('connectionStatus');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            this.username = document.getElementById('username').value.trim() || 'Anonymous';
            const password = document.getElementById('password').value;
            this.room = document.getElementById('room').value.trim() || 'fallback';
            
            // Save login data to localStorage
            try {
                localStorage.setItem('collabdraw_username', this.username);
                localStorage.setItem('collabdraw_room', this.room);
                if (password) {
                    localStorage.setItem('collabdraw_password', password);
                } else {
                    localStorage.removeItem('collabdraw_password');
                }
            } catch (e) {
                console.error('Error saving login data:', e);
            }
            
            statusEl.textContent = 'Connecting...';
            statusEl.style.color = '#ffd93d';
            
            this.connectWebSocket();
        });
        
        // Auto-login if saved data exists
        const savedUsername = localStorage.getItem('collabdraw_username');
        const savedRoom = localStorage.getItem('collabdraw_room');
        if (savedUsername && savedRoom) {
            // Don't auto-login, just fill the fields
        }
    }
    
    connectWebSocket() {
        // Close existing connection if any
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}`;
            
            console.log('Connecting to WebSocket:', wsUrl);
            this.ws = new WebSocket(wsUrl);
            
            // Set connection timeout
            const connectionTimeout = setTimeout(() => {
                if (!this.isConnected) {
                    this.ws.close();
                    this.showConnectionError('Connection timeout. Please try again.');
                }
            }, 5000);
            
            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('WebSocket connected successfully');
                
                // Send join message
                this.ws.send(JSON.stringify({
                    type: 'join',
                    username: this.username,
                    room: this.room,
                    password: document.getElementById('password').value || ''
                }));
                
                // Update UI
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                document.getElementById('currentUserDisplay').textContent = `You (${this.username})`;
                document.getElementById('connectionStatus').textContent = '';
                
                // Update connection indicator
                const indicator = document.getElementById('connectionStatusIndicator');
                if (indicator) {
                    indicator.textContent = '● Connected';
                    indicator.style.color = '#4CAF50';
                }
                
                this.resizeCanvas();
                this.loadPresets();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                clearTimeout(connectionTimeout);
                this.showConnectionError('Connection error. Please check your network and try again.');
            };
            
            this.ws.onclose = (event) => {
                clearTimeout(connectionTimeout);
                this.isConnected = false;
                console.log('WebSocket disconnected', event.code, event.reason);
                
                // Update connection indicator
                const indicator = document.getElementById('connectionStatusIndicator');
                if (indicator) {
                    indicator.textContent = '● Disconnected';
                    indicator.style.color = '#ff6b6b';
                }
                
                // Attempt to reconnect
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                    console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);
                    setTimeout(() => {
                        if (!this.isConnected) {
                            this.connectWebSocket();
                        }
                    }, delay);
                } else {
                    this.showConnectionError('Failed to reconnect after multiple attempts. Please refresh the page.');
                }
            };
        } catch (e) {
            console.error('Error creating WebSocket:', e);
            this.showConnectionError('Failed to create connection. Please check your network.');
        }
    }
    
    showConnectionError(message) {
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.textContent = '❌ ' + message;
            statusEl.style.color = '#ff6b6b';
        }
        const indicator = document.getElementById('connectionStatusIndicator');
        if (indicator) {
            indicator.textContent = '● Error';
            indicator.style.color = '#ff6b6b';
        }
    }
    
    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'init':
                this.drawingData = data.drawingData || [];
                this.textElements = data.textElements || [];
                this.users = data.users || [];
                this.isInitialized = true;
                this.updateUsersList();
                this.redrawAll();
                break;
                
            case 'userJoined':
                this.users = data.users;
                this.updateUsersList();
                break;
                
            case 'userLeft':
                this.users = data.users;
                this.updateUsersList();
                if (this.cursors[data.username]) {
                    this.cursors[data.username].remove();
                    delete this.cursors[data.username];
                }
                break;
                
            case 'draw':
                this.drawingData.push(data.data);
                this.redrawAll();
                break;
                
            case 'text':
                this.textElements.push(data.data);
                this.redrawAll();
                break;
                
            case 'clear':
                this.drawingData = [];
                this.textElements = [];
                this.redrawAll();
                break;
                
            case 'cursor':
                this.updateCursor(data.username, data.x, data.y);
                break;
                
            case 'typing':
                this.updateTypingIndicator(data.username, data.isTyping);
                break;
                
            case 'error':
                console.error('Server error:', data.message);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    setupCanvas() {
        this.canvas.addEventListener('mousedown', this.startDraw.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDraw.bind(this));
        this.canvas.addEventListener('mouseleave', this.stopDraw.bind(this));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        this.textInput.addEventListener('keydown', this.handleTextInput.bind(this));
        this.textInput.addEventListener('blur', () => {
            if (this.isTextMode) {
                this.textInputContainer.style.display = 'none';
                this.isTextMode = false;
                this.textPosition = null;
                this.sendTypingStatus(false);
            }
        });
    }
    
    startDraw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        if (e.button === 2) {
            this.handleRightClick(e);
            return;
        }
        
        if (this.currentTool === 'text') {
            this.startTextMode(x, y);
            return;
        }
        
        this.isDrawing = true;
        this.lastX = x;
        this.lastY = y;
        
        if (this.currentTool === 'brush') {
            this.drawDot(x, y);
        }
    }
    
    draw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        // Send cursor position
        this.sendCursorPosition(x, y);
        
        if (!this.isDrawing || this.currentTool === 'text') return;
        
        if (this.currentTool === 'brush') {
            this.drawLine(this.lastX, this.lastY, x, y);
            this.lastX = x;
            this.lastY = y;
        } else if (this.currentTool === 'eraser') {
            this.eraseAt(x, y);
            this.lastX = x;
            this.lastY = y;
        }
    }
    
    stopDraw(e) {
        if (this.isDrawing) {
            this.isDrawing = false;
            // Save the drawing stroke
            this.sendDrawData();
        }
    }
    
    drawDot(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.currentColor;
        this.ctx.globalAlpha = this.opacity / 100;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
    
    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.globalAlpha = this.opacity / 100;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
    
    eraseAt(x, y) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }
    
    startTextMode(x, y) {
        this.textPosition = { x, y };
        this.textInputContainer.style.display = 'block';
        const rect = this.canvas.getBoundingClientRect();
        this.textInputContainer.style.left = (e.clientX - rect.left) + 'px';
        this.textInputContainer.style.top = (e.clientY - rect.top) + 'px';
        this.textInput.style.fontFamily = this.fontFamily;
        this.textInput.style.color = this.currentColor;
        this.textInput.style.fontSize = this.brushSize * 3 + 'px';
        this.textInput.value = '';
        this.textInput.focus();
        this.isTextMode = true;
        
        // Notify others of typing
        this.sendTypingStatus(true);
    }
    
    handleTextInput(e) {
        if (e.key === 'Enter') {
            const text = this.textInput.value.trim();
            if (text) {
                const textData = {
                    x: this.textPosition.x,
                    y: this.textPosition.y,
                    text: text,
                    color: this.currentColor,
                    font: this.fontFamily,
                    size: this.brushSize * 3
                };
                
                this.textElements.push(textData);
                this.sendTextData(textData);
                this.redrawAll();
            }
            
            this.textInputContainer.style.display = 'none';
            this.isTextMode = false;
            this.textPosition = null;
            this.sendTypingStatus(false);
        } else if (e.key === 'Escape') {
            this.textInputContainer.style.display = 'none';
            this.isTextMode = false;
            this.textPosition = null;
            this.sendTypingStatus(false);
        }
    }
    
    handleRightClick(e) {
        const action = document.getElementById('rightClickAction').value;
        if (action === 'nextFont') {
            const select = document.getElementById('fontSelect');
            const index = (select.selectedIndex + 1) % select.options.length;
            select.selectedIndex = index;
            this.fontFamily = select.value;
            this.saveSettings();
        } else if (action === 'undoStroke') {
            // Undo last stroke
            let lastIndex = -1;
            for (let i = this.drawingData.length - 1; i >= 0; i--) {
                if (this.drawingData[i].type === 'brush') {
                    lastIndex = i;
                    break;
                }
            }
            if (lastIndex !== -1) {
                this.drawingData.splice(lastIndex, 1);
                this.redrawAll();
                // Send clear and resync
                this.sendClearData();
                // Resend all remaining drawing data
                this.drawingData.forEach(data => {
                    if (data.type === 'brush') {
                        this.sendDrawData(data);
                    }
                });
                // Resend text data
                this.textElements.forEach(data => {
                    this.sendTextData(data);
                });
            }
        }
    }
    
    redrawAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all strokes
        this.drawingData.forEach(data => {
            if (data.type === 'brush') {
                this.ctx.beginPath();
                this.ctx.moveTo(data.x1, data.y1);
                this.ctx.lineTo(data.x2, data.y2);
                this.ctx.strokeStyle = data.color;
                this.ctx.lineWidth = data.size;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.globalAlpha = data.opacity / 100;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1;
            }
        });
        
        // Redraw all text
        this.textElements.forEach(data => {
            this.ctx.save();
            this.ctx.font = `${data.size}px ${data.font}`;
            this.ctx.fillStyle = data.color;
            this.ctx.fillText(data.text, data.x, data.y);
            this.ctx.restore();
        });
    }
    
    sendDrawData(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Store pending data to send when reconnected
            return;
        }
        
        const drawData = data || {
            type: 'brush',
            x1: this.lastX,
            y1: this.lastY,
            x2: this.lastX,
            y2: this.lastY,
            color: this.currentColor,
            size: this.brushSize,
            opacity: this.opacity
        };
        
        this.ws.send(JSON.stringify({
            type: 'draw',
            data: drawData
        }));
    }
    
    sendTextData(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        this.ws.send(JSON.stringify({
            type: 'text',
            data: data
        }));
    }
    
    sendClearData() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        this.ws.send(JSON.stringify({
            type: 'clear'
        }));
    }
    
    sendCursorPosition(x, y) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        // Throttle cursor updates
        if (this._lastCursorUpdate && Date.now() - this._lastCursorUpdate < 50) return;
        this._lastCursorUpdate = Date.now();
        
        this.ws.send(JSON.stringify({
            type: 'cursor',
            x: x / (this.canvas.width / this.container.clientWidth),
            y: y / (this.canvas.height / this.container.clientHeight)
        }));
    }
    
    sendTypingStatus(isTyping) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        this.ws.send(JSON.stringify({
            type: 'typing',
            isTyping: isTyping
        }));
    }
    
    updateCursor(username, x, y) {
        if (username === this.username) return;
        
        // Remove old cursor if exists
        if (this.cursors[username]) {
            this.cursors[username].remove();
        }
        
        // Create new cursor
        const cursor = document.createElement('div');
        cursor.className = 'cursor-indicator';
        cursor.innerHTML = `<div class="cursor-name">${username}</div>`;
        document.body.appendChild(cursor);
        
        // Position
        const rect = this.canvas.getBoundingClientRect();
        const px = rect.left + (x * (rect.width / this.canvas.width));
        const py = rect.top + (y * (rect.height / this.canvas.height));
        cursor.style.left = px + 'px';
        cursor.style.top = py + 'px';
        
        this.cursors[username] = cursor;
    }
    
    updateTypingIndicator(username, isTyping) {
        if (username === this.username) return;
        
        if (isTyping) {
            this.typingUsers[username] = true;
        } else {
            delete this.typingUsers[username];
        }
        
        // Show typing indicator
        const typingUsers = Object.keys(this.typingUsers);
        let indicator = document.querySelector('.typing-indicator');
        
        if (typingUsers.length > 0) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'typing-indicator';
                document.body.appendChild(indicator);
            }
            const names = typingUsers.join(', ');
            indicator.textContent = `${names} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
            indicator.style.display = 'block';
        } else if (indicator) {
            indicator.style.display = 'none';
        }
    }
    
    updateUsersList() {
        const list = document.getElementById('usersList');
        list.innerHTML = '';
        
        // Add current user first
        const currentUserDiv = document.createElement('div');
        currentUserDiv.className = 'user-item current-user';
        currentUserDiv.textContent = `You (${this.username})`;
        list.appendChild(currentUserDiv);
        
        // Add other users
        this.users.forEach(user => {
            if (user !== this.username) {
                const div = document.createElement('div');
                div.className = 'user-item';
                div.textContent = user;
                list.appendChild(div);
            }
        });
    }
    
    setupTools() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool === 'clear') {
                    this.clearCanvas();
                    return;
                }
                
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = tool;
                
                if (tool === 'text') {
                    this.canvas.style.cursor = 'text';
                } else if (tool === 'eraser') {
                    this.canvas.style.cursor = 'cell';
                } else {
                    this.canvas.style.cursor = 'crosshair';
                }
            });
        });
    }
    
    setupSettings() {
        // Brush size
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('sizeDisplay').textContent = this.brushSize;
            this.saveSettings();
        });
        
        // Opacity
        document.getElementById('opacity').addEventListener('input', (e) => {
            this.opacity = parseInt(e.target.value);
            document.getElementById('opacityDisplay').textContent = this.opacity + '%';
            this.saveSettings();
        });
        
        // Font
        document.getElementById('fontSelect').addEventListener('change', (e) => {
            this.fontFamily = e.target.value;
            this.saveSettings();
        });
        
        // Color
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            this.saveSettings();
        });
    }
    
    setupPresets() {
        const grid = document.getElementById('presetsGrid');
        const colors = [
            '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
            '#ff6bb5', '#845ef7', '#ff922b', '#20c997', '#e9ecef',
            '#f06595', '#ffd43b', '#69db7c', '#74c0fc',
            '#da77f2', '#ffa94d', '#38d9a9', '#adb5bd', '#ffffff'
        ];
        
        for (let i = 0; i < 18; i++) {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.style.background = colors[i % colors.length];
            btn.dataset.color = colors[i % colors.length];
            btn.textContent = i + 1;
            
            btn.addEventListener('click', () => {
                document.getElementById('colorPicker').value = btn.dataset.color;
                this.currentColor = btn.dataset.color;
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.saveSettings();
            });
            
            btn.addEventListener('mousedown', (e) => {
                // Hold to set color
                let timeout = setTimeout(() => {
                    const color = btn.dataset.color;
                    document.getElementById('colorPicker').value = color;
                    this.currentColor = color;
                    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.saveSettings();
                }, 500);
                
                const clearTimeoutHandler = () => clearTimeout(timeout);
                btn.addEventListener('mouseup', clearTimeoutHandler, { once: true });
                btn.addEventListener('mouseleave', clearTimeoutHandler, { once: true });
            });
            
            grid.appendChild(btn);
        }
    }
    
    loadPresets() {
        // Load preset colors from memory if any
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    setupResize() {
        window.addEventListener('resize', this.resizeCanvas.bind(this));
    }
    
    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * 2;
        this.canvas.height = rect.height * 2;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(2, 2);
        
        // Redraw everything
        this.redrawAll();
    }
    
    clearCanvas() {
        if (confirm('Clear the entire canvas?')) {
            this.drawingData = [];
            this.textElements = [];
            this.redrawAll();
            this.sendClearData();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CollabDraw();
});
