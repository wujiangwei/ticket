/**
 * Created by wujiangwei on 2017/9/03.
 */
const router = require('express').Router()
var AV = require('leanengine');
var httpUtil = require('./httpUtil');
var alarmSms = require('./alarmSms');
var logSqlUtil = require('./logSqlUtil');

var redisUtil = require('../redis/leanObjectRedis');

var MimaEBikeMapSql = AV.Object.extend('MimaEBikeMap');
var NewEBikeLogSql = AV.Object.extend('MimaEBikeHistoryLogs');
var MimaActionSql = AV.Object.extend('MimaAction');

//配置参数
var openBatteryMin = parseInt(process.env['openBatteryMin']);

//Redis Key
function serviceMoniterKey() {
    return'wujiangweiMonitor';
}
function serviceMoniterSpaceKey() {
    return'wujiangweiMonitorSpace';
}

function getOpenBatteryKey(sn) {
    return sn + '_' + 'openBattery';
}
function getSatelliteKey(sn) {
    return sn + '_' + 'Satellite';
}
function getIllegalMoveKey(sn) {
    return sn + '_' + 'Alarm';
}
function getBikeStateKey(sn) {
    return sn + '_' + 'BikeEState';
}
//Redis Key end

//debug code
function monitorServiceError(milliSeconds) {
    var debugSwitch = parseInt(process.env['debugSwitch']);
    if(debugSwitch > 0){
        var tempDebugErrorIndex = debugErrorIndex;
        debugErrorIndex++;

        console.log('---------- began debug ' + tempDebugErrorIndex);
        var startTime = new Date().getTime();
        while (new Date().getTime() < startTime + milliSeconds){

        }
        console.log('---------- end debug' + tempDebugErrorIndex);
    }
};
//end debug code

router.post('/', function(req, res) {

    var resTag = 0;

    //超时直接回调，防止长时间不会掉导致车辆服务器出现问题
    res.setTimeout(1900, function(){
        console.error("响应超时.");
    });
    setTimeout(function(){
        if(resTag == 0){
            resTag = 1;
            res.sendStatus(503);
        }
    }, 2000);

    var LogParam = req.body;

    if(LogParam == undefined || LogParam.SN == undefined){
        resTag = 1;
        console.error("LogParam is all empty.");
        return res.json({'errorCode': 1, 'errorMsg': 'LogParam is all empty'});
    }

    //SN LogType Content Remark OperationTime SourceType
    var newEBikeLogSql = AV.Object.extend(logSqlUtil.getEBikeLogSqlName(undefined));
    var newEBikeLog = new newEBikeLogSql();

    var SNList = LogParam.SN.split('_');
    LogParam.SN = SNList[0];

    newEBikeLog.set('SN', LogParam.SN);
    if(SNList.length > 1){
        newEBikeLog.set('SNIndex', SNList[1]);
    }

    if (parseInt(LogParam.LogType) != 8){
        newEBikeLog.set('LogType', parseInt(LogParam.LogType));
    }
    newEBikeLog.set('Content', LogParam.Content);
    newEBikeLog.set('Remark', LogParam.Remark);
    newEBikeLog.set('SourceType', parseInt(LogParam.SourceType));
    if(LogParam.BicycleNo != undefined && LogParam.BicycleNo.length > 5){
        newEBikeLog.set('bikeID', LogParam.BicycleNo);
    }
    // 监控socket服务器正常否
    structLogContent(newEBikeLog);

    //update bike time in redis
    redisUtil.setSimpleValueToRedis(LogParam.SN + '_Time', new Date(), 0);

    newEBikeLog.save().then(function (savedNewEBikeLog) {
        if(resTag == 0) {
            resTag = 1;
            return res.json({'errorCode': 0});
        }
    }, function (error) {
        console.log(req.body.SN + ' save log failed:' + error);

        if(resTag == 0){
            resTag = 1;
            return res.json({'errorCode': -1, 'errorMsg': error.message});
        }
    });
})


router.post('/getBikeLatestLogTime',function (req, res) {
    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    var bikeSNKey = req.body.SN + '_Time';

    redisUtil.getSimpleValueFromRedis(req.body.SN + '_BikeEState', function (bikeLatest) {
        redisUtil.getSimpleValueFromRedis(bikeSNKey, function (bikeLatestTime) {
            res.json({'bikeLatestTime' : bikeLatestTime, 'bikeEState' :bikeLatest});
        })
    })
})

// 监测是否有车裸奔，如果有就上锁
function unLockedBike(unLockedBikeObject) {
    var unLockedObject = Object();
    unLockedObject.LogType = unLockedBikeObject.get('LogType');
    unLockedObject.Remark = unLockedBikeObject.get('Remark');

    unLockedObject.Content = unLockedBikeObject.get('Content');
    unLockedObject.SN = unLockedBikeObject.get('SN');
    unLockedObject.MsgSeq = unLockedBikeObject.get('MsgSeq');

    var unLockedContent = unLockedObject.Content;

    var payloadIndex = unLockedContent.indexOf("payload:");
    var contentObject = undefined;
    if (payloadIndex != -1){
        var contentStr = unLockedContent.substring(payloadIndex + 8, unLockedContent.length);

        contentObject = JSON.parse(contentStr);
    }

    var timestamp = Date.parse(new Date());

    if (unLockedObject.LogType == 5 && unLockedContent.MsgSeq == 101 && contentObject.cmdID == 1){
        redisUtil.setSimpleValueToRedis(unLockedObject.SN + '_unLockComment', timestamp);
    }

    if (unLockedObject.LogType == 99 && unLockedObject.Remark == '借车'){
        redisUtil.redisClient.del(unLockedObject.SN + '__unLockComment',function (err, reply) {
            if(reply != null){
                console.error('删除失败', err.message);
            }
        })
    }

    if (unLockedContent != undefined){
        if (unLockedContent.messageType == 1){
            redisUtil.getSimpleValueFromRedis(unLockedObject.SN + '__unLockComment',function (unLockCommentRel) {
                if (timestamp - unLockCommentRel > 120000){
                    redisUtil.redisClient.rpush('unLockedList',[unLockedObject.SN])
                }
                else {
                    redisUtil.redisClient.del(unLockedObject.SN + '__unLockComment',function (err, reply) {
                        if(reply != null){
                            console.error('删除失败', err.message);
                        }
                    })
                }
            })
        }
    }
}

//未使用
function monitorSocketServiceByLogState(Remark) {
    var monitorTimeSpaceSecond = parseInt(process.env['monitorTimeSpaceMin']) * 60;

    if(Remark == '鉴权'){
        //5min内必然有1次鉴权  —— 鉴权异常记录
        redisUtil.getSimpleValueFromRedis('monitorServiceByAuthTime', function (authTime) {
            if(authTime == undefined){
                authTime = 0;
            }

            redisUtil.setSimpleValueToRedis('monitorServiceByAuthTime', authTime + 1, monitorTimeSpaceSecond);
        })
    }

    //全量日志记录
    redisUtil.getSimpleValueFromRedis('monitorServiceByLogTime', function (logTime) {
        if(logTime == undefined){
            logTime = 0;
        }

        redisUtil.setSimpleValueToRedis('monitorServiceByLogTime', logTime + 1, monitorTimeSpaceSecond);
    })
}


function setBikeMapWithRedis(bikeSN, bikeID) {
    if(bikeSN == undefined || bikeSN.length != 16){
        console.error('invalid sn : ', bikeSN);
        return;
    }

    if(bikeID == undefined || bikeID.length >= 10 ){
        console.error('invalid bikeID : ', bikeID);
        return;
    }

    redisUtil.getSimpleValueFromRedis(bikeSN, function (redisBikeID) {
        if(redisBikeID == null){
            //query,if not in mangdb,set it in
            redisUtil.setSimpleValueToRedis(bikeSN, bikeID, 0);
            //add time in redis
            redisUtil.setSimpleValueToRedis(bikeSN + '_Time', new Date(), 0);

            var ebikeHistoryLogQuery = new AV.Query('MimaEBikeMap');
            ebikeHistoryLogQuery.equalTo('SN', bikeSN);
            // console.log('----- ebileLogList ----- start: ' + new Date() + ':' + new Date().getMilliseconds());
            ebikeHistoryLogQuery.find().then(function(MimaEBikeMapObjects) {
                if(MimaEBikeMapObjects.length == 0){
                    var newMimaEBikeMapObject = new MimaEBikeMapSql();
                    newMimaEBikeMapObject.set('SN', bikeSN);
                    newMimaEBikeMapObject.set('bikeID', bikeID);
                    newMimaEBikeMapObject.save().then(function (savedObject) {
                        console.log('save bike and sn exist :' , bikeSN);
                    },function (err) {
                        console.log('find bike and sn but save error :', err.message);
                    })
                }
            }, function (err) {
                //not in redis but in sql,so set it in redis
                redisUtil.setSimpleValueToRedis(bikeSN, bikeID, 0);

                console.log('find bike and sn error :' , err.message);
                var newMimaEBikeMapObject = new MimaEBikeMapSql();
                newMimaEBikeMapObject.set('SN', bikeSN);
                newMimaEBikeMapObject.set('bikeID', bikeID);
                newMimaEBikeMapObject.save().then(function (savedObject) {
                    //auto set it in redis
                },function (err) {
                    console.log('save bike map error :', err.message);
                })
            })
        }else {
            //exist in redis , update time
            redisUtil.setSimpleValueToRedis(bikeSN + '_Time', new Date(), 0);
        }
    })
}

function serviceMonitor(serviceDataContent) {
    if(serviceDataContent.indexOf("离线") != -1 || serviceDataContent.indexOf("断线") != -1){
        var alarmFailedMonitorMin = parseInt(process.env['alarmFailedMonitorMin']);
        var alarmFailedMonitorTime = parseInt(process.env['alarmFailedMonitorTime']);
        var alarmSpaceMin = parseInt(process.env['alarmSpaceMin']);

        //车辆报警，多少分钟内多次开锁/还车失败，则是异常开始
        //异常报警短信发送有时间间隔，防止一直报警短信发送
        redisUtil.getSimpleValueFromRedis(serviceMoniterSpaceKey(), function (serviceSwitch) {
            // console.log('serviceSwitch = ' + serviceSwitch +  ' , alarmFailedMonitorMin = ' + alarmFailedMonitorMin + ' , alarmFailedMonitorTime = ' + alarmFailedMonitorTime);

            if(parseInt(serviceSwitch) != 1){
                redisUtil.getSimpleValueFromRedis(serviceMoniterKey(), function (failedTime) {
                    if(failedTime == undefined){
                        failedTime = 0;
                    }
                    failedTime = parseInt(failedTime) + 1;

                    redisUtil.setSimpleValueToRedis(serviceMoniterKey(), failedTime, alarmFailedMonitorMin * 60);

                    // console.log('failedTime = ' + failedTime +  ' , alarmFailedMonitorTime = ' + alarmFailedMonitorTime);
                    if(failedTime > alarmFailedMonitorTime){
                        //暂时用getBikeBack + bikeNumber
                        //ServiceMonitor + ServiceMonitorDes
                        var sendMonitorBugList = alarmSms.getServiceMonitorMembers();
                        for(var sendTDataIndex in sendMonitorBugList){
                            alarmSms.sendAlarmSms(sendMonitorBugList[sendTDataIndex], function (Ret) {
                                if(Ret == true){
                                    //报警成功，不再报警，等手动重置报警
                                    console.error('Socket 服务器异常，发送短信成功');

                                    redisUtil.setSimpleValueToRedis(serviceMoniterSpaceKey(), 1, alarmSpaceMin * 60);
                                    redisUtil.redisClient.del(serviceMoniterKey(), function (err, reply) {
                                        if(err != null){
                                            console.error('Socket 服务器异常，重置redis信息失败 ', err.message);
                                        }
                                    });
                                }else {
                                    //发送失败
                                    console.error('Socket 服务器异常，发送短信失败 error');
                                }
                            })
                        }
                    }
                })
            }
        });
    }
}

function structLogContent(leanContentObject) {
    var serviceData = Object();
    serviceData.LogType = leanContentObject.get('LogType');
    serviceData.Remark = leanContentObject.get('Remark');
    serviceData.SourceType = leanContentObject.get('SourceType');
    serviceData.Content = leanContentObject.get('Content');
    serviceData.SN = leanContentObject.get('SN');

    var serviceDataContent = serviceData.Content;

    //服务器监控报警事宜
    serviceMonitor(serviceDataContent);

    //处理鉴权事宜
    if(serviceData.LogType == 1){
        //解析车辆号进行保存
        var payloadIndex = serviceDataContent.indexOf("Payload:");
        if(payloadIndex != -1){

            var authContentStr = serviceDataContent.substring(payloadIndex + 8, serviceDataContent.length);
            var authContentObject = undefined;

            try {
                authContentObject = JSON.parse(authContentStr);
                leanContentObject.set('bikeID', authContentObject.bikeID);
                setBikeMapWithRedis(leanContentObject.get('SN'), authContentObject.bikeID);
            }catch(err) {
                console.log('auth with no bikeId ', err.message);
                console.log(contentStr);
            }

            if(serviceData.Content.indexOf("成功") != -1){
                leanContentObject.set('authResult', true);
            }else {
                leanContentObject.set('authResult', false);
            }
        }else {
            leanContentObject.set('authResult', false);
        }

    }

    // 处理借车和还车事宜
    if(serviceData.LogType == 100 || serviceData.LogType == 99){
        //借还车
        // [15656672077]用户还车BT费用计算接口成功,车辆号：077100157
        // [15656672077]用户还车成功(扣款成功),车辆号：077100157
        //
        // [18356610542]用户借车成功,车辆号：077100183
        // [15888642133]用户借车失败,车辆号：077100124,此车处于下线状态

        //str to object
        var serviceDataContent = serviceData.Content;
        if(serviceDataContent.indexOf("成功") != -1){
            leanContentObject.set('cmdSucceed', true);
        }else {
            leanContentObject.set('cmdSucceed', false);
        }

        //截取content中的MsgSeq后的数字
        var Index1 = serviceDataContent.indexOf("]");
        var Index2 = serviceDataContent.indexOf("(");
        var Index2Ex = serviceDataContent.indexOf(")");

        var userPhone = serviceDataContent.substring(1, Index1);
        leanContentObject.set('userPhone', userPhone);

        var bikeOperationResult;
        if(Index2 != -1){
            bikeOperationResult = serviceDataContent.substring(Index1 + 1 + 2, Index2);
            leanContentObject.set('bikeOperationResult', bikeOperationResult);
            // 有()
            var bikeOperationResultDes = serviceDataContent.substring(Index2 + 1, Index2Ex);
            leanContentObject.set('bikeOperationResultDes', bikeOperationResultDes);

        }else {
            bikeOperationResult = serviceDataContent.substring(Index1 + 1 + 2, serviceDataContent.length);

            //for des logic
            if(bikeOperationResult.length > 8){
                leanContentObject.set('bikeOperationResult', bikeOperationResult.substring(0, 8));
                var bikeOperationResultDes = bikeOperationResult.substring(8, bikeOperationResult.length);
                leanContentObject.set('bikeOperationResultDes', bikeOperationResultDes);
            }else {
                leanContentObject.set('bikeOperationResult', bikeOperationResult);
            }
        }
    }

    //处理操作者事宜
    if(serviceDataContent.indexOf("MsgSeq:") != -1){
        //截取content中的MsgSeq后的数字
        var MsgSeq = Number(serviceDataContent.substring(serviceDataContent.indexOf("MsgSeq:") + 7, serviceDataContent.indexOf("MsgSeq:") + 10));
        switch (MsgSeq){
            case 101:
                leanContentObject.set('roleDes', 'user');
                break;
            case 102:
                leanContentObject.set('roleDes', 'operator');
                break;
            case 105:
                leanContentObject.set('roleDes', 'other');
                break;
        }
    }

    //处理定位信息
    var payloadIndex = serviceDataContent.indexOf("payload:");
    if(payloadIndex != -1){
        var contentStr = serviceDataContent.substring(payloadIndex + 8, serviceDataContent.length);
        var contentObject = undefined;

        try{
            contentObject = JSON.parse(contentStr);
            if(contentObject != undefined){


                if (contentObject.messageType == 1 || (contentObject.cmdID == 1 && contentObject.result == 0) ||
                    contentObject.messageType == 7){

                    redisUtil.setSimpleValueToRedis(getBikeStateKey(serviceData.SN),'electric',0)
                    if (parseInt(contentObject.messageBody.battery) == undefined || parseInt(contentObject.messageBody.battery) == 0){
                    }
                    else {
                        redisUtil.setSimpleValueToRedis(serviceData.SN + '_batteryPower',parseInt(contentObject.messageBody.battery),0)
                    }

                }

                if (contentObject.messageType == 2 ||(contentObject.cmdID == 2 && contentObject.result == 0) ||
                        contentObject.messageType == 5 || contentObject.messageType == 6){
                    
                    redisUtil.setSimpleValueToRedis(getBikeStateKey(serviceData.SN),'noElectric',0)
                    if (parseInt(contentObject.messageBody.battery) == undefined || parseInt(contentObject.messageBody.battery) == 0){
                    }
                    else {
                        redisUtil.setSimpleValueToRedis(serviceData.SN + '_batteryPower',parseInt(contentObject.messageBody.battery),0)
                    }
                }


                if(contentObject.messageBody == undefined && contentObject.data != undefined){
                    //控制车辆的命令响应，返回的是data，而不是messageBody（这个是车辆的报文）
                    contentObject.messageBody = contentObject.data;
                }

                if(contentObject.messageBody.satellite != undefined && contentObject.messageBody.satellite != null && contentObject.messageBody.satellite != 'null'){
                    leanContentObject.set('satellite', parseInt(contentObject.messageBody.satellite));
                    redisUtil.setSimpleValueToRedis(getSatelliteKey(serviceData.SN), parseInt(contentObject.messageBody.satellite), 600);
                }

                var charging = parseInt(contentObject.messageBody.charging);
                if(charging == false || charging == true){
                    leanContentObject.set('charging', charging);
                }

                if(contentObject.messageBody.chargeCount != undefined && contentObject.messageBody.chargeCount != null && contentObject.messageBody.chargeCount != 'null'){
                    leanContentObject.set('chargeCount', parseInt(contentObject.messageBody.chargeCount));
                }

                leanContentObject.set('totalMileage', parseFloat(contentObject.messageBody.totalMileage));
                leanContentObject.set('errorCode', contentObject.messageBody.errorCode);
                leanContentObject.set('battery', parseInt(contentObject.messageBody.battery));
                leanContentObject.set('gpstype', parseInt(contentObject.messageBody.gpstype));

                //保存定位
                if(contentObject.messageBody.latitudeMinute != undefined || contentObject.messageBody.longitudeMinute != undefined){
                    if(contentObject.messageBody.latitudeMinute != 0 || contentObject.messageBody.longitudeMinute != 0){
                        var lat = Number(contentObject.messageBody.latitudeMinute) / 60.0 + Number(contentObject.messageBody.latitudeDegree);
                        var lon = Number(contentObject.messageBody.longitudeMinute) / 60.0 + Number(contentObject.messageBody.longitudeDegree);
                        leanContentObject.set('bikeGeo', new AV.GeoPoint(lat, lon));
                    }

                }

                //是不是有效定位
                if(parseInt(contentObject.messageBody.gpstype) == 1 && parseInt(contentObject.messageBody.satellite) > 5){
                    //
                }
            }
        }catch(err) {
            //other message
            // console.log('payload: not struct');
            // console.log(serviceDataContent);
        }

        serviceData.Content = contentObject;
    }else {
        // console.log('no payload and Payload');
        // console.log(contentStr);
    }

    //commend ID
    if(contentObject != undefined && contentObject.cmdID != undefined){
        //LogType(5:发起请求，6请求响应)
        //保存请求的参数 和 响应的结果
        if(serviceData.Content.argument != undefined && serviceData.Content.argument != null && serviceData.Content.argument != ''){
            leanContentObject.set('cmdRequestArgument', serviceData.Content.argument);
        }else if(serviceData.Content.result != undefined && serviceData.Content.result != null && serviceData.Content.result != ''){
            leanContentObject.set('cmdResponseResult', parseInt(serviceData.Content.result));
        }

        leanContentObject.set('cmdId', parseInt(contentObject.cmdID));
        if(parseInt(contentObject.cmdID) == 6 ){
            //处理打开电池仓
            redisUtil.setSimpleValueToRedis(getOpenBatteryKey(serviceData.SN), 1, openBatteryMin * 60);
        }
    }

    if (contentObject != undefined && contentObject.messageBody != undefined){
        if (contentObject.messageBody.actionMethod == 'BlueTooth' && contentObject.messageBody.role == 'operator'){
            redisUtil.setSimpleValueToRedis(getOpenBatteryKey(serviceData.SN), 1, openBatteryMin * 60);
        }

    }

    //deal data
    if(serviceData.Content != undefined && serviceData.Content.messageBody != undefined){
        //1 锁车中，2 行使中，3 防盗中
        if(serviceData.Content.messageBody.ctrlState != undefined && serviceData.Content.messageBody.ctrlState != null){
            leanContentObject.set('ctrlState', parseInt(serviceData.Content.messageBody.ctrlState));
        }

        //deal ebike job type
        if(serviceData.Content.messageBody.ctrlState != undefined) {
            switch (parseInt(serviceData.Content.messageBody.ctrlState)) {
                case 1:
                    leanContentObject.set('bikeEState', 'noElectric');
                    break;
                case 2:
                    leanContentObject.set('bikeEState', 'electric');
                    break;
                case 3:
                    leanContentObject.set('bikeEState', 'preventSteal');
                    break;
                default:
                    break;
            }
        }

        //车辆报警
        if(serviceData.Content.messageBody.alarmType != undefined) {
            if (serviceData.Content.messageBody.alarmType == 4){
                if (serviceData.SN != undefined){
                    batteryOff(serviceData.SN,serviceData.Content.messageBody.alarmType)
                }
                // sendTextMessages(serviceData.SN,parseInt(contentObject.messageBody.satellite),serviceData.Content.messageBody.alarmType)
            }
            else {
                alarmBike(serviceData.SN, parseInt(contentObject.messageBody.satellite), serviceData.Content.messageBody.alarmType, leanContentObject);
                // sendTextMessages(serviceData.SN,parseInt(contentObject.messageBody.satellite),serviceData.Content.messageBody.alarmType)
            }

        }
    }
}

// 处理电池断电，查找该车辆运维人员手机号码，发送短信
function getUserPhoneNumber(sn) {
    var getPhoneUrl = 'http://120.27.221.91:8080/minihorse_zb/StuCert/GetCarMes.do?SN=' + sn;
    httpUtil.httpGetRequest(getPhoneUrl, function (getResponseBody) {
        if(getResponseBody == undefined){
            console.error('minihorse_zb/StuCert/GetCarMes.do api error');
        }
        else {
            redisUtil.getSimpleValueFromRedis(sn, function (bikeId) {
                if(bikeId == null){
                    bikeId = sn;
                }

                var areaData = getResponseBody.data;
                var ownerData = areaData.PartnerinfoModel;
                var operateDatas = areaData.PerationuserModel;


                var phoneList = [];
                for(var i = 0; i < operateDatas.length; i++){
                    var perationUser = operateDatas[i];
                    if(perationUser.NeedWaring == 1){
                        phoneList.push(perationUser.UserPhone)
                    }
                }
                //老总放到最后提示，无视他是不是接受短信
                for(var i = 0; i < operateDatas.length; i++){
                    var perationUser = operateDatas[i];
                    if(perationUser.UserRealName.indexOf('总') != -1 && phoneList.indexOf(perationUser.UserPhone) == -1){
                        phoneList.push(perationUser.UserPhone)
                    }
                }
                //其次是负责人
                if(ownerData != null && (ownerData.PartnerCellPhone != null || ownerData.PartnerCellPhone != undefined) && phoneList.indexOf(ownerData.PartnerCellPhone) == -1){

                    phoneList.push(ownerData.PartnerCellPhone);
                }
                //最后是不接受短信的人
                // for (var i = 0; i < operateDatas.length; i++) {
                //     var perationUser = operateDatas[i];
                //     if (perationUser.NeedWaring != 1 && phoneList.indexOf(perationUser.UserPhone) == -1) {
                //         phoneList.push(perationUser.UserPhone)
                //     }
                // }

                //递归
                function alarmToPhone() {

                    if(phoneList.length == 0){
                        //无用户手机号时发这样几个手机号
                        phoneList.push('15850101846');
                        phoneList.push('15852580112');
                        phoneList.push('18379606803');
                        phoneList.push('17601528908');
                    }

                    if(sendPhoneIndex >= phoneList.length){
                        console.log('---------- bike: ' + bikeId + ' powerOff,and send error(no phone can send)');
                        return;
                    }

                    if(phoneList[sendPhoneIndex] == undefined || phoneList[sendPhoneIndex] == '' || phoneList[sendPhoneIndex].length < 10){
                        console.error('phoneList length is ' + phoneList.length);
                        console.error('sendPhoneIndex is ' + sendPhoneIndex + 'phoneList[sendPhoneIndex] is' + phoneList[sendPhoneIndex]);
                        sendPhoneIndex++;
                        alarmToPhone();
                        return;
                    }

                    redisUtil.getSimpleValueFromRedis(sn + '_batteryPower', function (bikeBattery) {
                        var bikeBatteryPower = bikeBattery;

                        // return;
                        var sendSmsData = {
                            mobilePhoneNumber: phoneList[sendPhoneIndex],
                            template: 'batteryAlarm',
                            bikeNumber: bikeId,
                            bikePower:bikeBatteryPower
                        };

                        alarmSms.sendAlarmSms(sendSmsData, function (Ret) {
                            sendPhoneIndex++;
                            if(Ret == 0 && sendPhoneIndex < phoneList.length){
                                //发送失败，且有人在，继续发送
                                alarmToPhone();
                            }else {
                                //报警成功，删掉这个key，reset

                            }
                        })
                    })


                }

                var sendPhoneIndex = 0;
                //开始根据发送短信人的优先级发送短信，先接受报警人，其次老板，然后是不接受短信的人
                console.log('---------- bike: ' + bikeId + ' powerOff,and start send sms to ' + phoneList[sendPhoneIndex] + '(' + sendPhoneIndex + ')');
                alarmToPhone(phoneList[sendPhoneIndex]);

            })

        }
    })
}

// 处理电池异常断电，发送短信和处理电池异常断电，发送报警给谢志佳服务器！
function batteryOff(sn, alarmType) {
    if (alarmType == 4){
        redisUtil.getSimpleValueFromRedis(getOpenBatteryKey(sn), function (openBattery) {
            redisUtil.getSimpleValueFromRedis(sn,function (bikeId) {
                if (bikeId == null){
                    bikeId = sn
                }

                if(openBattery != 1){
                    //not opened battery in 10 min

                    if (bikeId != null || bikeId != undefined){
                        httpUtil.httpPost({BicycleNo:bikeId + " | 2 ",Message:"车辆异常断电"})
                        getUserPhoneNumber(sn)
                    }
                }
            })

        })
    }
}

// 车辆有非法位移和非法触碰报警发送信息到谢志佳的服务器
// function sendTextMessages(sn, satellite, alarmType) {
//     // alarmType== 3 非法位移, alarmType== 2 非法触碰
//     var illegalityMoveCount = 0;
//     var illegalTouchCount = 0;
//     if (alarmType == 3){
//         if (satellite < 7){
//             return;
//         }
//         illegalityMoveCount++
//     }
//     else if (alarmType == 2){
//         illegalTouchCount++
//     }
//
//     if (illegalityMoveCount == 1 || illegalTouchCount == 1){
//         redisUtil.getSimpleValueFromRedis(sn, function (bikeId) {
//             var illegalityMoveCount = 0;
//             var illegalTouchCount = 0;
//             if (bikeId == null) {
//                 bikeId = sn;
//             }
//
//             var illegalityMovePoliceSecond = parseInt(process.env['illegalityMovePoliceMin']) * 60;
//             var illegalityMovePoliceCountInMin = 3;
//
//             var alarmRedisKey = getIllegalMoveKey(sn);
//             redisUtil.redisClient.hgetall(alarmRedisKey, function (err, alarmValues) {
//                 if(err != null){
//                     console.error('alarmBike hgetall in redis error, ', err.message);
//                     return;
//                 }
//
//                 if(alarmValues != null){
//                     //update 计数
//                     illegalTouchCount += parseInt(alarmValues.illegalTouchCount);
//                     illegalityMoveCount += parseInt(alarmValues.illegalityMoveCount);
//                 }
//
//                 redisUtil.getSimpleValueFromRedis(getSatelliteKey(sn), function (redisSatellite){
//                     if(redisSatellite != undefined && redisSatellite < 6)
//                     {
//                         // console.log('sn is not illegal shifting, because of lastest gps number is ', redisSatellite);
//                         return;
//                     }
//
//                     if(illegalityMoveCount >= illegalityMovePoliceCountInMin){
//
//                         console.log('查看是否走进来' + illegalityMoveCount + '非法位移')
//                         httpUtil.httpPost({BicycleNo:bikeId + " | 1 ",Message:"发生" + illegalityMoveCount + "非法位移"})
//                         httpUtil.httpPost({BicycleNo:bikeId + " | 3 ",Message:"发生" + illegalTouchCount + "非法触碰"})
//                     }
//                     else {
//                         redisUtil.redisClient.hmset(alarmRedisKey, 'illegalityMoveCount', illegalityMoveCount, 'illegalTouchCount', illegalTouchCount, function(err, response){
//                             if(err != null){
//                                 console.error('alarmBike hmset in redis error, ', err.message);
//                             }else {
//                                 redisUtil.redisClient.expire(alarmRedisKey, illegalityMovePoliceSecond);
//                             }
//                         });
//                     }
//
//                 })
//             })
//         })
//     }
// }

// 处理车辆非法位移和非法触碰报警，发送短信给该车的运维人员
function alarmBike(sn, satellite, alarmType, leanContentObject) {

    var illegalTouch = 0;
    var illegalMove = 0;

    switch (alarmType) {
        case 1:
            leanContentObject.set('bikeNState', 'fall');
            //车辆倒地
            break;
        case 2:
            leanContentObject.set('bikeNState', 'touches');
            illegalTouch++;
            // serviceData.Content.messageBody.alarmTypeDes = "非法触碰";

            break;
        case 3:
            leanContentObject.set('bikeNState', 'shifting');
            // serviceData.Content.messageBody.alarmTypeDes = "非法位移";

            //是不是因为定位漂移引起的非法位移
            if(satellite < 7){
                return;
            }
            illegalMove++;
            break;
        case 4:
            leanContentObject.set('bikeNState', 'powerOff');
            // serviceData.Content.messageBody.alarmTypeDes = "电源断电";
            break

        case 9:
            leanContentObject.set('bikeNState', 'vertical');
            // serviceData.Content.messageBody.alarmTypeDes = "车辆扶正";
            break;
        default:
            break;
    }

    if(illegalMove == 1 || illegalTouch == 1){
        //非法位移触发报警
        //配置参数
        var illegalityMovePoliceSecond = parseInt(process.env['illegalityMovePoliceMin']) * 60;
        var illegalityMovePoliceCountInMin = parseInt(process.env['illegalityMovePoliceCountInMin']);

        var alarmRedisKey = getIllegalMoveKey(sn);
        redisUtil.redisClient.hgetall(alarmRedisKey, function (err, alarmValues) {
            if(err != null){
                console.error('alarmBike hgetall in redis error, ', err.message);
                return;
            }

            //{ illegalMove: '2', illegalTouch: '2' }
            if(alarmValues != null){
                //update 计数
                illegalTouch += parseInt(alarmValues.illegalTouch);
                illegalMove += parseInt(alarmValues.illegalMove);
            }

            //更新生存时间为illegalityMovePoliceSecond秒
            // redisUtil.expire(alarmRedisKey, illegalityMovePoliceSecond);

            redisUtil.getSimpleValueFromRedis(getSatelliteKey(sn), function (redisSatellite) {
                if(redisSatellite != undefined && redisSatellite < 6)
                {
                    // console.log('sn is not illegal shifting, because of lastest gps number is ', redisSatellite);
                    return;
                }

                //call the sms to 觅马地面运维人员
                if(illegalMove >= illegalityMovePoliceCountInMin){
                    //请求觅马服务器，获取该车的负责人，发送短信
                    var reqData = {'SN': sn};
                    var getPhoneUrl = 'http://120.27.221.91:8080/minihorse_zb/StuCert/GetCarMes.do?SN=' + sn;
                    httpUtil.httpGetRequest(getPhoneUrl, function (getResponseBody) {

                        if(getResponseBody == undefined){
                            console.error('minihorse_zb/StuCert/GetCarMes.do api error');
                        }else {
                            redisUtil.getSimpleValueFromRedis(sn, function (bikeId) {
                                if(bikeId == null){
                                    bikeId = sn;
                                }

                                var areaData = getResponseBody.data;
                                var ownerData = areaData.PartnerinfoModel;
                                var operateDatas = areaData.PerationuserModel;


                                var phoneList = [];
                                for(var i = 0; i < operateDatas.length; i++){
                                    var perationUser = operateDatas[i];
                                    if(perationUser.NeedWaring == 1){
                                        phoneList.push(perationUser.UserPhone)
                                    }
                                }
                                //老总放到最后提示，无视他是不是接受短信
                                for(var i = 0; i < operateDatas.length; i++){
                                    var perationUser = operateDatas[i];
                                    if(perationUser.UserRealName.indexOf('总') != -1 && phoneList.indexOf(perationUser.UserPhone) == -1){
                                        phoneList.push(perationUser.UserPhone)
                                    }
                                }
                                //其次是负责人
                                if(ownerData != null && (ownerData.PartnerCellPhone != null || ownerData.PartnerCellPhone != undefined) && phoneList.indexOf(ownerData.PartnerCellPhone) == -1){

                                    phoneList.push(ownerData.PartnerCellPhone);
                                }
                                //最后是不接受短信的人
                                // for (var i = 0; i < operateDatas.length; i++) {
                                //     var perationUser = operateDatas[i];
                                //     if (perationUser.NeedWaring != 1 && phoneList.indexOf(perationUser.UserPhone) == -1) {
                                //         phoneList.push(perationUser.UserPhone)
                                //     }
                                // }

                                //递归
                                function alarmToPhone() {

                                    if(phoneList.length == 0){
                                        //无用户手机号时发这样几个手机号
                                        phoneList.push('15850101846');
                                        phoneList.push('15852580112');
                                        phoneList.push('18379606803');
                                        phoneList.push('17601528908');
                                    }

                                    if(sendPhoneIndex >= phoneList.length){
                                        console.log('---------- bike: ' + bikeId + ' shifting,and send error(no phone can send)');
                                        return;
                                    }

                                    if(phoneList[sendPhoneIndex] == undefined || phoneList[sendPhoneIndex] == '' || phoneList[sendPhoneIndex].length < 10){
                                        console.error('phoneList length is ' + phoneList.length);
                                        console.error('sendPhoneIndex is ' + sendPhoneIndex + 'phoneList[sendPhoneIndex] is' + phoneList[sendPhoneIndex]);
                                        sendPhoneIndex++;
                                        alarmToPhone();
                                        return;
                                    }

                                    // return;
                                    var sendSmsData = {
                                        mobilePhoneNumber: phoneList[sendPhoneIndex],
                                        template: 'bikeAlarm',
                                        bikeNumber: bikeId,
                                        alarmTime: process.env['illegalityMovePoliceMin'],
                                        touches: illegalTouch,
                                        illegalityMove: illegalMove
                                    };

                                    alarmSms.sendAlarmSms(sendSmsData, function (Ret) {
                                        sendPhoneIndex++;
                                        if(Ret == 0 && sendPhoneIndex < phoneList.length){
                                            //发送失败，且有人在，继续发送
                                            alarmToPhone();
                                        }else {
                                            //报警成功，删掉这个key，reset
                                            redisUtil.redisClient.del(alarmRedisKey, function (err, reply) {
                                                if(err != null){
                                                    console.error('alarmBike del in redis error, ', err.message);
                                                    return;
                                                }
                                            });
                                        }
                                    })
                                }

                                var sendPhoneIndex = 0;

                                if (bikeId != null || bikeId != undefined){
                                    //开始根据发送短信人的优先级发送短信，先接受报警人，其次老板，然后是不接受短信的人
                                    console.log('---------- bike: ' + bikeId + ' shifting,and start send sms to ' + phoneList[sendPhoneIndex] + '(' + sendPhoneIndex + ')');
                                    alarmToPhone(phoneList[sendPhoneIndex]);

                                    httpUtil.httpPost({BicycleNo:bikeId + " | 1 ",Message:"发生" + illegalMove + "非法位移"})
                                    httpUtil.httpPost({BicycleNo:bikeId + " | 3 ",Message:"发生" + illegalTouch + "非法触碰"})
                                }
                            })
                        }
                    })
                }
                else {
                    //未触发报警，也不更新这个key的时间，过期后重置
                    redisUtil.redisClient.hmset(alarmRedisKey, 'illegalMove', illegalMove, 'illegalTouch', illegalTouch, function(err, response){
                        if(err != null){
                            console.error('alarmBike hmset in redis error, ', err.message);
                        }else {
                            redisUtil.redisClient.expire(alarmRedisKey, illegalityMovePoliceSecond);
                        }
                    });
                }
            })
        })
    }
}

//以下为测试debug代码

var newEBikeLogSql = AV.Object.extend(logSqlUtil.getEBikeLogSqlName(undefined));
var newEBikeLog = new newEBikeLogSql();

newEBikeLog.set('SN', 'mimacx0000000778');
newEBikeLog.set('LogType', 5);
newEBikeLog.set('Content', '向[mimacx0000000756]转发命令请求成功,MsgSeq:101,payload:{"cmdID":1,"sn":"NjU3MDAwMDAwMHhjYW1pbQ=="}');
newEBikeLog.set('Remark', '发送命令');
newEBikeLog.set('SourceType', 0);

// var newEBikeLog = {};
// newEBikeLog.tt = "122";
// newEBikeLog.pp = "fffff";
// console.log('newEBikeLog ', newEBikeLog);

// unLockedBike(newEBikeLog)

// structLogContent(newEBikeLog)

// alarmBike('mimacx0000000382', 10, 3, newEBikeLog);

// redisUtil.getSimpleValueFromRedis('testKey', function (bikeLatestTime) {
//     if(bikeLatestTime != undefined || bikeLatestTime != null){
//         res.json({'bikeLatestTime' : bikeLatestTime});
//     }else {
//         //exist in redis , update time
//         res.json({'bikeLatestTime' : '无效车'});
//     }
// })

// for (var i = 1; i <= 4000; i++){
//     var snSu = '';
//     if(i < 10){
//         snSu = '000' + i;
//     }else if(i < 100){
//         snSu = '00' + i;
//     }else if(i < 1000){
//         snSu = '0' + i;
//     }else {
//         snSu = i;
//     }
//     console.log('mimacx000000' + snSu + '_Alarm');
//     //删除掉redis里的key
//     redisUtil.redisClient.del('mimacx000000' + snSu + '_Alarm');
// }

module.exports = router
