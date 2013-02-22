'use strict';

angularGameApp.controller('GameCtrl', ["$scope",  "$rootScope", "$routeParams", "$q", "$timeout", "socket" , "animationFrame", "$location", "config", 
	function($scope, $rootScope, $routeParams, $q, $timeout, socket, animationFrame, $location, config) {
	// number of pixels that the "goalkeeper" can move at a time
	
	var $ = angular.element,
		pace = 30,
		touch  = {
			first : {
				x : null,
				y : null
			},
			current : {
				x : null,
				y : null
			},
			getCoord : function(e){
				var e = e.originalEvent ? e.originalEvent : e;
				return {
					x : e.touches[0].clientX,
					y : e.touches[0].clientY
				};
			},
			start : function(e){
				touch.first = touch.getCoord(e);
				touch.initialGoalKeeperPos = $scope.goalKeeperY;
				stopEvent(e);
			},
			move : function(e){
				if(touch.first.x && touch.first.y)
					{
						touch.current = touch.getCoord(e);
						touch.updateGoalKeeper();
						stopEvent(e);						
					}
				else
					touch.start(e);
			},
			stop : function(e){
				touch.first = {
					x : null,
					y : null
				};
				touch.current = {x:null, y:null};
				touch.initialGoalKeeperPos = null;
				stopEvent(e);
			},
			updateGoalKeeper : function(){
				if(touch.initialGoalKeeperPos == null || touch.first.x == null || touch.first.y == null || touch.current.x == null || touch.current.y  == null)
					return;

				updateGoalKeeper(touch.initialGoalKeeperPos + touch.current.y - touch.first.y);
			}
		},

		updateGoalKeeper = function(newVal){
			$scope.goalKeeperY =  Math.min($scope.mapHeight - $scope.goalKeeperHeight + 5, Math.max(-5, newVal));
		},

		stopEvent = function(e){
			e.preventDefault();
			e.stopPropagation();
		},



		playSound = function(){
			var sound = 'shout1';
			if (window.HTMLAudioElement) {
				var snd = new Audio('');

				if(snd.canPlayType('audio/ogg')) {
					snd = new Audio('sounds/' + sound + '.ogg');
				}else if(snd.canPlayType('audio/mp3')) {
					snd = new Audio('sounds/' + sound + '.mp3');
				}
				snd.play();
			}else{
				alert('HTML5 Audio is not supported by your browser!');
			}
		}
	$scope.playSound = function(){
		playSound();
	}


	var name = $routeParams.name;
	if(!name)
		{
			name = prompt('And you are...');
			$location.path($routeParams.token + '/' + name);
		}
	else
		name = window.decodeURIComponent(name);
	$scope.name = name;

	$scope.waiting = true;
	$scope.playerSide = 'left';
	$scope.gameOver =  false;

	$scope.mapHeight = 400;
	$scope.mapWidth = 600;

	$scope.goalKeeperY = 150;
	$scope.goalKeeperHeight = 200;


	$scope.onTouchStart = touch.start;
	$scope.onTouchMove = touch.move;
	$scope.onTouchend = touch.stop;

	$scope.ballX = $scope.mapWidth / 2;
	$scope.ballY = $scope.mapHeight / 2;
	$scope.ballPosition = "left:" + $scope.ballX + "px; top:" + $scope.ballY + "px; width:" + config.ballWidth;

	$scope.$watch(function(){
		return $scope.ballX + '|' + $scope.ballY;
	}, function(value){
		$scope.ballPosition = "left:" + $scope.ballX + "px; top:" + $scope.ballY + "px";
		try{
			if(!$scope.$$phase)
				$.scope.$apply();
		} catch(e){
			console.error(e);
		}
	});

	$scope.$watch('player', function(newVal, oldVal){
		try{
			if(newVal.side)
				$scope.playerSide = newVal.side;
			if(newVal.name)
				$scope.name = newVal.name;
		} catch(e){
			window.E = e;
			console.warn(e);
		}
	});

	$scope.score = [];
	$scope.scoreboard = '';

	$scope.$watch(function(){
		return $scope.score && $scope.score.length >= 2 ?$scope.score[0].score + '|' + $scope.score[1].score : '';
	}, function(){
		var newVal = $scope.score;
		if(newVal && newVal.length && newVal.length >= 2)
			$scope.scoreboard = newVal[0].name + ' '  + newVal[0].score + '  -  ' + newVal[1].score + ' ' + newVal[1].name;
	});


	$scope.moveGoalKeeperUp = function(e){
		updateGoalKeeper($scope.goalKeeperY - pace);
	}

	$scope.moveGoalKeeperDown = function(e){
		updateGoalKeeper($scope.goalKeeperY + pace);
	}

	$scope.onMouseWheel = function(e){
		e = e.originalEvent ? e.originalEvent : e;
		var delta = e.detail?  e.detail*(-120) : e.wheelDelta;
		$scope['moveGoalKeeper' + (delta < 0 ? 'Down' : 'Up')]();
	}

	$scope.restartGame = function(e){
		io.emit('restart');
	}

	var io = (function(){
		if(socket.connected)
			{
				socket.emit('add:user', {
					token : $routeParams.token,
					name : $scope.name
				});
			}
		else
			{
				
				socket.on('connect', function(){
					socket.emit('add:user', {
						token : $routeParams.token,
						name : $scope.name
					});

					socket.emit('ready');

				});
			}


		socket.on('initPlayer', function(data){
			console.log('init player', data);
			$scope.playerSide = data.side;
			$scope.name = data.name;
		});

		socket.on('change:side', function(data){
			ball.pause();
			
			ball.notified = false;
			
			console.log('changeSide', data);
			ball.pace = data.pace;
			$scope.ballY = data.position.top;
			$scope.ballX = $scope.playerSide == 'left' 
							? $scope.mapWidth - data.position.left + config.ballWidth
							: data.position.left - $scope.mapWidth;
			ball.resume();
		});

		socket.on('gameOver', function(data){
			console.log('gameOver', data);
			var winner = $scope.playerSide == data.winner;
			$scope.won = winner ? 'won :)' : 'lost :(';
			$scope.gameOver = true;
			$scope.score = data.score;
			console.error($scope.won,data);
		});

		socket.on('startGame', function(data){
			$scope.ballX = $scope.mapWidth / 2;
			$scope.ballY = $scope.mapHeight / 2;

			if($scope.playerSide == 'right')
				$scope.ballX -= $scope.mapWidth; 
			ball.pace.x = ($scope.playerSide == 'left' ? 1 : -1) * data.x;
			ball.pace.y = data.y;
		//	console.log(ball.pace.x, ball.pace.y);
			$scope.gameOver = false;
			$scope.waiting = false;
			ball.notified = false;
			console.log('startGame', data, ball.pace);
			ball.init();
			if($scope.playerSide =='left')
				ball.analyze();
		});

		socket.on('error:disconnect', function(data){
			var wait = confirm("sry, but your opponent has been disconnected. Do You want to wait for other players to join?");
			if(!wait)
				window.location = '';
		});

		if($rootScope.connected)
			socket.emit('ready');

		return {
			notifyServer : function(){
				socket.emit('change:side', {
					pace : {
						x : ball.pace.x,
						y : ball.pace.y
					},
					position : ball.getCoords()					
				})
			},
			emit : socket.emit,
			on : socket.on,
			trigger : socket.emit
		}
	})();

	var ball = {
		frameDuration : 30,
		pace : {
			value : 10,
			randomAngle : Math.random() * 360 * 0.0174532925,
			x : 0,
			y : 0
		},
		getCoords : function(){
			return {
				left : $scope.ballX,
				top : $scope.ballY
			};
		},
		setCoords : function(pos){
			$scope.ballX = pos.left;
			$scope.ballY = pos.top;
		},

		// function that handles any config modification 
		// when the goalkeeper saves the ball
		levelUp : function(){
			var goalKeeperPace = 10;
			var ballPaceFactor = 1.1;


			ball.pace.x *= ballPaceFactor;
			ball.pace.y *= ballPaceFactor;

			if($scope.goalKeeperHeight < goalKeeperPace * 3)
				return;

			$scope.goalKeeperY += goalKeeperPace / 2;
			$scope.goalKeeperHeight -= goalKeeperPace;
		},

		init : function(generateBallPosition){
			ball.el = $('#ball');
			ball.$el = $('.ball', ball.el);
			

			
					
			$scope.goalKeeperY = 150;
			$scope.goalKeeperHeight = 200;
			
			ball.bounderies = {
				left : ball.$el.width() / 2,
				top : ball.$el.height() / 2,
				right : $scope.mapWidth - ball.$el.width() / 2,
				bottom : $scope.mapHeight - ball.$el.height() / 2
			};

			if(generateBallPosition)
				{
					var values = [Math.cos(ball.pace.randomAngle), Math.sin(ball.pace.randomAngle)],
						absValues = $.map(values, function(){return Math.abs(arguments[0]);});
					ball.pace.x = values[$.inArray(Math.max.apply(Math, absValues), absValues)] * ball.pace.value;
					ball.pace.y = values[$.inArray(Math.min.apply(Math, absValues), absValues)]  * ball.pace.value;
				}

		//	ball.analyze();
		},
		move : function(){
			
			ball.pause();

			var	targetedFps = 40,
				expectedTimeDiff = 1000 / targetedFps,
				now = new Date().getTime(),
				timeDiff = ball.lastMoveTimestamp ? now - ball.lastMoveTimestamp : expectedTimeDiff,
				scale = timeDiff / expectedTimeDiff; 

			//	console.log(timeDiff, scale);


			ball.lastMoveTimestamp = now;
			
			


			$scope.ballY += ball.pace.y * scale;
			$scope.ballX += ball.pace.x * scale;

			$scope.$apply();

		//	$scope.ballPosition = 
			ball.analyze();

		},
		analyze : function(){
			var pos = ball.getCoords(),
				gameOver = false;

			// if the ball exeedes the left boundery
			if(pos.left <= ball.bounderies.left)
				{
					// if you're on the left side
					if($scope.playerSide == 'left')
						{
							// if your goalkeeper saves the goal
							if(pos.top > $scope.goalKeeperY && pos.top < $scope.goalKeeperY + $scope.goalKeeperHeight)
								{
									// reject the ball (change it's direction)
									ball.pace.x *= -1;

									// make the game more interesting >:)
									ball.levelUp();
									playSound();

									console.info('I\'m left and I rejected the ball!');
								}
							else 
								{
									// boo
									gameOver = true;
									console.info('I\'m left and I suck!');
								}
						}
					// if the ball is going to the other player
					else if(ball.pace.x < 0)
						{

							console.log('OUT (I\'m right)');

							// if the server hasn't been already notified
							if(!ball.notified)
								{
									// update the notified flag, so we only notify the server once
									ball.notified = true;

									console.log('NOTIFY');
									// notify the server to send the ball to the other player's court
									io.notifyServer();
								}
							// the server is notified and the ball isn't visible in our court any more
							else if(pos.left + ball.$el.width() < 0)
								{
									// don't update the ball... we can't see it. 
									// just wait for it to come back to our cort
									ball.pause(true);
								}
						}
				}

			// if the ball exeedes the right boundery
			else if(pos.left >= ball.bounderies.right)
				{
					// if you're on the right side
					if($scope.playerSide == 'right')
						{
							// if your goalkeeper saves the goal
							if(pos.top > $scope.goalKeeperY && pos.top < $scope.goalKeeperY + $scope.goalKeeperHeight)
								{
									// reject the ball (change it's direction)
									ball.pace.x *= -1;

									// make the game more interesting >:)
									ball.levelUp();
									playSound();
									console.info('I\'m right and I rejected the ball!');
								}
							else 
								{
									// boo
									gameOver = true;
									console.info('I\'m right and I suck!');

								}
						}
					// if the ball is going to the other player
					else if(ball.pace.x > 0)
						{

							console.log('OUT (I\'m left)');


							// if the server hasn't been already notified
							if(!ball.notified)
								{
									// update the notified flag, so we only notify the server once
									ball.notified = true;

									// notify the server to send the ball to the other player's court
									console.log('NOTIFY 2');
									io.notifyServer();
								}
							// the server is notified and the ball isn't visible in our court any more
							else if(pos.left - ball.$el.width() > $scope.mapWidth)
								{
									// don't update the ball... we can't see it. 
									// just wait for it to come back to our cort
									ball.pause(true);

								}
						}
				}

			if(pos.top >= ball.bounderies.bottom || pos.top <= ball.bounderies.top)
				{
					ball.pace.y *= -1;
				}

		//	var deferred = $q.defer();
			if(!gameOver)
				{
					ball.timeout = animationFrame.start(function(){
						ball.move();	
					});
				}

			else
				{
					io.emit('lost');
					ball.pause(true);
				}

		//	return deferred.propmise;
		},
		pause : function(force){
			animationFrame.stop(ball.timeout);
			if(force){
				ball.lastMoveTimestamp = 0;
				setTimeout(function(){
					animationFrame.stop(ball.timeout);
				},0)
			}
		},
		resume : function(){
			ball.analyze();
		}
	}


	$scope.ball = ball;
	$scope.io = io;
	$scope.$timeout = $timeout;
	$scope.socket = socket;


}]);
