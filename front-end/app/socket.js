app
    .factory('socket', ['socketFactory', function(socketFactory) {
        var socket = io.connect('http://localhost:2016');

        mySocket = socketFactory({
            ioSocket: socket
        });

        return mySocket;
    }]);
