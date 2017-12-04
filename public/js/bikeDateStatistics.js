var app = angular.module('bikeDateStatisticsApp',[

])

app.controller('bikeDateStatisticsCtrl', function ($scope, $http, $location) {

    var bikeUrl = '/bikeDateStatistics/borrowBikeSucceed';

    $http.get(bikeUrl).then(function (result) {
        var response = result.data;

        if (response.errorId == 0){
            $scope.todayDate = response.date;
            $scope.borrowElectricBikeSCount = response.borrowElectricBikeSCount;
            $scope.twoGBorrowSuccessCount = response.twoGBorrowSuccessCount;
            $scope.bluetoothBorrowElectricBikeSucceedCount = response.bluetoothBorrowElectricBikeSucceedCount;

            $scope.borrowBikeFailureCount = response.borrowBikeFailureCount;
            $scope.offlineBorrowBikeCount = response.offlineBorrowBikeCount;
            $scope.lowPowerBorrowBikeCount = response.lowPowerBorrowBikeCount;
            $scope.redisCBorrowBikeCount = response.redisCBorrowBikeCount;
            $scope.notOpenBluetoothBorrowBikeCount = response.notOpenBluetoothBorrowBikeCount;
            $scope.outSABorrowBikeFailureCount = response.outSABorrowBikeFailureCount;
            $scope.existProcessOrderCount = response.existProcessOrderCount;
        }
        console.info(response);
    }).catch(function (result) { //捕捉错误处理
        console.info(result);
        alert(result.data.Message);
    });
})
