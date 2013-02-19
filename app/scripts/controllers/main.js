'use strict';

angularGameApp.controller('MainCtrl', ['$scope', '$rootScope', 'socket', function($scope, $rootScope, socket) {
	$scope.name = 'no-name';
	$scope.games = [{link : "#", name : "no name", inplay : true}, {link : "#", name : "no name", inplay : false} , {link : "#", name : "no name", inplay : true}];

	$scope.$watch(function(){
		return $scope.token + '|' + $scope.name;
	},function(newVal, oldVal){
		$scope.link = !!$scope.name ? window.location.toString() + $scope.token + '/' + window.encodeURIComponent($scope.name): '';
		socket.emit('change:name', $scope.name);
	});
//		window.s = socket;

	socket.on('connect', function(){
		$rootScope.connected = true;
		socket.emit('change:name',$scope.name);
		socket.on('set:id', function(id){
			socket.id = id;
			$scope.token = id;

			socket.emit('add:user', {
				token : $scope.token,
				name : $scope.name
			});

			socket.on('initPlayer', function(){
				console.log('init player from main');
			})
		});
		socket.on('change:games', function(games){
			//console.log('change games', games);
			$scope.games = games;
			//$scope.$apply();
		})
	});
}]);
