'use strict';

angularGameApp.factory('config', ['$rootScope', '$window', function ($rootScope, $window) {

  var config = {
    socketUrl : 'http://192.168.1.148',
    socketPort : '8181'
  };

  config.socketAddress = config.socketUrl + ':' + config.socketPort;

  return config;
}]);