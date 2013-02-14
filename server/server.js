var io = require('socket.io').listen(8181);

io.set('log level', '0');
io.sockets.on('connection', function (socket) {

	socket.on('message', function (msg) {
		if(/^\/chat /.test(msg)){
			io.sockets.to('chat').emit('message', '<b>' + socket.info.name + '</b> : ' + msg.replace('/chat ',''));
		}else{
			io.sockets.emit('message', '<b>' + socket.info.name + '</b> : ' + msg);
		}
	});

	socket.on('adduser', function(info){
		socket.info = JSON.parse(info);

		if(/^chat/.test(socket.info.name)){
			socket.join('chat');
		}else{
			socket.join('other');
		}

		socket.broadcast.emit('message', '' + socket.info.name + ' connected...');
	});

	socket.on('disconnect', function(){
		io.sockets.emit('message', socket.info.name + ' disconnected...');
	});
});