/**
 * Created by wujiangwei on 2017/7/13.
 */
var app = angular.module('allBikesApp',[

])

function toCoordinates(contentObject)
{
    if(contentObject.messageBody.latitudeMinute == undefined){
        return undefined;
    }
    var lat = Number(contentObject.messageBody.latitudeMinute) / 60.0 + Number(contentObject.messageBody.latitudeDegree);
    var lon = Number(contentObject.messageBody.longitudeMinute) / 60.0 + Number(contentObject.messageBody.longitudeDegree);

    return lat + ',' + lon;
    // return Wgs84ToGcj02.gps84_To_Gcj02(lat, lon).toString();
}

//by函数接受一个成员名字符串和一个可选的次要比较函数做为参数
//并返回一个可以用来包含该成员的对象数组进行排序的比较函数
//当o[age] 和 p[age] 相等时，次要比较函数被用来决出高下
var by = function(name, minor) {
    return function (o, p) {
        var a, b;
        if (o && p && typeof o === 'object' && typeof p === 'object') {
            a = o[name];
            b = p[name];
            if (a === b) {
                return typeof minor === 'function' ? minor(o, p) : 0;
            }
            if (typeof a === typeof b) {
                return a < b ? -1 : 1;
            }
            return typeof a < typeof b ? -1 : 1;
        } else {
            thro("error");
        }
    }
};

app.controller('allBikesCtrl', function($scope, $http, $location) {

    //目前测试区域
    //Tbit,颐和盛世小区,苏州度假区测试,东凤镇,江苏大学，三峡大学
    $scope.validAreasNames = ['度假区', '池州', '东凤镇', '颐和盛世小区', '江苏', '三峡大学', '测试', '渭南', '合肥', '枣庄'];

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

    //某运维区域的所有车辆
    $scope.seeAllBikeInSelectedArea = function (selecetedIndex, selectedAreaGuid) {

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

    //运维人员登录
    $scope.yunweiAccountSession = undefined;
    $scope.yunweiLogin = function () {


        // $http.post("http://localhost:8080/logs/ebikeHistoryLocationBySnAndTime",{
        //     "SN" : 'mimacx0000000691',
        //     'queryDate':'2017-10-09 16:33:48'
        // })
        //     .then(function(result) {
        //         console.log(result);
        //     })
        //     .catch(function (result) {
        //         //error
        //         console.log(result);
        //     })
        //     .finally(function () {
        //         //
        //     });
        //
        // return;

        $scope.netRequestState = 'start';
        $http.post("https://api.mimacx.com/Peration/Login",{
            "UserName" : $scope.mimaYunweiAccount,
            "UserPass" : $scope.mimaYunweiMima,
            "Accesskey" : '123456'
        })
            .then(function(result) {
                var response = result.data;
                if(response.returnCode == 1){
                    $scope.yunweiAccountSession = response.Data.SessionKey;
                    $scope.mimaYunweiLoginInfo = '登录成功:' + response.Data.LoginName;

                    getAllOperationArea();
                }else {
                    //error
                    $scope.mimaYunweiLoginInfo = response.returnMsg;
                }
                $scope.netRequestState = 'end';
            })
            .catch(function (result) {
                //error
                $scope.mimaYunweiLoginInfo = '网络错误';
                $scope.netRequestState = 'end';
            })
    };


    $scope.getAEBikeLog = function (EbikeNo) {
        window.open("https://mimacx.leanapp.cn/mimacxLog/" + EbikeNo);
    };

    $scope.getInputEBikeLog = function () {
        window.open("https://mimacx.leanapp.cn/mimacxLog/" + $scope.inputBikeNo);
    };

    // toastr.info("请先登录运维帐号");

    $scope.getBikeParamValue = function (eListBikeInfo) {

        if($scope.yunweiAccountSession == undefined){
            toastr.error("请先登录运维帐号");
            return;
        }

        eListBikeInfo.isGetting = true;
        eListBikeInfo.paramValue = '请求中...';

        $http.post("https://api.mimacx.com/Peration/GetProperty",{
            "BicycleNo" : eListBikeInfo.BicycleNo,
            "ParamName" : eListBikeInfo.gettingParam,
            "Accesskey" : '123456',
            "SessionKey" : $scope.yunweiAccountSession
        })
            .then(function(result) {
                var response = result.data;
                eListBikeInfo.isGetting = false;
                if(response.returnCode == 1){
                    eListBikeInfo.paramValue = response.Data.paramvalue;
                }else {
                    //error
                    eListBikeInfo.paramValue = '获取失败:' + response.returnMsg;
                }
            })
            .catch(function (result) {
                //error
                console.log(result.data);
                eListBikeInfo.paramValue = '获取失败:' + '网络错误';
            })
            .finally(function () {
                eListBikeInfo.isGetting = false;
            })
    }

    $scope.getUnLockVehicle = function () {
        if($scope.yunweiAccountSession == undefined){
            toastr.error("请先登录运维帐号");
            return;
        }
        else {https:    //  http://localhost:8080
            window.open("https://mimacx.leanapp.cn/traverseUnLockVehicle/" + $scope.yunweiAccountSession);
        }

    }

    $scope.setBikeParamValue = function (eListBikeInfo) {
        if($scope.yunweiAccountSession == undefined){
            toastr.error("请先登录运维帐号");
            return;
        }

        eListBikeInfo.isSetting = true;
        eListBikeInfo.paramValue = '设置...';
        $http.post("https://api.mimacx.com/Peration/SetProperty",{
            "BicycleNo" : eListBikeInfo.BicycleNo,
            "ParamName" : eListBikeInfo.settingParam,
            "ParamValue" : eListBikeInfo.settingValue,
            "Accesskey" : '123456',
            "SessionKey" : $scope.yunweiAccountSession
        })
            .then(function(result) {
                eListBikeInfo.isSetting = false;
                var response = result.data;
                if(response.returnCode == 1){
                    console.log('设置成功');
                    eListBikeInfo.gettingParam = eListBikeInfo.settingParam;
                    eListBikeInfo.setParamResponse = '设置成功:' + eListBikeInfo.settingValue;
                }else {
                    //error
                    console.log('设置失败' , response.returnMsg);
                    eListBikeInfo.setParamResponse = '设置失败' + response.returnMsg;
                }
            })
            .catch(function (result) {
                //error
                console.log(result.data);
                eListBikeInfo.setParamResponse = '获取失败:' + '网络错误';
            })
            .finally(function () {
                eListBikeInfo.isSetting = false;
            })
    }
    
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
});