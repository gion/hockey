//var io = require('socket.io').listen(8181);
//var io = require('../components/socket.io').listen(8181);
var io = require('/usr/local/lib/node_modules/socket.io').listen(8181);

io.set('log level', '2');
io.sockets.on('connection', function (socket) {
	socket.user = {};
	socket.emit('set:id', socket.id);

	socket.on('change:name', function (name) {
		socket.user.name = name;
	});



	socket.on('add:user', function(data){
		console.log('add user', data);
		socket.user = data;
		socket.ready = false;

		// first player => new room
		if(!game.games[socket.user.token])
			{
				socket.game = new game(socket.user.token).add(socket);
			}

		// the game exists, this means that he's the second player
		else
			{
				socket.game = game.games[socket.user.token].add(socket);
				socket.game.start();
			}

			socket.game.broadcast('message', socket.user);

		// attach event handlers for the sockets that are "added" to a game

		/*socket.on('ready', function(data){
			socket.ready = true;
			if(!socket.game)
				return;
			console.log('ready', socket.game.getPlayers().filter(function(el){return !el.ready;}).length, socket.user);

			// if all the players are ready start the game
			if(socket.game.getPlayers().length == socket.game.maxPlayerCount && socket.game.getPlayers().filter(function(el){return !el.ready;}).length)
				socket.game.start();
		});*/

		socket.on('change:side', function(data){
			console.log('change:side', data);
			socket.game.emitToOtherThan(socket, 'change:side', data);
		});

		socket.on('lost', function(){
			socket.game.broadcast('gameOver', {
				winner : socket.side == 'left' ? 'right' : 'left'
			});

			setTimeout(function(){
				socket.game.start()
			}, 1000);
		});

		socket.on('disconnect', function(){
			if(socket.game)
				socket.game.disconnect();
		});
	});
});

var game = function(id){
	this.id = id;
	game.games[id] = this;
	game.games.count++;
}
game.games = {
	count : 0
};

game.prototype = {

	maxPlayerCount : 2,

	sides : ['left', 'right'],
	
	getPlayers : function(){
		return io.sockets.clients(this.id);
	},

	add : function(player){
		var players = this.getPlayers();
		
		if(players.length >= this.maxPlayerCount)
			{
				player.emit('error', "room is full");
			}
		else
			// add the player to the room
			{
				// set the player side
				player.user.side = this.sides[players.length];

				// add the player to the room
				player.join(this.id);


				console.log('start',  player.user);

				// "update" the player
				player.emit('initPlayer', player.user);
			}

		return this;
	},

	remove : function(player){
		player.leave(this.id);
		return this;
	},

	start : function(){
		var pace = {
			value : 10,
			randomAngle : Math.random() * 360 * 0.0174532925,
			x : 0,
			y : 0
		},
			values = [Math.cos(pace.randomAngle), Math.sin(pace.randomAngle)],
			absValues = values.map(function(el, i){return Math.abs(el);});

		this.broadcast('startGame', {
			x : values[absValues.indexOf(Math.max.apply(Math, absValues))] * pace.value,
			y : values[absValues.indexOf(Math.min.apply(Math, absValues))] * pace.value
		});
	},

	disconnect : function(){

	},

	broadcast : function(event, data){
		io.sockets.in(this.id).emit(event, data);

		return this;
	},

	emitToOtherThan : function(socketToOmmit, event, data){
		var players = this.getPlayers();
		for(var i=0;i<players.length;i++)
			if(players[i].id != socketToOmmit.id)
				players[i].emit(event, data);

		return this;
	}
};
