/**
 * Created by wujiangwei on 2017/9/03.
 */
const router = require('express').Router()
var AV = require('leanengine');
var logSqlUtil = require('../mimaBike/logSqlUtil');

router.post('/', function(req, res) {

    var LogParam = req.body;
    if(LogParam == undefined){
        console.error("LogParam is invalid : ", LogParam);
        return res.json({'errorCode': 1, 'errorMsg': 'LogParam is invalid'});
    }

    //无效的SN号并且是无效的BicycleNo
    if((LogParam.SN == undefined || LogParam.SN.length != 16) &&
        (LogParam.BicycleNo == undefined || LogParam.BicycleNo.length < 7)){
        console.error("LogParam is invalid : ", LogParam);
        return res.json({'errorCode': 1, 'errorMsg': 'LogParam is invalid'});
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

    newEBikeLog.set('LogType', parseInt(LogParam.LogType));
    newEBikeLog.set('Content', LogParam.Content);
    newEBikeLog.set('Remark', LogParam.Remark);
    newEBikeLog.set('SourceType', parseInt(LogParam.SourceType));
    if(LogParam.BicycleNo != undefined && LogParam.BicycleNo.length > 5){
        newEBikeLog.set('bikeID', LogParam.BicycleNo);
    }

    var ret = structLogContent(newEBikeLog);
    if(ret == true){
        newEBikeLog.save().then(function (savedNewEBikeLog) {
            //
        }, function (error) {
            console.error(req.body.SN + ' save log failed:' + error);
        });
    }

    return res.json({'errorCode': 0});
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
                if(contentObject.messageBody == undefined && contentObject.data != undefined){
                    //控制车辆的命令响应，返回的是data，而不是messageBody（这个是车辆的报文）
                    contentObject.messageBody = contentObject.data;
                }

                if (contentObject.messageType == 8){
                    return false;
                }

                //周期性报文
                if(contentObject.messageType == 1 || contentObject.messageType == 2){
                    if(parseInt(contentObject.messageBody.gpstype) == 1 && parseInt(contentObject.messageBody.satellite) < 6){
                        //无效的周期性报文定位
                        // return false;
                    }
                }

                if(contentObject.messageBody.messageType != undefined && contentObject.messageBody.messageType != null && contentObject.messageBody.messageType != 'null'){
                    leanContentObject.set('messageType', parseInt(contentObject.messageType));
                }

                if(contentObject.messageBody.satellite != undefined && contentObject.messageBody.satellite != null && contentObject.messageBody.satellite != 'null'){
                    leanContentObject.set('satellite', parseInt(contentObject.messageBody.satellite));
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

                if(contentObject.messageBody.actionMethod != undefined && contentObject.messageBody.actionMethod != null && contentObject.messageBody.actionMethod != 'null'){
                    leanContentObject.set('actionMethod', parseInt(contentObject.messageBody.actionMethod));
                }

                //保存定位
                if(contentObject.messageBody.latitudeMinute != undefined || contentObject.messageBody.longitudeMinute != undefined){
                    if(contentObject.messageBody.latitudeMinute != 0 || contentObject.messageBody.longitudeMinute != 0){
                        var lat = Number(contentObject.messageBody.latitudeMinute) / 60.0 + Number(contentObject.messageBody.latitudeDegree);
                        var lon = Number(contentObject.messageBody.longitudeMinute) / 60.0 + Number(contentObject.messageBody.longitudeDegree);
                        leanContentObject.set('bikeGeo', new AV.GeoPoint(lat, lon));
                    }
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
            var alarmType = parseInt(serviceData.Content.messageBody.alarmType);
            leanContentObject.set('alarmType', alarmType);

            switch (alarmType) {
                case 1:
                    leanContentObject.set('bikeNState', 'fall');
                    //车辆倒地
                    break;
                case 2:
                    leanContentObject.set('bikeNState', 'touches');
                    //非法触碰
                    break;
                case 3:
                    leanContentObject.set('bikeNState', 'shifting');
                    //非法位移
                    break;
                case 4:
                    leanContentObject.set('bikeNState', 'powerOff');
                    //电源断电
                    break

                case 9:
                    //不保存车辆扶正的报文
                    leanContentObject.set('bikeNState', 'vertical');
                    // return false;
                default:
                    break;
            }
        }
    }

    return true;
}


var newEBikeLogSql = AV.Object.extend("MimaEBikeLogsPartB");
var newEBikeLog = new newEBikeLogSql();

newEBikeLog.set('SN', 'mimacx0000000000');
newEBikeLog.set('LogType', 5);
newEBikeLog.set('Content', '向[mimacx0000000009]转发命令请求成功,MsgSeq:101,payload:{"cmdID":1,"sn":"MjEwMDAwMDAwMHhjYW1pbQ=="}');
newEBikeLog.set('Remark', '命令请求');
newEBikeLog.set('SourceType', 0);

// newEBikeLog.set('SN', 'mimacx0000000000');
// newEBikeLog.set('LogType', 3);
// newEBikeLog.set('Content', 'protocolCmId:3,payload:{"sn":"MjEwMDAwMDAwMHhjYW1pbQ==","messageType":1,"messageBody":{"latitudeDegree":31,"latitudeMinute":14.259180,"longitudeDegree":120,"longitudeMinute":24.825480,"totalMileage":306.973000,"battery":90,"gpstype":2,"satellite":0,"timeStamp":"2017-10-25 15:00:19","cellId":"460.00.20831.14753"}}');
// newEBikeLog.set('Remark', '上报数据');
// newEBikeLog.set('SourceType', 0);


var ret = structLogContent(newEBikeLog)
if(ret == true){
    newEBikeLog.save().then(function (savedNewEBikeLog) {
        console.log('debug structLogContent success');
    }, function (error) {
        console.log('mimacx0000000000 save log failed:' + error);
    });
}else {
    console.log('debug structLogContent false');
}

module.exports = router
