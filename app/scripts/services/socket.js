'use strict';

angularGameApp.factory('socket', ['$rootScope', '$window', 'config', function ($rootScope, $window, config) {
  var socket = $window.io.connect(config.socketAddress);

  socket.on('log', function(){
    console.error('remote log', arguments);
  });

  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
}]);
