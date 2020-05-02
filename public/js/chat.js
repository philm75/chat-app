const socket = io();

// Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = document.querySelector('input'); 
const $messageFormButton = document.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#side-bar-template').innerHTML;

// Options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true});

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Get height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
    
    const visibleHeight = $messages.offsetHeight;
    const containerHeight = $messages.scrollHeight;
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
}

// Events
socket.on('message', (message) => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('DD-MM-YYYY HH:mm:ss') 
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', (message) => {
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('DD-MM-YYYY HH:mm:ss') 
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({ room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users 
    });
    document.querySelector('#side-bar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    $messageFormButton.setAttribute('disabled', 'disabled');

    const message = e.target.elements.message.value;
    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.value = '';
        $messageFormInput.focus();

        if (error) {
            return console.log(error);
        }
    });
});

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation not supported');
    }
    $sendLocationButton.setAttribute('disabled', 'disabled');
    navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude} = position.coords;
        socket.emit('sendLocation', {latitude, longitude}, () => {
            console.log('Location shared');
            $sendLocationButton.removeAttribute('disabled');
        });
    });
});

socket.emit('join', {username, room}, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});