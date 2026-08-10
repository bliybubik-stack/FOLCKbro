const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));

// Simple room state
const rooms = {
    fallback: {
        strokes: [],
        users: [],
    }
};

// WebSocket handling
wss.on('connection', (ws, req) => {
    const room = 'fallback';
    const username = new URL(req.url, `http://${req.headers.host}`).searchParams.get('username') || 'Anonymous';
    
    // Add user to room
    if (!rooms[room]) {
        rooms[room] = { strokes: [], users: [] };
    }
    rooms[room].users.push(username);
    
    // Send current strokes to new user
    ws.send(JSON.stringify({
        type: 'init',
        strokes: rooms[room].strokes,
        users: rooms[room].users,
        username: username,
    }));
    
    // Broadcast user list update
    broadcastToRoom(room, {
        type: 'users',
        users: rooms[room].users,
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'draw') {
                // Store stroke
                rooms[room].strokes.push(data.stroke);
                // Broadcast to all in room
                broadcastToRoom(room, {
                    type: 'draw',
                    stroke: data.stroke,
                    username: data.username,
                });
            } else if (data.type === 'typing') {
                broadcastToRoom(room, {
                    type: 'typing',
                    username: data.username,
                    isTyping: data.isTyping,
                });
            } else if (data.type === 'cursor') {
                broadcastToRoom(room, {
                    type: 'cursor',
                    username: data.username,
                    x: data.x,
                    y: data.y,
                });
            } else if (data.type === 'clear') {
                rooms[room].strokes = [];
                broadcastToRoom(room, {
                    type: 'clear',
                });
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
    
    ws.on('close', () => {
        // Remove user from room
        rooms[room].users = rooms[room].users.filter(u => u !== username);
        broadcastToRoom(room, {
            type: 'users',
            users: rooms[room].users,
        });
    });
});

function broadcastToRoom(room, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 WebSocket server running on ws://localhost:${PORT}`);
    console.log(`🎨 Join room: fallback`);
});
