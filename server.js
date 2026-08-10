const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store rooms and their data
const rooms = {};
const users = {};

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    let currentRoom = null;
    let username = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'join':
                    username = data.username;
                    currentRoom = data.room;
                    
                    console.log(`User ${username} joined room ${currentRoom}`);
                    
                    // Create room if it doesn't exist
                    if (!rooms[currentRoom]) {
                        rooms[currentRoom] = {
                            users: new Map(),
                            drawingData: [],
                            textElements: []
                        };
                    }
                    
                    // Add user to room
                    rooms[currentRoom].users.set(username, ws);
                    
                    // Send existing drawing data to new user
                    ws.send(JSON.stringify({
                        type: 'init',
                        drawingData: rooms[currentRoom].drawingData,
                        textElements: rooms[currentRoom].textElements,
                        users: Array.from(rooms[currentRoom].users.keys())
                    }));
                    
                    // Broadcast user joined
                    broadcastToRoom(currentRoom, {
                        type: 'userJoined',
                        username: username,
                        users: Array.from(rooms[currentRoom].users.keys())
                    }, ws);
                    break;

                case 'draw':
                    if (currentRoom && rooms[currentRoom]) {
                        rooms[currentRoom].drawingData.push(data.data);
                        broadcastToRoom(currentRoom, {
                            type: 'draw',
                            data: data.data
                        });
                    }
                    break;

                case 'text':
                    if (currentRoom && rooms[currentRoom]) {
                        rooms[currentRoom].textElements.push(data.data);
                        broadcastToRoom(currentRoom, {
                            type: 'text',
                            data: data.data
                        });
                    }
                    break;

                case 'clear':
                    if (currentRoom && rooms[currentRoom]) {
                        rooms[currentRoom].drawingData = [];
                        rooms[currentRoom].textElements = [];
                        broadcastToRoom(currentRoom, {
                            type: 'clear'
                        });
                    }
                    break;

                case 'cursor':
                    if (currentRoom && rooms[currentRoom]) {
                        broadcastToRoom(currentRoom, {
                            type: 'cursor',
                            username: username,
                            x: data.x,
                            y: data.y
                        }, ws);
                    }
                    break;

                case 'typing':
                    if (currentRoom && rooms[currentRoom]) {
                        broadcastToRoom(currentRoom, {
                            type: 'typing',
                            username: username,
                            isTyping: data.isTyping
                        }, ws);
                    }
                    break;
                    
                case 'sync':
                    if (currentRoom && rooms[currentRoom]) {
                        // Send all drawing data to requesting user
                        ws.send(JSON.stringify({
                            type: 'init',
                            drawingData: rooms[currentRoom].drawingData,
                            textElements: rooms[currentRoom].textElements,
                            users: Array.from(rooms[currentRoom].users.keys())
                        }));
                    }
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
            // Send error back to client
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process message'
            }));
        }
    });

    ws.on('close', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].users.delete(username);
            broadcastToRoom(currentRoom, {
                type: 'userLeft',
                username: username,
                users: Array.from(rooms[currentRoom].users.keys())
            });
            
            // Clean up empty rooms
            if (rooms[currentRoom].users.size === 0) {
                delete rooms[currentRoom];
            }
        }
    });
});

function broadcastToRoom(room, data, exclude = null) {
    if (rooms[room]) {
        rooms[room].users.forEach((client, username) => {
            if (client !== exclude && client.readyState === WebSocket.OPEN) {
                try {
                    client.send(JSON.stringify(data));
                } catch (e) {
                    console.error('Error broadcasting to user:', username, e);
                }
            }
        });
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});
