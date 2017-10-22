
var app = angular.module('unLockVehicleApp',[

])

app.controller('unLockVehicleCtrl', function ($scope, $http, $location) {
    var map = new AMap.Map('container', {
        resizeEnable: true,
        zoom:11,
        center: [116.397428, 39.90923]
    });
})

