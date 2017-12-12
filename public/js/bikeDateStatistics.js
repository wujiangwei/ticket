var app = angular.module('bikeDateStatisticsApp',[

])

app.controller('bikeDateStatisticsCtrl', function ($scope, $http, $location) {

    $scope.clickHereToView = function () {
        var bikeUrl = '/bikeDateStatistics/borrowBikeSucceed';

        $http.post(bikeUrl,{'date':$scope.inputDate}).then(function (result) {

            var response = result.data;
            $scope.borrowElectricBikeSCount = response.borrowElectricBikeSCount;
            $scope.twoGBorrowSuccessCount = response.twoGBorrowSuccessCount;
            $scope.twoG = Math.round(response.twoGBorrowSuccessCount / response.borrowElectricBikeSCount * 10000) / 100.00 + "%"
            $scope.bluetoothBorrowElectricBikeSucceedCount = response.bluetoothBorrowElectricBikeSucceedCount;
            $scope.bluetooth = Math.round(response.bluetoothBorrowElectricBikeSucceedCount / response.borrowElectricBikeSCount * 10000) / 100.00 + "%"

            $scope.borrowBikeFailureCount = response.borrowBikeFailureCount;
            $scope.offlineBorrowBikeCount = response.offlineBorrowBikeCount;
            $scope.offline = Math.round(response.offlineBorrowBikeCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.lowPowerBorrowBikeCount = response.lowPowerBorrowBikeCount;
            $scope.lowPower = Math.round(response.lowPowerBorrowBikeCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.redisCBorrowBikeCount = response.redisCBorrowBikeCount;
            $scope.redisC = Math.round(response.redisCBorrowBikeCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.notOpenBluetoothBorrowBikeCount = response.notOpenBluetoothBorrowBikeCount;
            $scope.notOpenBattery = Math.round(response.notOpenBluetoothBorrowBikeCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.outSABorrowBikeFailureCount = response.outSABorrowBikeFailureCount;
            $scope.outSA = Math.round(response.outSABorrowBikeFailureCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.existProcessOrderCount = response.existProcessOrderCount;
            $scope.existProcess = Math.round(response.existProcessOrderCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.unlockFaileCount = response.unlockFaileCount;
            $scope.unLock = Math.round(response.unlockFaileCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.batteryUnlockFaileCount = response.batteryUnlockFaileCount;
            $scope.batteryUnLock = Math.round(response.batteryUnlockFaileCount / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.otherReasons = response.otherReasons;
            $scope.other = Math.round(response.otherReasons / response.borrowBikeFailureCount * 10000) / 100.00 + "%"

            $scope.returningBikeSuccessCount = response.returningBikeSuccessCount;
            $scope.twoGReturningBikeSuccess = response.twoGReturningBikeSuccess;
            $scope.A = Math.round(response.twoGReturningBikeSuccess / response.returningBikeSuccessCount * 10000) / 100.00 + "%"

            $scope.batteryReturningBikeSuccess = response.batteryReturningBikeSuccess;
            $scope.B = Math.round(response.batteryReturningBikeSuccess / response.returningBikeSuccessCount * 10000) / 100.00 + "%"

            $scope.returningBikeFailure = response.returningBikeFailure;
            $scope.twoGReturningBikeFailure = response.twoGReturningBikeFailure;
            $scope.C = Math.round(response.twoGReturningBikeFailure / response.returningBikeFailure * 10000) / 100.00 + "%"

            $scope.batteryReturningBikeFailure = response.batteryReturningBikeFailure;
            $scope.D = Math.round(response.batteryReturningBikeFailure / response.returningBikeFailure * 10000) / 100.00 + "%"

            $scope.notOpenBatteryReBikeFailure = response.notOpenBatteryReBikeFailure;
            $scope.E = Math.round(response.notOpenBatteryReBikeFailure / response.returningBikeFailure * 10000) / 100.00 + "%"

            $scope.returningBikeTimeout = response.returningBikeTimeout;
            $scope.F = Math.round(response.returningBikeTimeout / response.returningBikeFailure * 10000) / 100.00 + "%"

            $scope.outSAReBikeFailure = response.outSAReBikeFailure;
            $scope.G = Math.round(response.outSAReBikeFailure / response.returningBikeFailure * 10000) / 100.00 + "%"

            $scope.GPSFailure = response.GPSFailure;
            $scope.H = Math.round(response.GPSFailure / response.returningBikeFailure * 10000) / 100.00 + "%"

            $scope.otherReasonsFailure = response.otherReasonsFailure;
            $scope.I = Math.round(response.otherReasonsFailure / response.returningBikeFailure * 10000) / 100.00 + "%"

        }).catch(function (result) { //捕捉错误处理
            console.info(result);
            alert(result.data.Message);
        });
    }

})
