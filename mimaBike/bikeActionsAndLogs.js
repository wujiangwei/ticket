/**
 * Created by wujiangwei on 2017/9/03.
 */
const router = require('express').Router()
var AV = require('leanengine');
var httpUtil = require('./httpUtil');
var alarmSms = require('./alarmSms');

var redisUtil = require('../redis/leanObjectRedis');

var MimaEBikeMapSql = AV.Object.extend('MimaEBikeMap');
var NewEBikeLogSql = AV.Object.extend('MimaEBikeHistoryLogs');
var MimaActionSql = AV.Object.extend('MimaAction');

//配置参数
var openBatteryMin = parseInt(process.env['openBatteryMin']);

//Redis Key
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

router.post('/', function(req, res) {

    var LogParam = req.body;
    var ActionParam = req.body;

    if(LogParam == undefined && ActionParam == undefined){
        return res.json({'errorCode': 1, 'errorMsg': 'LogParam and ActionParam is all empty'});
    }

    if(LogParam.SN == undefined || ActionParam.SN == undefined){
        return res.json({'errorCode': 1, 'errorMsg': 'SN is empty'});
    }

    var lock = 0;
    var unlock = 2;
    {
        //Log
        if(LogParam == undefined){
            lock++;
        }else {
            //SN LogType Content Remark OperationTime SourceType
            var newEBikeLog = new NewEBikeLogSql();

            newEBikeLog.set('SN', LogParam.SN);
            newEBikeLog.set('LogType', parseInt(LogParam.LogType));
            newEBikeLog.set('Content', LogParam.Content);
            newEBikeLog.set('Remark', LogParam.Remark);
            newEBikeLog.set('SourceType', parseInt(LogParam.SourceType));

            // 监控socket服务器正常否


            structLogContent(newEBikeLog);

            //update bike time in redis
            redisUtil.setSimpleValueToRedis(LogParam.SN + '_Time', new Date(), 0);

            newEBikeLog.save().then(function (savedNewEBikeLog) {
                lock++;
                if(lock == unlock){
                    return res.json({'errorCode':0});
                }
            }, function (error) {
                lock++;
                if(lock == unlock) {
                    console.log(req.body.SN + ' save log failed:' + error);
                    return res.json({'errorCode': -1, 'errorMsg': error.message});
                }
            });
        }
    }

    {
        //Action
        //角色，角色ID，角色名
        //role : user,operator,bike,service(by me)
        //roleGuid : 这些角色在觅马数据库里的Guid
        //rolePhone : userPhone,operatorPhone,SN,servicePhone
        //roleName : userName,operatorName,bikeNumber,serviceName

        //action(录入车辆，预约，借车，锁车，开锁，还车，电池仓，上线，下线，报警):
        //  depositSucceed,depositRefundSubmit,depositRefundSucceed

        //  bindBikeToSystem

        //  （可以根据车辆报文得到success的话，一些success就不用传）
        //  appointmentFailed,appointmentSucceed
        //  tryTakeCar,takeCarSucceed,takeCarFailed
        //  tryUnlockCar,unlockCarSucceed,unlockCarFailed
        //  tryLockCar,lockCarSucceed,lockCarFailed
        //  tryReturnBike,returnBikeSucceed,returnBikeFailed,returnBikeByPic

        // tryOpenBatteryHouse,openBatteryHouseSucceed,openBatteryHouseFailed

        // takeBikeOnline,takeBikeOffline

        // changeBikeAlarm

        // 觅马用户和客服交互的行为
        // reportUseBikeOrder

        // 其他低优先级行为(觅马出行App内)
        // reportBike,feedbackBike

        //actionMethod:(Bike:2G,BlueTooth)(Other:System,Phone)

        //actionMessage:(some string)
        //  bindBikeToSystem(车辆录入到X区域成功)
        //  reportBike,feedbackBike (用户提交的文案)
        //  reportUseBikeOrder(客服的处理结果：无效，退款X元，现金退款X元)

        //actionPicUrl(for action:returnBikeByPic,reportBike,feedbackBike)

        if(ActionParam.role == undefined || ActionParam.SN == undefined){
            lock++;
        }else {
            var MimaAction = new MimaActionSql();
            MimaAction.set('role', ActionParam.role);
            MimaAction.set('roleGuid', ActionParam.roleGuid);
            MimaAction.set('rolePhone', ActionParam.rolePhone);
            MimaAction.set('roleName', ActionParam.roleName);
            MimaAction.set('action', ActionParam.action);
            MimaAction.set('actionMethod', ActionParam.actionMethod);
            MimaAction.set('SN', ActionParam.SN);
            MimaAction.set('bikeId', ActionParam.bikeNo);

            //开电池仓，用于报警逻辑
            if(ActionParam.action == 'openBatteryHouseSucceed'){
                redisUtil.setSimpleValueToRedis(getOpenBatteryKey(ActionParam.SN), 1, openBatteryMin * 60);
            }

            MimaAction.save().then(function (savedMimaActionObject) {
                lock++;
                if(lock == unlock){
                    return res.json({'errorCode':0});
                }
            }, function (error) {
                lock++;
                if(lock == unlock) {
                    console.log(req.body.SN + ' save log failed:' + error);
                    return res.json({'errorCode': -1, 'errorMsg': error.message});
                }
            });
        }
    }
})


router.post('/getBikeLatestLogTime',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    var bikeSNKey = req.body.SN + '_Time';
    redisUtil.getSimpleValueFromRedis(bikeSNKey, function (bikeLatestTime) {
        if(bikeLatestTime != undefined || bikeLatestTime != null){
            res.json({'bikeLatestTime' : bikeLatestTime});
        }else {
            //exist in redis , update time
            res.json({'bikeLatestTime' : '无效车'});
        }
    })
})

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

function structLogContent(leanContentObject) {
    var serviceData = Object();
    serviceData.LogType = leanContentObject.get('LogType');
    serviceData.Remark = leanContentObject.get('Remark');
    serviceData.SourceType = leanContentObject.get('SourceType');
    serviceData.Content = leanContentObject.get('Content');
    serviceData.SN = leanContentObject.get('SN');

    var serviceDataContent = serviceData.Content;

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
                }

                if (contentObject.messageType == 2 ||(contentObject.cmdID == 2 && contentObject.result == 0) ||
                        contentObject.messageType == 5 || contentObject.messageType == 6){
                    
                    redisUtil.setSimpleValueToRedis(getBikeStateKey(serviceData.SN),'noElectric',0)
                }


                if(contentObject.messageBody == undefined && contentObject.data != undefined){
                    //控制车辆的命令响应，返回的是data，而不是messageBody（这个是车辆的报文）
                    contentObject.messageBody = contentObject.data;
                }

                if(contentObject.messageBody.satellite != undefined && contentObject.messageBody.satellite != null && contentObject.messageBody.satellite != 'null'){
                    leanContentObject.set('satellite', parseInt(contentObject.messageBody.satellite));
                    redisUtil.setSimpleValueToRedis(getSatelliteKey(serviceData.SN), parseInt(contentObject.messageBody.satellite), 600);
                }

                if(contentObject.messageBody.charging != undefined && contentObject.messageBody.charging != null && contentObject.messageBody.charging != 'null'){
                    leanContentObject.set('charging', parseInt(contentObject.messageBody.charging));
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
        if(serviceData.Content.argument != undefined){
            leanContentObject.set('cmdRequestArgument', serviceData.Content.argument);
        }else if(serviceData.Content.result != undefined){
            leanContentObject.set('cmdResponseResult', serviceData.Content.result != undefined);
        }

        leanContentObject.set('cmdId', parseInt(contentObject.cmdID));
        if(parseInt(contentObject.cmdID) == 6){
            //处理打开电池仓
            redisUtil.setSimpleValueToRedis(getOpenBatteryKey(serviceData.SN), 1, openBatteryMin * 60);
        }
    }

    //deal data
    if(serviceData.Content != undefined && serviceData.Content.messageBody != undefined){
        //1 锁车中，2 行使中，3 防盗中
        leanContentObject.set('ctrlState', parseInt(serviceData.Content.messageBody.ctrlState));

        //deal ebike job type
        if(serviceData.Content.messageBody.ctrlState != undefined) {
            switch (serviceData.Content.messageBody.ctrlState) {
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
            alarmBike(serviceData.SN, parseInt(contentObject.messageBody.satellite), serviceData.Content.messageBody.alarmType, leanContentObject);
        }
    }
}


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
        {
            //TODO 查看打开电池仓何时成功的，10分钟内，则断电是正常的，否则不正常。发送报警短信。
            // redisUtil.getSimpleValueFromRedis(getOpenBatteryKey(sn), function (openBattery) {
            //     if(openBattery != 1){
            //         //not opened battery in 10 min
            //         var bikeNumber = sn;
            //         redisUtil.getSimpleValueFromRedis(sn, function (bikeId) {
            //             if(bikeId != null){
            //                 bikeNumber = bikeId;
            //             }
            //
            //             var smsData = {
            //                 mobilePhoneNumber: alarmPhone,
            //                 template: 'batteryAlarm',
            //                 bikeNumber: bikeNumber
            //             };
            //             alarmSms.sendAlarmSms(smsData);
            //         })
            //     }
            // })
        }
            break;
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
                    console.log('sn is not illegal shifting, because of lastest gps number is ', redisSatellite);
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
                                for (var i = 0; i < operateDatas.length; i++) {
                                    var perationUser = operateDatas[i];
                                    if (perationUser.NeedWaring != 1 && phoneList.indexOf(perationUser.UserPhone) == -1) {
                                        phoneList.push(perationUser.UserPhone)
                                    }
                                }

                                //递归
                                function alarmToPhone() {

                                    if(phoneList[sendPhoneIndex] == undefined || phoneList[sendPhoneIndex] == ''){
                                        console.error('phoneList length is ' + phoneList.length);
                                        console.error('sendPhoneIndex is ' + sendPhoneIndex);
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
                                alarmToPhone(phoneList[sendPhoneIndex]);

                                // httpUtil.httpGetBicycleState(bikeId,function (bicycleState) {
                                //     if (bicycleState == true){
                                //         return
                                //     }
                                //     else {
                                //         var areaData = getResponseBody.data;
                                //         var ownerData = areaData.PartnerinfoModel;
                                //         var operateDatas = areaData.PerationuserModel;
                                //
                                //
                                //         var phoneList = [];
                                //         for(var i = 0; i < operateDatas.length; i++){
                                //             var perationUser = operateDatas[i];
                                //             if(perationUser.NeedWaring == 1){
                                //                 phoneList.push(perationUser.UserPhone)
                                //             }
                                //         }
                                //         //老总放到最后提示，无视他是不是接受短信
                                //         for(var i = 0; i < operateDatas.length; i++){
                                //             var perationUser = operateDatas[i];
                                //             if(perationUser.UserRealName.indexOf('总') != -1 && phoneList.indexOf(perationUser.UserPhone) == -1){
                                //                 phoneList.push(perationUser.UserPhone)
                                //             }
                                //         }
                                //         //其次是负责人
                                //         if(ownerData.PartnerCellPhone != undefined && phoneList.indexOf(ownerData.PartnerCellPhone) == -1){
                                //             phoneList.push(ownerData.PartnerCellPhone);
                                //         }
                                //         //最后是不接受短信的人
                                //         for (var i = 0; i < operateDatas.length; i++) {
                                //             var perationUser = operateDatas[i];
                                //             if (perationUser.NeedWaring != 1 && phoneList.indexOf(perationUser.UserPhone) == -1) {
                                //                 phoneList.push(perationUser.UserPhone)
                                //             }
                                //         }
                                //
                                //         //递归
                                //         function alarmToPhone() {
                                //             // return;
                                //             var sendSmsData = {
                                //                 mobilePhoneNumber: phoneList[sendPhoneIndex],
                                //                 template: 'bikeAlarm',
                                //                 bikeNumber: bikeId,
                                //                 alarmTime: process.env['illegalityMovePoliceMin'],
                                //                 touches: illegalTouch,
                                //                 illegalityMove: illegalMove
                                //             };
                                //             alarmSms.sendAlarmSms(sendSmsData, function (Ret) {
                                //                 sendPhoneIndex++;
                                //                 if(Ret == 0 && sendPhoneIndex < phoneList.length){
                                //                     //发送失败，且有人在，继续发送
                                //                     alarmToPhone();
                                //                 }else {
                                //                     //报警成功，删掉这个key，reset
                                //                     redisUtil.redisClient.del(alarmRedisKey, function (err, reply) {
                                //                         if(err != null){
                                //                             console.error('alarmBike del in redis error, ', err.message);
                                //                             return;
                                //                         }
                                //                     });
                                //                 }
                                //             })
                                //         }
                                //
                                //         var sendPhoneIndex = 0;
                                //         //开始根据发送短信人的优先级发送短信，先接受报警人，其次老板，然后是不接受短信的人
                                //         alarmToPhone(phoneList[sendPhoneIndex]);
                                //     }
                                // })

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

//删除旧的日志
function deleteOldDateLogs(maxTime, queryDateLess) {

    maxTime--;
    if(maxTime == 0){
        console.log('delete end with maxTime');
        return;
    }else {
        console.log('batch delete with maxTime ', maxTime);
    }

    var pageCount = 1000;
    var tempQueryDateLess = queryDateLess;
    if(tempQueryDateLess == undefined){
        tempQueryDateLess = new Date("2017/09/6 01:00:00");
    }

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', tempQueryDateLess);
    ebikeHistoryLogQuery.limit(pageCount);
    ebikeHistoryLogQuery.descending('createdAt');
    ebikeHistoryLogQuery.find().then(function (objects) {

        var count = objects.length;
        var inEnd = (count == 0) ? true : (count%pageCount > 0 ? true : false);

        if(inEnd == false){
            tempQueryDateLess = objects[count - 1].createdAt;
        }

        // 批量删除
        AV.Object.destroyAll(objects).then(function () {
            // 成功
            console.log('delete ' + objects.length + ' old logs : ', tempQueryDateLess.toLocaleString())
            if(inEnd == false){
                deleteOldDateLogs(maxTime, tempQueryDateLess);
            }else {
                console.log('end delete old logs');
            }
        }, function (error) {
            // 异常处理
            console.log('destroyAll objects error: ', error.message);
        });

    }, function (error) {
        console.log('delete objects query error: ', error.message);
    });
}

// deleteOldDateLogs(20);


var newEBikeLog = new NewEBikeLogSql();

newEBikeLog.set('SN', 'mimacx0000000052');
newEBikeLog.set('LogType', '3');
newEBikeLog.set('Content', 'protocolCmId:3,payload:{"sn":"NTI1MDAwMDAwMHhjYW1pbQ==","messageType":2,"messageBody":{"latitudeDegree":31,"latitudeMinute":13.480080,"longitudeDegree":120,"longitudeMinute":25.231680,"totalMileage":200.344000,"battery":91,"satellite":6,"chargeCount":3,"charging":false,"errorCode":"000000000","ctrlState":1,"kickstand":0,"gpstype":1,"timeStamp":"2017-09-19 22:12:39","cellId":"460.00.20831.19043"}}');
newEBikeLog.set('Remark', '上报数据');
newEBikeLog.set('SourceType', 0);

// structLogContent(newEBikeLog)

// alarmBike('mimacx0000000052', 10, 3, newEBikeLog);

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
