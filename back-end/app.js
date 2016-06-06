var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var markdown = require('markdown').markdown;
var cors = require('cors');

var routes = require('./routes/index');

var port = 2016;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

app.use(routes);

app.use(function(err, req, res, next) {
    res.status(err.status || 500);

    res.send(err);

    console.log(err);
});

http.listen(port, function() {
    console.log('Server on port: %d', port);
});

io.on('connection', function(socket) {
    console.log('Welcome on: ', socket.id);

    socket.on('update friends', function(id) {
        io.emit('update friends', id);
    });

    // chat
    socket.on('update room info', function(id) {
        io.emit('update room info', id);
    });

    socket.on('send message', function(data) {
        console.log('User: ' + socket.id + ', nickname: ' + data.username + ', send message: ' + data.message + ', date: ' + data.date);

        data.message = markdown.toHTML(data.message);
        io.emit('receive message', data);
    });

    socket.on('typing', function(data) {
        io.emit('typing', data);
    });

    // circle

    socket.on('update rooms', function(members) {
        io.emit('update rooms', members);
    });

    socket.on('update news', function(id) {
        io.emit('update news', id);
    });

    // search
    socket.on('update hints', function(id) {
        io.emit('update hints', id);
    });
});
