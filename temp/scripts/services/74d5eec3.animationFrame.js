'use strict';

angularGameApp.factory('animationFrame', ['$rootScope', '$window', 'config', '$timeout', 'socket', function ($rootScope, $window, config, $timeout, socket) {

    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !$window.reqAnimationFrame; ++x) {
        $window.reqAnimationFrame = $window[vendors[x]+'RequestAnimationFrame'] || $window['requestAnimationFrame'];
        $window.canAnimationFrame = $window[vendors[x]+'CancelAnimationFrame'] || $window[vendors[x]+'CancelRequestAnimationFrame'] || $window['cancelRequestAnimationFrame'] || $window['cancelAnimationFrame'];
    }
    if (!$window.reqAnimationFrame)
        $window.reqAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = 10;//Math.max(0, 16 - (currTime - lastTime));
            var id = setTimeout(function(){ callback(currTime + timeToCall); }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        }

    if (!$window.canAnimationFrame)
        $window.canAnimationFrame = function(id) {
            clearTimeout(id);
        }

    return {
        start : $window.$.proxy($window.reqAnimationFrame, window),
        stop : $window.$.proxy($window.canAnimationFrame, window)
    };
}]);