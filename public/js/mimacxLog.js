/**
 * Created by wujiangwei on 2017/6/27.
 */
var app = angular.module('mimacxLogApp',[

]);

function dateStringToNetParam(dateStr) {
    var strList = dateStr.split("-");
    if(strList.length == 1){
        strList = dateStr.split("/");
    }
    if(strList[1].length == 1){
        strList[1] = '0' + strList[1];
    }
    if(strList[2].length == 1){
        strList[2] = '0' + strList[2];
    }

    return strList[0] + strList[1] + strList[2];
}


function translatecmdIDToDes(cmdID) {
    switch(cmdID)
    {
        case 1:
            return "开锁命令";
            break;
        case 2:
            return "上锁命令";
            break;
        case 3:
            return "查询车辆状态";
            break;
        case 4:
            return "寻车命令";
            break;
        case 5:
            return "大灯闪烁命令";
            break;
        case 6:
            return "开电池仓";
            break;
        case 7:
            return "设置速度命令";
            break;
        case 8:
            return "";
            break;
        case 9:
            return "调整报警开关";
            break;
        case 10:
            return "恢复出厂命令";
            break;
        case 11:
            return "立即定位命令";
            break;
        case 12:
            return "立即重启命令";
            break;
        case 13:
            return "固件升级命令";
            break;
        case 15:
            return "播报语音命令";
            break;
        default:
            return "未知命令";
    }
}

function translateMessageTypeToDes(messageType) {
    switch(messageType)
    {
        case 1:
            return "开锁周期报文";
            break;
        case 2:
            return "上锁周期报文";
            break;
        case 3:
            return "开始充电报文";
            break;
        case 4:
            return "断开充电报文";
            break;
        case 5:
            return "车辆报警报文";
            break;
        case 6:
            return "智能脚撑报文";
            break;
        case 7:
            return "蓝牙开锁报文";
            break;
        case 8:
            return "历史轨迹报文";
            break;
        case 9:
            return "低功耗报文";
            break;
        default:
            return "未知报文";
    }
}

function translateBTMessageTypeToDes(messageType) {
    switch(messageType)
    {
        case 1:
            return "蓝牙开锁后上报数据";
            break;
        case 2:
            return "蓝牙上锁后上报数据";
            break;

        default:
            return "未知蓝牙响应";
    }
}

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


app.controller('mimacxLogCtrl', function($scope, $http, $location) {

    var todayDate = new Date();
    var bikeLogDate = dateStringToNetParam(todayDate.toLocaleDateString());
    // console.log($location.$$absUrl);

    $(".ebike-log-flatpickr").flatpickr({
        defaultDate:todayDate,
        // maxDate: todayDate,
        onChange: function(selectedDates, dateStr, instance) {
            bikeLogDate = dateStringToNetParam(dateStr);
            console.log(bikeLogDate);
        }
    });

    $scope.bikeLogDateList = [];
    $scope.bikeDisplayLogDateList = [];
    $scope.pageDateCount = 50;

    $scope.currentPage = 0;

    var urlParams = $location.$$absUrl.split("/");
    if(urlParams.length == 5){
        $scope.ebikeNumber = urlParams[4];
        getBikeLogs(0);
    }

    function getBikeLogs(action) {
        if(action == -1){
            //上一页
            if($scope.currentPage >= 1) {
                //首次 Or Refresh
                toastr.info('获取之前的数据，需要最新数据，请刷新');

                $scope.currentPage--;

                var startSliceIndex = $scope.currentPage * $scope.pageDateCount;
                $scope.bikeDisplayLogDateList = $scope.bikeLogDateList.slice(startSliceIndex, startSliceIndex + $scope.pageDateCount);

                $('html,body').animate({scrollTop:0},'fast');
            }
        }else {
            if(action == 0) {
                //首次 Or Refresh
                $scope.currentPage = 0;

                $scope.bikeLogDateList = [];
                $scope.bikeDisplayLogDateList = [];
                toastr.info('开始刷新，起飞了');
            }else {
                if($scope.bikeLogDateList.length % $scope.pageDateCount > 0){
                    //无下一页了
                    toastr.info('没有更多的数据了');
                    return;
                }else {
                    $scope.currentPage++;
                    if(($scope.currentPage * $scope.pageDateCount + $scope.pageDateCount) < $scope.bikeLogDateList.length){
                        //下一页数据已经存在
                        toastr.info('获取之前的数据，需要最新数据，请刷新');
                        var startSliceIndex = $scope.currentPage * $scope.pageDateCount;
                        $scope.bikeDisplayLogDateList = $scope.bikeLogDateList.slice(startSliceIndex, startSliceIndex + (($scope.bikeLogDateList.length - startSliceIndex) >  $scope.pageDateCount) ? $scope.pageDateCount : ($scope.bikeLogDateList.length - startSliceIndex));

                        $('html,body').animate({scrollTop:0},'fast');
                    }
                }
            }

            if($scope.EBikeInfo!= undefined && $scope.EBikeInfo.BicycleNo == $scope.ebikeNumber && $scope.EBikeInfo.SN != undefined){
                getEBikeLogsFromMima();
            }else {
                $scope.netRequestState = 'start';
                $http.post("https://api.mimacx.com/BatteryCar/GetControllerInfoByBicycleNo",{
                    "BicycleNo" : $scope.ebikeNumber,
                    "pageIndex" : $scope.currentPage
                })
                    .then(function (result) {
                        var response = result.data;
                        if(response.returnCode == 0){
                            $scope.EBikeInfo = response.Data;

                            getEBikeLogsFromMima();
                        }else {
                            $scope.EBikeInfo.BicycleNo = $scope.ebikeNumber;
                            $scope.EBikeInfo.error = 'serviceError';
                            $scope.EBikeInfo.BluetoothNo = response.Message;
                        }
                    })
                    .catch(function (result) {
                        $scope.EBikeInfo = {};
                        $scope.EBikeInfo.BicycleNo = $scope.ebikeNumber;
                        $scope.EBikeInfo.error = '?Error';
                        $scope.EBikeInfo.BluetoothNo = '?Error';
                    })
                    .finally(function () {
                        //
                    });
            }
        }
    }

    //action = -1(pre page),1(next page),0(refresh)
    $scope.getEBikeLog = function (action) {
        getBikeLogs(action);
    };


    $scope.openGpsMap = function(gpsStr) {
        window.open("http://www.gpsspg.com/maps.htm");
    };

    $scope.openHistoryStr = function (historyLoctions) {
      alert(JSON.stringify(historyLoctions));
    };

    $scope.seeContent = function (Content) {
        alert(Content);
    };

    $scope.seeThisAreaEBikes = function () {
        //TODO
    }

    function getEBikeLogsFromMima(action) {

        if($scope.currentPage == 0){
            $scope.lastLogTime = undefined;
        }

        //获取该辆车的日志信息
        $http.post("/logs/ebileLogList",{
            "SN" : $scope.EBikeInfo.SN,
            "pageIndex" : $scope.currentPage,
            "lastLogTime":$scope.lastLogTime,
            "pageCount":$scope.pageDateCount
        })
            .then(function(result) {
                $scope.netRequestState = 'success';

                if(action == 0) {
                    //首次或者刷新
                    $scope.bikeLogDateList = [];
                    $scope.bikeDisplayLogDateList = [];
                }

                $scope.lastLogTime = result.data.lastLogTime;
                var bikeLogList= result.data.ebikeHistoryLogs;

                //deal data
                for (var i = 0; i < bikeLogList.length; i++){
                    var serviceData = bikeLogList[i];

                    if(i == 0 && $scope.bikeLogDateList.length == 0){
                        $scope.todayTotalMessageCount = Math.floor(serviceData.ID/$scope.pageDateCount) + 1;
                    }

                    if(serviceData.LogType == 1){
                        if(serviceData.Content.indexOf("成功") != -1){
                            serviceData.messageType = "登陆鉴权成功";
                            serviceData.isActive = false;
                        }else {
                            serviceData.messageType = "登陆鉴权失败";
                            serviceData.isActive = false;
                        }
                        $scope.bikeLogDateList.push(serviceData);
                        continue;
                    }

                    if(serviceData.SourceType == 1){
                        serviceData.isActive = true;
                    }

                    //str to object
                    var serviceDataContent = serviceData.Content;
                    if(serviceDataContent.indexOf("MsgSeq:") != -1){
                        //截取content中的MsgSeq后的数字
                        var MsgSeq = Number(serviceDataContent.substring(serviceDataContent.indexOf("MsgSeq:") + 7, serviceDataContent.indexOf("MsgSeq:") + 10));
                        switch (MsgSeq){
                            case 101:
                                serviceData.cmdSource = '觅马用户';
                                break;
                            case 102:
                                serviceData.cmdSource = '运维人员';
                                break;
                            case 100:
                                serviceData.cmdSource = '自动还车';
                                break;
                        }
                    }

                    var payloadIndex = serviceDataContent.indexOf("payload:");
                    if(payloadIndex != -1){
                        var contentStr = serviceDataContent.substring(payloadIndex + 8, serviceDataContent.length);
                        var contentObject = undefined;
                        try{
                            contentObject = JSON.parse(contentStr);

                            if(contentObject)
                                if(contentObject.messageBody != undefined){
                                    contentObject.messageBody.gpsPointStr = toCoordinates(contentObject);
                                }
                            if(contentObject.data != undefined){
                                contentObject.messageBody = contentObject.data;
                                contentObject.messageBody.gpsPointStr = toCoordinates(contentObject);
                            }

                        }catch(err) {
                            //other message
                            // serviceData.isActive = true;
                            serviceData.seeContent = true;
                            $scope.bikeLogDateList.push(serviceData);
                            continue;
                        }
                        serviceData.Content = contentObject;

                        //next str to object(refine)
                        var serviceDataNext = i != bikeLogList.length - 1 ? bikeLogList[i + 1] : undefined;
                        var contentObjectNext = undefined;
                        if(serviceDataNext != undefined && serviceDataNext.LogType != 1 && serviceDataNext.LogType != 6){
                            var serviceDataContentNext = serviceDataNext.Content;
                            var payloadIndexNext = serviceDataContentNext.indexOf("payload:");
                            var contentStrNext = serviceDataContent.substring(payloadIndexNext + 8, serviceDataContentNext.length);
                            try{
                                contentObjectNext = JSON.parse(contentStrNext);
                            }catch(err) {
                                contentObjectNext = undefined;
                            }
                        }

                        if(i == 0 || contentObjectNext == undefined || contentObject.messageType != contentObjectNext.messageType){
                            if(serviceData.SourceType == 1){
                                serviceData.firstMessageTag = translateBTMessageTypeToDes(contentObject.messageType);
                            }else {
                                serviceData.firstMessageTag = translateMessageTypeToDes(contentObject.messageType);
                            }
                        }
                    }else {
                        // serviceData.isActive = true;
                        serviceData.seeContent = true;
                        $scope.bikeLogDateList.push(serviceData);
                        continue;
                    }

                    //commend ID
                    if(contentObject.cmdID != undefined){
                        serviceData.firstMessageTag = translatecmdIDToDes(contentObject.cmdID);
                        // serviceData.isActive = true;
                        if(serviceData.LogType == 5){
                            //服务器发送命令
                            serviceData.firstMessageTag = '发送' + serviceData.firstMessageTag;
                        }else {
                            serviceData.firstMessageTag = serviceData.firstMessageTag + '响应';
                        }

                        //argument 设置
                        if(serviceData.Content.argument != undefined){
                            serviceData.cmdSource = serviceData.cmdSource + "Argument: " + JSON.stringify(serviceData.Content.argument);
                        }else if(serviceData.Content.result != undefined){
                            serviceData.cmdSource = "响应结果Result: " + (serviceData.Content.result == 0 ? '成功' : ('失败' + serviceData.Content.result));
                            if(serviceData.Content.result != 0){
                                serviceData.isActive = false;
                            }
                        }
                    }

                    //deal data
                    if(serviceData.Content.messageBody != undefined){
                        //deal gps type
                        if(serviceData.Content.messageBody.gpstype != undefined){
                            switch (serviceData.Content.messageBody.gpstype){
                                case 0:
                                    serviceData.Content.messageBody.gpstypDes = "无";
                                    break;
                                case 1:
                                    serviceData.Content.messageBody.gpstypDes = "实时";
                                    break;
                                case 2:
                                    serviceData.Content.messageBody.gpstypDes = "历史";
                                    break;
                                default:
                                    serviceData.Content.messageBody.gpstypDes = "";
                                    break;
                            }
                        }
                        //deal ebike job type
                        if(serviceData.Content.messageBody.ctrlState != undefined) {
                            switch (serviceData.Content.messageBody.ctrlState) {
                                case 1:
                                    serviceData.Content.messageBody.ctrlStateDes = "车辆无电";
                                    break;
                                case 2:
                                    serviceData.Content.messageBody.ctrlStateDes = "工作";
                                    break;
                                case 3:
                                    serviceData.Content.messageBody.ctrlStateDes = "车辆防盗";
                                    break;
                                default:
                                    serviceData.Content.messageBody.ctrlStateDes = "";
                                    break;
                            }
                        }
                        //deal ebike job type
                        if(serviceData.Content.messageBody.alarmType != undefined) {
                            switch (serviceData.Content.messageBody.alarmType) {
                                case 1:
                                    serviceData.Content.messageBody.alarmTypeDes = "车辆倒地";
                                    break;
                                case 2:
                                    serviceData.Content.messageBody.alarmTypeDes = "非法触碰";
                                    break;
                                case 3:
                                    serviceData.Content.messageBody.alarmTypeDes = "非法位移";
                                    break;
                                case 4:
                                    serviceData.Content.messageBody.alarmTypeDes = "电源断电";
                                    break;
                                case 9:
                                    serviceData.Content.messageBody.alarmTypeDes = "车辆扶正";
                                    break;
                                default:
                                    serviceData.Content.messageBody.alarmTypeDes = "";
                                    break;
                            }
                        }
                    }

                    $scope.bikeLogDateList.push(serviceData);
                }

                //tail data
                var startIndex = $scope.currentPage * $scope.pageDateCount;
                $scope.bikeDisplayLogDateList = $scope.bikeLogDateList.slice(startIndex, startIndex + bikeLogList.length);

                $('html,body').animate({scrollTop:0},'fast');
            })
            .catch(function (result) {
                //error
                console.log(result);
                $scope.netRequestState = 'error';
            })
            .finally(function () {
                //
            });


    }

});