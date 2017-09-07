/**
 * Created by wujiangwei on 2017/9/03.
 */
const router = require('express').Router()
var AV = require('leanengine');

var redisUtil = require('../redis/leanObjectRedis');

var MimaEBikeMapSql = AV.Object.extend('MimaEBikeMap');
var NewEBikeLogSql = AV.Object.extend('MimaEBikeHistoryLogs');
var MimaActionSql = AV.Object.extend('MimaAction');

router.post('/', function(req, res) {

    var LogParam = req.body;
    var ActionParam = req.body;

    if(LogParam == undefined && ActionParam == undefined){
        return res.json({'errorCode': 1, 'errorMsg': 'LogParam and ActionParam is all empty'});
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

            structLogContent(newEBikeLog);

            newEBikeLog.save().then(function (savedNewEBikeLog) {
                lock++;
                if(lock == unlock){
                    return res.json({'errorCode':0});
                }
            }, function (error) {
                lock++;
                if(lock == unlock) {
                    console.error(req.body.SN + ' save log failed:' + error);
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

        if(ActionParam.role == undefined){
            lock++;
        }else {
            var MimaAction = new MimaActionSql();


            MimaAction.set('role', ActionParam.role);

            MimaAction.save().then(function (savedMimaActionObject) {
                lock++;
                if(lock == unlock){
                    return res.json({'errorCode':0});
                }
            }, function (error) {
                lock++;
                if(lock == unlock) {
                    console.error(req.body.SN + ' save log failed:' + error);
                    return res.json({'errorCode': -1, 'errorMsg': error.message});
                }
            });
        }
    }
})


function setBikeMapWithRedis(bikeSN, bikeID) {
    redisUtil.getSimpleValueFromRedis(bikeSN, function (bikeID) {
        if(bikeID == undefined || bikeID == null){
            //query,if not in mangdb,set it in
            var ebikeHistoryLogQuery = new AV.Query('MimaEBikeMapSql');
            ebikeHistoryLogQuery.equalTo('SN', bikeSN);

            // console.log('----- ebileLogList ----- start: ' + new Date() + ':' + new Date().getMilliseconds());
            ebikeHistoryLogQuery.find().then(function(MimaEBikeMapObjects) {
                if(MimaEBikeMapObjects.length == 0){
                    var newMimaEBikeMapObject = new MimaEBikeMapObjects();
                    newMimaEBikeMapObject.set('SN', bikeSN);
                    newMimaEBikeMapObject.set('bikeID', bikeID);
                    newMimaEBikeMapObject.save().then(function (savedObject) {
                        //auto set it in redis
                    },function (err) {
                        console.error('find bike and sn but save error :', err.message);
                    })
                }else {
                    //not in redis but in sql,so set it in redis
                    redisUtil.setSimpleValueToRedis(bikeSN, bikeID, 0);
                }

                console.log('bike and sn exist');
            }, function (err) {
                console.error('find bike and sn error :' , err.message);
            })
        }else {
            //exist in redis , ingore
        }
    })
}

function structLogContent(leanContentObject) {
    var serviceData = Object();
    serviceData.LogType = leanContentObject.get('LogType');
    serviceData.Remark = leanContentObject.get('Remark');
    serviceData.SourceType = leanContentObject.get('SourceType');
    serviceData.Content = leanContentObject.get('Content');

    var serviceDataContent = serviceData.Content;

    //处理鉴权事宜
    if(serviceData.LogType == 1){
        //解析车辆号进行保存
        var payloadIndex = serviceDataContent.indexOf("Payload:");
        if(payloadIndex != -1){

            var authContentStr = serviceDataContent.substring(payloadIndex + 8, serviceDataContent.length);
            var authContentObject = undefined;

            try {
                authContentObject = JSON.parse(contentStr);
                leanContentObject.set('bikeID', authContentObject.bikeID);
                setBikeMapWithRedis(leanContentObject.get('SN'), authContentObject.bikeID);
            }catch(err) {
                console.error('auth with no bikeId');
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

                if(contentObject.messageBody == undefined && contentObject.data != undefined){
                    //控制车辆的命令响应，返回的是data，而不是messageBody（这个是车辆的报文）
                    contentObject.messageBody = contentObject.data;
                }

                leanContentObject.set('satellite', contentObject.messageBody.satellite);
                if(contentObject.messageBody.charging != undefined && contentObject.messageBody.charging != null && contentObject.messageBody.charging != 'null'){
                    leanContentObject.set('charging', contentObject.messageBody.charging);
                }

                if(contentObject.messageBody.chargeCount != undefined && contentObject.messageBody.chargeCount != null && contentObject.messageBody.chargeCount != 'null'){
                    leanContentObject.set('chargeCount', contentObject.messageBody.chargeCount);
                }

                leanContentObject.set('totalMileage', parseInt(contentObject.messageBody.totalMileage));
                leanContentObject.set('errorCode', contentObject.messageBody.errorCode);
                leanContentObject.set('battery', parseInt(contentObject.messageBody.battery));

                //只保存实时定位，且搜星数大于5
                if(contentObject.messageBody.gpstype == 1 && contentObject.messageBody.satellite > 5){

                    //忽略历史信息的报文，不去存储，主要是多个定位信息，创建对象不支持，如果单独创建一个位置对象，对数据的开销是X2的开销，不划算
                    if(contentObject.messageBody.latitudeMinute == undefined || contentObject.messageBody.longitudeMinute == undefined){
                        console.error(contentObject.id + ': no latitudeMinute or longitudeMinute');
                        return;
                    }

                    var lat = Number(contentObject.messageBody.latitudeMinute) / 60.0 + Number(contentObject.messageBody.latitudeDegree);
                    var lon = Number(contentObject.messageBody.longitudeMinute) / 60.0 + Number(contentObject.messageBody.longitudeDegree);
                    leanContentObject.set('bikeGeo', new AV.GeoPoint(lat, lon));
                }
            }
        }catch(err) {
            //other message
            console.error('payload: not struct');
            console.log(serviceDataContent);
        }

        serviceData.Content = contentObject;
    }else {
        console.error(contentObject.id + 'no payload and Payload');
        console.log(contentStr);
    }

    //commend ID
    if(contentObject.cmdID != undefined){
        //LogType(5:发起请求，6请求响应)
        //保存请求的参数 和 响应的结果
        if(serviceData.Content.argument != undefined){
            leanContentObject.set('cmdRequestArgument', serviceData.Content.argument);
        }else if(serviceData.Content.result != undefined){
            leanContentObject.set('cmdResponseResult', serviceData.Content.result != undefined);
        }
    }

    //deal data
    if(serviceData.Content.messageBody != undefined){
        //1 锁车中，2 行使中，3 防盗中
        leanContentObject.set('ctrlState', serviceData.Content.messageBody.ctrlState);

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
        //deal ebike job type
        if(serviceData.Content.messageBody.alarmType != undefined) {
            switch (serviceData.Content.messageBody.alarmType) {
                case 1:
                    leanContentObject.set('bikeNState', 'fall');
                    break;
                case 2:
                    leanContentObject.set('bikeNState', 'touches');
                    // serviceData.Content.messageBody.alarmTypeDes = "非法触碰";
                    break;
                case 3:
                    leanContentObject.set('bikeNState', 'shifting');
                    // serviceData.Content.messageBody.alarmTypeDes = "非法位移";
                    break;
                case 4:
                    leanContentObject.set('bikeNState', 'powerOff');
                    // serviceData.Content.messageBody.alarmTypeDes = "电源断电";
                    break;
                case 9:
                    leanContentObject.set('bikeNState', 'vertical');
                    // serviceData.Content.messageBody.alarmTypeDes = "车辆扶正";
                    break;
                default:
                    break;
            }
        }
    }
}


//日志字符串变成结构体
function dealOldDateToStruct() {
    var pageCount = 1000;
    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.doesNotExist('coordinate');
    ebikeHistoryLogQuery.limit(pageCount);
    ebikeHistoryLogQuery.descending('createdAt');
    ebikeHistoryLogQuery.find().then(function (objects) {

        var inEnd = (objects.length == 0) ? true : (objects.length%pageCount > 0 ? true : false);
        for (var i = 0; i < objects.length; i++){
            var tempObject = objects[i];
            structLogContent(tempObject);
        }

        // 批量保存
        AV.Object.saveAll(objects).then(function () {
            // 成功
            console.log('struct ' + objects.length + ' old logs : ', objects[0].createdAt);
            if(inEnd == false){
                dealOldDateToStruct();
            }else {
                console.log('struct end');
            }
        }, function (error) {
            // 异常处理
            console.log('saveAll objects error: ', error.message);
        });

    }, function (error) {
        console.log('struct objects query error: ', error.message);
    });
}

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

// dealOldDateToStruct();

module.exports = router
