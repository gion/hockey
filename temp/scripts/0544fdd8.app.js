'use strict';

var angularGameApp = angular.module('angularGameApp', ['ui'])
	.config(['$routeProvider', function($routeProvider) {
		$routeProvider
			.when('/', {
				templateUrl: 'views/main.html',
				controller: 'MainCtrl'
			})
			.when('/:token', {
				templateUrl: 'views/game.html',
				controller: 'GameCtrl'
			})
			.when('/:token/:name', {
				templateUrl: 'views/game.html',
				controller: 'GameCtrl'
			})
			.otherwise({
				redirectTo: '/'
			});
	}]);
