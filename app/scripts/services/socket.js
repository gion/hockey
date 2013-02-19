'use strict';

angularGameApp.factory('socket', function ($rootScope, $window) {
  var socket = $window.io.connect('http://192.168.1.104:8181');
/*  socket.on('message', function(data){
    console.log('message', data);
  });*/
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
});