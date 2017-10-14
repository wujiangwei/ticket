var app = angular.module('unLockVehicleApp',[

])

app.controller('unLockVehicleCtrl', function ($scope, $http, $location, $timeout,$interval) {

    $scope.validAreasNames = ['度假区', '池州', '东凤镇', '颐和盛世小区', '江苏大学', '三峡大学','陕西渭南','陕西三原'];

    function getAllOperationArea() {
        $scope.netRequestState = 'start';
        //获取所有运营区域
        $http.post("https://api.mimacx.com/BatteryCar/GetAllArea",{

        })
            .then(function(result) {
                var response = result.data;
                if(response.returnCode == 0){
                    $scope.allMimaAreas = [];
                    for (var i = 0; i < response.Data.length; i++){
                        var tempArea = response.Data[i];

                        for(var j = 0; j < $scope.validAreasNames.length; j++){
                            var areaNameStr = $scope.validAreasNames[j];
                            if(tempArea.PartnerAreaName.indexOf(areaNameStr) != -1){
                                $scope.allMimaAreas.push(tempArea);
                                break;
                            }
                        }

                    }
                }else {
                    //error
                    $scope.allMimaAreasError = response.returnMsg;
                }

                $scope.netRequestState = 'end';
            })
            .catch(function (result) {
                //error
                $scope.allMimaAreasError = '网络错误';
                $scope.netRequestState = 'end';
            })
            .finally(function () {
                //
            });
    }

    getAllOperationArea();

    //某运维区域的所有车辆
    $scope.seeAllBikeInSelectedAre = function (selecetedIndex, selectedAreaGuid) {

        $scope.selecetedAreaIndex = selecetedIndex;

        $scope.selectedAreaEBikes = [];

        $scope.netRequestState = 'start';
        $http.post("https://api.mimacx.com/BatteryCar/GetBicycleInfoByAreaGuid",{
            "AreaGuid" : selectedAreaGuid,
            "PageIndex" : 1,
            "PageSize" : 1000
        })
            .then(function(result) {
                var response = result.data;
                if(response.returnCode == 0){

                    $scope.selectedAreaEBikes = response.Data;
                    $scope.selectedAreaEBikes.sort(by('BicycleNo',by('ControllerNo')));

                    for (var j = 0; j < $scope.selectedAreaEBikes.length; j++){
                        if ($scope.selectedAreaEBikes[j].ControllerNo == undefined){
                            continue
                        }
                        else {
                            $http.post("/bikeActionsAndLogs/getBikeLatestLogTime",{
                                "SN" : $scope.selectedAreaEBikes[j].ControllerNo
                            })
                                .then(function(result) {
                                    // eListBikeInfo.lastestOnlineTime = result.data.bikeLatestTime;
                                    eListBikeInfo.bikeEState = result.data.bikeEState;
                                    if(result.data.bikeLatestTime == undefined){
                                        eListBikeInfo.lastestOnlineTime = 'undefine';
                                    }
                                })
                                .catch(function (result) {
                                    //error
                                    eListBikeInfo.lastestOnlineTime = '网络错误';
                                })
                                .finally(function () {
                                })
                        }
                    }

                    for(var i = 0; i < $scope.allMimaAreas.length ; i++){
                        if($scope.allMimaAreas[i].PartnerAreaGuid == selectedAreaGuid){
                            if($scope.allMimaAreas[i].PartnerAreaNameOrignal == undefined){
                                $scope.allMimaAreas[i].PartnerAreaNameOrignal = $scope.allMimaAreas[i].PartnerAreaName;
                            }

                            $scope.allMimaAreas[i].PartnerAreaName = $scope.allMimaAreas[i].PartnerAreaNameOrignal + '(' +$scope.selectedAreaEBikes.length + '辆车)';
                        }
                    }

                }else {
                    //error
                    $scope.selectedAreaEBikesError = response.returnMsg;
                }

                $scope.netRequestState = 'end';
            })
            .catch(function (result) {
                //error
                $scope.selectedAreaEBikesError = '网络错误';
                $scope.netRequestState = 'end';
            })
            .finally(function () {
                //
            });
    };


    $scope.bikeOnlineDetection = function (eListBikeInfo) {

        $http.post("/bikeActionsAndLogs/getBikeLatestLogTime",{
            "SN" : eListBikeInfo.ControllerNo
        })
            .then(function(result) {
                eListBikeInfo.lastestOnlineTime = result.data.bikeLatestTime;
                eListBikeInfo.bikeEState = result.data.bikeEState;
                if(result.data.bikeLatestTime == undefined){
                    eListBikeInfo.lastestOnlineTime = 'undefine';
                }
            })
            .catch(function (result) {
                //error
                eListBikeInfo.lastestOnlineTime = '网络错误';
            })
            .finally(function () {
            })
    }

})