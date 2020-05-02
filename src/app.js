const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage }  = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
// Express does this behnd the scenes
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

const adminUser = 'Admin';

io.on('connection', (socket) => {
    socket.on('join', ({username, room}, callback) => {
        // Join a room
        const {error, user } = addUser({id: socket.id, username, room});

        if (error) {
            return callback(error);
        }

        socket.join(user.room);
        socket.emit('message', generateMessage(adminUser, 'Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage(adminUser, `${user.username} has joined room!`));
        
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        // Telling user they've joined
        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed');
        }

        const user = getUser(socket.id);

        // Emits event to every connection
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback('Delivered');
    });

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps?q=${location.latitude},${location.longitude}`)); 
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage(adminUser, `${user.username} has left`));
            io.to(user.room).emit('roomData', {
                room : user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(port, () => {
    console.log(`Server is up on port ${port}`);
});
