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
            }
        } catch (e) {
            console.error('Error processing message:', e);
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
                client.send(JSON.stringify(data));
            }
        });
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
