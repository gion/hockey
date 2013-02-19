'use strict';

angularGameApp.controller('GameCtrl', ["$scope",  "$rootScope", "$routeParams", "$q", "$timeout", "socket", function($scope, $rootScope, $routeParams, $q, $timeout, socket) {
	// number of pixels that the "goalkeeper" can move at a time

	//window.X = 1;
	var pace = 30,
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
		};


	$scope.name = $routeParams.name || 'unnamed';
	$scope.waiting = true;
	$scope.playerSide = 'left';
	$scope.gameOver =  false;

	$scope.mapHeight = 400;
	$scope.mapWidth = 600;

	$scope.goalKeeperY = 125;
	$scope.goalKeeperHeight = 150;

	$scope.onTouchStart = touch.start;
	$scope.onTouchMove = touch.move;
	$scope.onTouchend = touch.stop;

	$scope.ballX = $scope.mapWidth / 2;
	$scope.ballY = $scope.mapHeight / 2;

	$scope.ballPosition = "left:" + $scope.ballX + "px; top:" + $scope.ballY + "px";

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

	$scope.restartGame = function(){
		console.log('client emit restart to server');
		io.emit('restart');
	}
	$scope.all = function(){
		alert('dddddddddd');
	}

	var io = (function(){
		socket.on('connect', function(){

			socket.emit('add:user', {
				token : $routeParams.token,
				name : prompt('And you are...') || 'no-name'
			});

			socket.emit('ready');

		});

		socket.on('initPlayer', function(data){
			console.log('init player', data);
			$scope.playerSide = data.side;
			$scope.name = data.name;
		});

		socket.on('change:side', function(data){
			ball.pause();
			
			ball.notified = false;
			
			console.log('changeSide', data);
			console.log('before' + ball.pace.x + ' after : ' + data.pace.x);
			ball.pace = data.pace;
			$scope.ballY = data.position.top;
			$scope.ballX = $scope.playerSide == 'left' 
							? $scope.mapWidth - data.position.left
							: data.position.left - $scope.mapWidth;
			ball.resume();
		});

		socket.on('gameOver', function(data){
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
				$scope.ballX -= $scope.mapWidth; /*
			$scope.ballX = $scope.playerSide == 'left' ? $scope.mapWidth : 0;
			$scope.ballY = $scope.mapHeight / 2;*/
			ball.pace.x = ($scope.playerSide == 'left' ? 1 : -1) * data.x;
			ball.pace.y = data.y;
			$scope.gameOver = false;
			$scope.waiting = false;
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
					/*	x : $scope.playerSide == 'left'
								? - ball.$el.width()
								: ball.bounderies.left + ball.$el.width(),*/
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
		init : function(generateBallPosition){
			ball.el = $('#ball');
			ball.$el = $('.ball', ball.el);
			

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
		move : function(){if(window.X)return;
			ball.pause();

			$scope.ballY += ball.pace.y;
			$scope.ballX += ball.pace.x;

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
								}
							else 
								{
									// boo
									gameOver = true;
								}
						}
					// if the ball is going to the other player
					else if(ball.pace.x < 0)
						{
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
								}
							else 
								{
									// boo
									gameOver = true;
								}
						}
					// if the ball is going to the other player
					else if(ball.pace.x > 0)
						{
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

					ball.timeout = $timeout(function(){
				//	ball.timeout = setTimeout(function(){
						ball.move();
					}, ball.frameDuration);

				}

			else
				{
					io.emit('lost');
					ball.pause();

	/*				// sample for now
					io.trigger('gameOver', {
						winner : $scope.playerSide == 'left' ? 'right' : 'left',
						score : {
							left : $scope.playerSide == 'right' ? 1 : 0,
							right : $scope.playerSide == 'left' ? 1 : 0
						}
					});*/
				}

		//	return deferred.propmise;
		},
		pause : function(force){
			$timeout.cancel(ball.timeout);
			
			if(force)
				setTimeout(function(){
					$timeout.cancel(ball.timeout);			
				});
		},
		resume : function(){
			ball.analyze();
		}
	};


	$scope.ball = ball;
	$scope.io = io;
	$scope.$timeout = $timeout;
	$scope.socket = socket;


}]);
