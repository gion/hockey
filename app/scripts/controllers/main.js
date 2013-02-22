'use strict';

angularGameApp.controller('MainCtrl', ['$scope', '$rootScope', 'socket', '$location', function($scope, $rootScope, socket, $location) {
	$scope.name = 'no-name';
	$scope.games = [];

	$scope.$watch(function(){
		return $scope.token + '|' + $scope.name;
	},function(newVal, oldVal){
		$scope.relativeLink = !!$scope.name ? $scope.token + '/' + window.encodeURIComponent($scope.name): '';
		$scope.link = !!$scope.name ? window.location.toString() + $scope.token : '';
		socket.emit('change:name', $scope.name);
	});

	$scope.goToLink = function(){
		$location.path($scope.relativeLink);
	}
//		window.s = socket;

	socket.on('connect', function(){
		$rootScope.connected = true;
		socket.emit('change:name',$scope.name);
		socket.connected = true;

		socket.on('set:id', function(id){
			socket.id = id;
			$scope.token = id;

/*			socket.emit('add:user', {
				token : $scope.token,
				name : $scope.name
			});*/

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
