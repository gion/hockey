//var io = require('socket.io').listen(8181);
//var io = require('../components/socket.io').listen(8181);
var io = require('/usr/local/lib/node_modules/socket.io').listen(8181);

//console.log("SERVER STARTED");

io.set('log level', '2');
io.sockets.on('connection', function (socket) {
	socket.user = {};
	socket.emit('set:id', socket.id);
	game.updateGames();

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
			data.timestamp = new Date().getTime();
			data.from = socket.user.name;
			console.log('change:side');
			console.log(data);
			socket.game.emitToOtherThan(socket, 'change:side', data);
		});

		socket.on('lost', function(){
			console.log(socket.user.name + ' has lost ('+ socket.user.side +')');
			var winner = socket.user.side == 'left' ? 'right' : 'left',
				score = [];
			
			socket.game.getPlayers().forEach(function(el, i){
				el.id != socket.id && el.user.score++;
				score.push({name:el.user.name, score:el.user.score});
			});

			socket.game.broadcast('gameOver', {
				winner : winner,
				score : score
			});
		});

		socket.on('restart', function(){
			socket.game.start();	
		});

		socket.on('disconnect', function(){
			if(socket.game)
				socket.game.disconnect();
		});
	});
});

function clone(a) {
   return JSON.parse(JSON.stringify(a));
}

var game = function(id){
	this.id = id;
	game.games[id] = this;
	game.games.count++;
}

game.games = {
	count : 0
};

game.updateGames = function(){
	var games = [];
	for(var id in game.games)
		if(game.games.hasOwnProperty(id) && game.games[id] instanceof game){
			var item = game.games[id],
				players = item.getPlayers();
			if(!players.length)
				continue;
			//console.log(players[0].user.name);
			var name = players[0].user.name ? players[0].user.name : 'no-name',
				namePrefix = 0;


			games.forEach(function(el, i){
				new RegExp(name + '(\\s\\(\\d+\\))?').test(el.name) && namePrefix++;
				console.log(el.name, new RegExp(name + '(\\s\\(\\d+\\))?').test(el.name), namePrefix);
				io.sockets.emit('log', [el.name, new RegExp(name + '(\\s\\(\\d+\\))?').test(el.name), namePrefix]);

			});

			if(namePrefix)
				name += ' ('+ namePrefix +')';

			games.push({
				token : id,
				name : name,
				inplay : players.length >= this.maxPlayerCount
			});
		}
	io.sockets.emit('change:games', games);
}


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

				var remainingSides = clone(this.sides);

				players.forEach(function(el, i){
					if(el.user && el.user.side)
						remainingSides.splice(remainingSides.indexOf(el.user.side), 1);
				});

				// set the player side
				player.user.side = remainingSides[0];
				console.log(player.user.side);

				// add the player to the room
				player.join(this.id);


				console.log('start',  player.user);

				// "update" the player
				player.emit('initPlayer', player.user);
			}
		game.updateGames();
		this.resetScores();

		return this;
	},

	remove : function(player){
		this.resetScores();
		player.leave(this.id);
		game.updateGames();
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
			absValues = values.map(function(el, i){return Math.abs(el);}),
			gamePace = {
				x : values[absValues.indexOf(Math.max.apply(Math, absValues))] * pace.value,
				y : values[absValues.indexOf(Math.min.apply(Math, absValues))] * pace.value
			};

		console.log(gamePace);
		this.broadcast('startGame', gamePace);
		game.updateGames();
	},

	disconnect : function(){
		this.broadcast('error:disconnect', 'sry');

		delete game.games[this.id];
		game.games.count--;
		game.updateGames();
		this.resetScores();

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
	},

	resetScores : function(){
		var players = this.getPlayers();
		for(var i=0;i<players.length;i++)
			players[i].user.score = 0;
	},

	updateGames : function(){
		var games = [];
		for(var id in game.games)
			if(game.games.hasOwnProperty(id) && game.games[id] instanceof game){
				var item = game.games[id],
					players = item.getPlayers();
				if(!players.length)
					continue;
				//console.log(players[0].user.name);
				games.push({
					token : id,
					name : players[0].user.name ? players[0].user.name : 'no-name',
					inplay : item.getPlayers().length >= this.maxPlayerCount
				});
			}
		io.sockets.emit('change:games', games);
	}
};
