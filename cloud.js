/**
 * Created by wujiangwei on 2017/9/21.
 */
var AV = require('leanengine');

//分析处理车辆日志 Start
var httpUtil = require('./mimaBike/httpUtil');
var alarmSms = require('./mimaBike/alarmSms');
var logSqlUtil = require('./mimaBike/logSqlUtil');
var redisUtil = require('./redis/leanObjectRedis');

var MimaEBikeMapSql = AV.Object.extend('MimaEBikeMap');

//配置参数
var openBatteryMin = parseInt(process.env['openBatteryMin']);

function dealEBikeLog(logObject) {
    var SN = logObject.get("SN");
    //update bike time in redis
    redisUtil.setSimpleValueToRedis(SN + '_Time', new Date(), 0);

    //处理鉴权里的车辆号和sn号，保存到数据库
    var bikeID = logObject.get("bikeID");
    if(bikeID != undefined && bikeID.length > 7){
        //解析车辆号进行保存
        // console.log('dealEBikeLog, bikeID : ' , bikeID);
        setBikeMapWithRedis(SN, bikeID);
    }

    //监控服务器是否有异常
    //TODO: 要不同的车辆号出现异常（现在是统计了离线出现的次数）
    var serviceDataContent = logObject.get("Content");
    serviceMonitor(serviceDataContent);

    //MessageType 相关的处理：车辆状态，电池被盗监控等
    var messageType = logObject.get("messageType");
    var cmdID = logObject.get("cmdID");
    var cmdResponseResult = logObject.get("cmdResponseResult");
    var battery = logObject.get("battery");

    var payloadIndex = serviceDataContent.indexOf("payload:");
    if(payloadIndex != -1){
        var contentStr = serviceDataContent.substring(payloadIndex + 8, serviceDataContent.length);
        var contentObject = undefined;

        try{
            contentObject = JSON.parse(contentStr);
            if(contentObject != undefined){


                if (contentObject.messageType == 1 || (contentObject.cmdID == 1 && contentObject.result == 0) ||
                    contentObject.messageType == 7){

                    redisUtil.setSimpleValueToRedis(getBikeStateKey(SN),'electric',0)
                    if (parseInt(contentObject.messageBody.battery) == undefined || parseInt(contentObject.messageBody.battery) == 0){
                    }
                    else {
                        redisUtil.setSimpleValueToRedis(SN + '_batteryPower',parseInt(contentObject.messageBody.battery),0)
                    }

                }

                if (contentObject.messageType == 2 ||(contentObject.cmdID == 2 && contentObject.result == 0) ||
                    contentObject.messageType == 5 || contentObject.messageType == 6){

                    redisUtil.setSimpleValueToRedis(getBikeStateKey(SN),'noElectric',0)
                    if (parseInt(contentObject.messageBody.battery) == undefined || parseInt(contentObject.messageBody.battery) == 0){
                    }
                    else {
                        redisUtil.setSimpleValueToRedis(SN + '_batteryPower',parseInt(contentObject.messageBody.battery),0)
                    }
                }

                //保存定位
                if(contentObject.messageBody.latitudeMinute != undefined || contentObject.messageBody.longitudeMinute != undefined){
                    if(contentObject.messageBody.latitudeMinute != 0 || contentObject.messageBody.longitudeMinute != 0){
                        var lat = Number(contentObject.messageBody.latitudeMinute) / 60.0 + Number(contentObject.messageBody.latitudeDegree);
                        var lon = Number(contentObject.messageBody.longitudeMinute) / 60.0 + Number(contentObject.messageBody.longitudeDegree);
                        var satellite = lat + ',' + lon;

                        redisUtil.setSimpleValueToRedis(getSatelliteKey(SN), satellite, 600);
                    }

                }

            }
        }catch(err) {

        }
    }

    // if(serviceDataContent != undefined){
    //     if (serviceDataContent.messageType == 1 || serviceDataContent.cmdID == 1 || serviceDataContent.messageType == 7){
    //         redisUtil.setSimpleValueToRedis(getBikeStateKey(SN),'electric',0)
    //         if (serviceDataContent.battery != undefined && serviceDataContent.battery != 0){
    //             redisUtil.setSimpleValueToRedis(SN + '_batteryPower', battery, 0);
    //         }
    //     }
    //
    //     if (serviceDataContent.messageType == 2 || serviceDataContent.cmdID == 2 || serviceDataContent.messageType == 5 || serviceDataContent.messageType == 6){
    //         redisUtil.setSimpleValueToRedis(getBikeStateKey(SN), 'noElectric', 0)
    //         if (serviceDataContent.battery != undefined && serviceDataContent.battery != 0){
    //             redisUtil.setSimpleValueToRedis(SN + '_batteryPower', battery, 0);
    //         }
    //     }
    //
    //     if(satellite != undefined && satellite != null && satellite != 'null'){
    //         redisUtil.setSimpleValueToRedis(getSatelliteKey(SN), satellite, 600);
    //     }
    // }

    //车辆指令相关
    var cmdId = logObject.get("cmdId");
    if(cmdId == 6 ){
        //处理打开电池仓
        redisUtil.setSimpleValueToRedis(getOpenBatteryKey(SN), 1, openBatteryMin * 60);
    }
    //蓝牙打开电池仓
    var role = logObject.get('roleDes');
    console.log('这个字段有吗？：' + role);
    var actionMethod = logObject.get('actionMethod');
    if (actionMethod == 'BlueTooth' && role == 'operator'){
        redisUtil.setSimpleValueToRedis(getOpenBatteryKey(SN), 1, openBatteryMin * 60);
    }

    //车辆报警监控处理，若真的发生【车辆被非法运输】 和 【电池被盗】 则发送报警短信
    var alarmType = logObject.get("alarmType");
    if(alarmType != undefined) {
        var satellite = logObject.get("satellite");
        if (alarmType == 4){
            batteryOff(SN, alarmType)
        }
        else {
            alarmBike(SN, satellite, alarmType);
        }
    }
}

//deal log sub function
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
        // console.log('dealEBikeLog, serviceMonitor : ' , serviceDataContent);
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

//发送报警短信相关
// 处理电池断电，查找该车辆运维人员手机号码，发送短信
function getUserPhoneNumber(sn) {
    var getPhoneUrl = 'http://120.27.221.91:8080/minihorse_zb/StuCert/GetCarMes.do?SN=' + sn;
    httpUtil.httpGetRequest(getPhoneUrl, function (getResponseBody) {
        if(getResponseBody == undefined){
            console.error('minihorse_zb/StuCert/GetCarMes.do api error');
        }
        else {
            redisUtil.getSimpleValueFromRedis(sn, function (powerOffBikeId) {

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
                        console.log('---------- bike: ' + powerOffBikeId + ' powerOff,and send error(no phone can send)');
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
                            bikeNumber: powerOffBikeId,
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

                if(powerOffBikeId == null){
                    powerOffBikeId = sn;

                    var sendPhoneIndex = 0;
                    //开始根据发送短信人的优先级发送短信，先接受报警人，其次老板
                    console.log('---------- powerOffBikeSN: ' + powerOffBikeId + ' powerOff,and start send sms to ' + phoneList[sendPhoneIndex] + '(' + sendPhoneIndex + ')');
                    alarmToPhone(phoneList[sendPhoneIndex]);
                }
                else if (powerOffBikeId != ''){
                    var sendPhoneIndex = 0;
                    //开始根据发送短信人的优先级发送短信，先接受报警人，其次老板
                    console.log('---------- powerOffBikeID: ' + powerOffBikeId + ' powerOff,and start send sms to ' + phoneList[sendPhoneIndex] + '(' + sendPhoneIndex + ')');
                    alarmToPhone(phoneList[sendPhoneIndex]);
                }
            })

        }
    })
}

// 处理电池异常断电，发送短信和处理电池异常断电，发送报警给谢志佳服务器！
function batteryOff(sn, alarmType) {
    if (alarmType == 4){
        redisUtil.getSimpleValueFromRedis(getOpenBatteryKey(sn), function (openBattery) {
            redisUtil.getSimpleValueFromRedis(sn,function (powerBikeID) {

                if(openBattery != 1){
                    //not opened battery in 10 min
                    if (powerBikeID == null){
                        powerBikeID = sn

                        console.log('查看断电redis里状态' + powerBikeID);
                        httpUtil.httpPost({BicycleNo:powerBikeID + " | 2 ",Message:"车辆异常断电"})
                        getUserPhoneNumber(sn)
                    }
                    else {
                        httpUtil.httpPost({BicycleNo:powerBikeID + " | 2 ",Message:"车辆异常断电"})
                        getUserPhoneNumber(sn)
                    }

                }
            })

        })
    }
}

// 处理车辆非法位移和非法触碰报警，发送短信给该车的运维人员
function alarmBike(sn, satellite, alarmType) {

    var illegalTouch = 0;
    var illegalMove = 0;

    switch (alarmType) {
        case 2:
            illegalTouch++;
            //非法触碰
            break;
        case 3:
            //非法位移
            //是不是因为定位漂移引起的非法位移
            if(satellite < 7){
                return;
            }
            illegalMove++;
            break;
        default:
            return;
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
                                //开始根据发送短信人的优先级发送短信，先接受报警人，其次老板，然后是不接受短信的人
                                console.log('---------- shiftingBike: ' + bikeId + ' shifting,and start send sms to ' + phoneList[sendPhoneIndex] + '(' + sendPhoneIndex + ')');
                                alarmToPhone(phoneList[sendPhoneIndex]);

                                httpUtil.httpPost({BicycleNo:bikeId + " | 1 ",Message:"发生" + illegalMove + "非法位移"})
                                httpUtil.httpPost({BicycleNo:bikeId + " | 3 ",Message:"发生" + illegalTouch + "非法触碰"})
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

AV.Cloud.afterSave('MimaEBikeHistoryLogs', function(request) {
    dealEBikeLog(request.object);
});

AV.Cloud.afterSave('MimaEBikeLogsPartA', function(request) {
    dealEBikeLog(request.object);
});

AV.Cloud.afterSave('MimaEBikeLogsPartB', function(request) {
    dealEBikeLog(request.object);
});

AV.Cloud.afterSave('MimaEBikeLogsPartC', function(request) {
    dealEBikeLog(request.object);
});

AV.Cloud.afterSave('MimaEBikeLogsPartD', function(request) {
    dealEBikeLog(request.object);
});

AV.Cloud.afterSave('MimaEBikeLogsPartE', function(request) {
    dealEBikeLog(request.object);
});


// 监测是否有车裸奔，第一个函数处理获取未上锁车辆
function unLockedBikeList(unLockedBikeObject) {
    var unLockedObject = Object();
    unLockedObject.LogType = unLockedBikeObject.get('LogType');
    unLockedObject.Remark = unLockedBikeObject.get('Remark');

    unLockedObject.Content = unLockedBikeObject.get('Content');
    unLockedObject.SN = unLockedBikeObject.get('SN');

    var unLockedContent = unLockedBikeObject.get('Content');

    var payloadIndex = unLockedContent.indexOf("payload:");

    var contentObject = undefined;
    if (payloadIndex != -1 ){
        var contentStr = unLockedContent.substring(payloadIndex + 8, unLockedContent.length);

        contentObject = JSON.parse(contentStr);
    }

    var MsgSeqNumber = undefined;
    if (unLockedContent.indexOf("MsgSeq:") != -1){
        MsgSeqNumber = Number(unLockedContent.substring(unLockedContent.indexOf("MsgSeq:") + 7, unLockedContent.indexOf("MsgSeq:") + 10));
    }


    var timestamp = Date.parse(new Date());

    if (unLockedObject.LogType == 5 && MsgSeqNumber == 101 && contentObject.cmdID == 1){
        redisUtil.setSimpleValueToRedis(unLockedObject.SN + '_unLockComment', timestamp);
    }

    if (unLockedObject.LogType == 99 && unLockedObject.Remark == '借车'){
        redisUtil.redisClient.del(unLockedObject.SN + '_unLockComment',function (err, reply) {
            if(err != null){
                console.error('删除失败', err.message);
            }
        })
    }

    if (unLockedContent != undefined){
        if (contentObject.messageType == 1){
            redisUtil.getSimpleValueFromRedis(unLockedObject.SN + '_unLockComment',function (unLockCommentRel) {
                if (unLockCommentRel != null){
                    if (timestamp - unLockCommentRel > 120000){
                        redisUtil.getSimpleValueFromRedis(unLockedObject.SN,function (bikeID) {
                            if (bikeID != null){
                                redisUtil.redisClient.rpush('unLockedList', bikeID)
                            }
                        })
                    }
                    else {
                        redisUtil.redisClient.del(unLockedObject.SN + '_unLockComment',function (err, reply) {
                            if(err != null){
                                console.error('删除失败', err.message);
                            }
                        })
                    }
                }
            })
        }
    }
}

// 第二个函数处理裸奔车辆上锁
function lockedVehicles() {
    redisUtil.redisClient.lrange('unLockedList', 0, -1, function (err, unLockList) {

        if (unLockList.length > 0){
            for (var i = 0; i < unLockList.length; i++){
                var bicycleNo = unLockList[i];
                httpUtil.lockBikePost(bicycleNo);
            }
        }
    })
}

//以下为测试debug代码

var newEBikeLogSql = AV.Object.extend(logSqlUtil.getEBikeLogSqlName(undefined));
var newEBikeLog = new newEBikeLogSql();

// newEBikeLog.set('SN', 'mimacx0000000020');
// newEBikeLog.set('LogType', 5);
// newEBikeLog.set('Content', '向[mimacx0000000009]转发命令请求成功,MsgSeq:101,payload:{"cmdID":1,"sn":"MjEwMDAwMDAwMHhjYW1pbQ=="}');
// newEBikeLog.set('Remark', '命令请求');
// newEBikeLog.set('SourceType', 0);

newEBikeLog.set('SN', 'mimacx0000000020');
newEBikeLog.set('LogType', 3);
newEBikeLog.set('Content', '转发命令至OperService成功,cmdId:1,protocolMsgSeq:101,payload:{"sn":"mimacx0000000017","messageType":1,"messageBody":{"longitudeMinute":"24.8265","latitudeDegree":"31","totalMileage":"309.896","longitudeDegree":"120","battery":"68","latitudeMinute":"14.255"}}');
newEBikeLog.set('Remark', '上报数据');
newEBikeLog.set('SourceType', 0);

// var newEBikeLog = {};
// newEBikeLog.tt = "122";
// newEBikeLog.pp = "fffff";
// console.log('newEBikeLog ', newEBikeLog);

// unLockedBikeList(newEBikeLog)

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

//分析处理车辆日志结束

// 第二个函数处理裸奔车辆上锁
// function lockedVehicles() {
//     redisUtil.redisClient.lrange('unLockedList', 0, -1, function (err, unLockList) {
//
//         if (unLockList.length > 0){
//             for (var i = 0; i < unLockList.length; i++){
//                 var bicycleNo = unLockList[i];
//                 httpUtil.lockBikePost(bicycleNo);
//             }
//         }
//     })
// }

// AV.Cloud.define('lockedVehicles', function (request) {
//     redisUtil.redisClient.lrange('unLockedList', 0, -1, function (err, unLockList) {
//
//         if (unLockList.length > 0){
//             for (var i = 0; i < unLockList.length; i++){
//                 var bicycleNo = unLockList[i];
//                 httpUtil.lockBikePost(bicycleNo);
//             }
//         }
//     })
// })
//
// var paramsJson = {
//     movie: "夏洛特烦恼"
// };
//
// AV.Cloud.run('lockedVehicles', paramsJson).then(function(data) {
//     // 调用成功，得到成功的应答 data
// }, function(err) {
//     // 处理调用失败
// });