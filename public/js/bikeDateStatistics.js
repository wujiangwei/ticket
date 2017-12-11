var app = angular.module('bikeDateStatisticsApp',[

])

app.controller('bikeDateStatisticsCtrl', function ($scope, $http, $location) {

    $scope.clickHereToView = function () {
        var bikeUrl = '/bikeDateStatistics/borrowBikeSucceed';

        $http.post(bikeUrl,{'date':$scope.inputDate}).then(function (result) {

            var response = result.data;
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
            $scope.unlockFaileCount = response.unlockFaileCount;
            $scope.batteryUnlockFaileCount = response.batteryUnlockFaileCount;
            $scope.otherReasons = response.otherReasons

            $scope.returningBikeSuccessCount = response.returningBikeSuccessCount;
            $scope.twoGReturningBikeSuccess = response.twoGReturningBikeSuccess;
            $scope.batteryReturningBikeSuccess = response.batteryReturningBikeSuccess;

            $scope.returningBikeFailure = response.returningBikeFailure;
            $scope.twoGReturningBikeFailure = response.twoGReturningBikeFailure;
            $scope.batteryReturningBikeFailure = response.batteryReturningBikeFailure;
            $scope.notOpenBatteryReBikeFailure = response.notOpenBatteryReBikeFailure;
            $scope.returningBikeTimeout = response.returningBikeTimeout;
            $scope.outSAReBikeFailure = response.outSAReBikeFailure;
            $scope.GPSFailure = response.GPSFailure;
            $scope.otherReasonsFailure = response.otherReasonsFailure;

        }).catch(function (result) { //捕捉错误处理
            console.info(result);
            alert(result.data.Message);
        });
    }

})
