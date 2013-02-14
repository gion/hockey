'use strict';

angularGameApp.controller('MainCtrl', function($scope) {
	$scope.token = new Date().getTime().toString().substr(Math.floor(Math.random() * 5), 5);
	$scope.name = 'no-name';
	$scope.$watch('name',function(newVal, oldVal){
		$scope.link = !!newVal ? window.location.toString() + $scope.token + '/' + window.encodeURIComponent(newVal): '';
	});
});

angularGameApp.controller('GameCtrl', function($scope, $routeParams, $q, $timeout) {
	// number of pixels that the "goalkeeper" can move at a time


	var pace = 15,
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
		}

	$scope.waiting = true;
	$scope.playerSide = 'right';

	$scope.mapHeight = 400;
	$scope.mapWidth = 600;

	$scope.goalKeeperY = 125;
	$scope.goalKeeperHeight = 100;


	$scope.a= {b:{c: new Date().getTime()}}

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

	$scope.onTouchStart = touch.start;
	$scope.onTouchMove = touch.move;
	$scope.onTouchend = touch.stop;

	$scope.ballX = 200;
	$scope.ballY = 200;

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
	})



	var ball = {
		frameDuration : 30,
		pace : {
			value : 20,
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
		init : function(){
			ball.el = $('#ball');
			ball.$el = $('.ball', ball.el);
			ball.pace.x = Math.cos(ball.pace.randomAngle) * ball.pace.value;
			ball.pace.y = Math.sin(ball.pace.randomAngle) * ball.pace.value;

			var map = $('.map');

			ball.bounderies = {
				left : ball.$el.width() / 2,
				top : ball.$el.height() / 2,
				right : $scope.mapWidth - ball.$el.width() / 2,
				bottom : $scope.mapHeight - ball.$el.height() / 2
			};

			ball.analyze();
		},
		move : function(){
			$scope.ballY += ball.pace.y;
			$scope.ballX += ball.pace.x;

		//	$scope.ballPosition = 
			ball.analyze();

		},
		analyze : function(){
			var pos = ball.getCoords(),
				gameOver = false;
			if(pos.left <= ball.bounderies.left)
				{
					if($scope.playerSide == 'left')
						{
							if($scope.goalKeeperY > pos.top && $scope.goalKeeperY + $scope.goalKeeperHeight < pos.top)
								{
									ball.pace.x *= -1;
								}
							else
								{
									gameOver = true;
								}
						}
					else
						ball.pace.x *= -1;
				}
			if(pos.left >= ball.bounderies.right)
				{
					if($scope.playerSide == 'right')
						{
							if(pos.top > $scope.goalKeeperY && pos.top < $scope.goalKeeperY + $scope.goalKeeperHeight)
								{
									ball.pace.x *= -1;
								}
							else
								{
									gameOver = true;
								}
						}
					else
						ball.pace.x *= -1;
				}

			if(pos.top >= ball.bounderies.bottom || pos.top <= ball.bounderies.top)
				{
					ball.pace.y *= -1;
				}

		//	var deferred = $q.defer();
			if(!gameOver)
				{

					ball.timeout = $timeout(function(){
						ball.move();
					}, ball.frameDuration);
				}

			else
				console.warn('you lose!');

		//	return deferred.propmise;
		},
		pause : function(){
			window.clearTimeout(ball.timeout);
		},
		resume : function(){
			ball.analyze();
		}
	};

	ball.init();

});
