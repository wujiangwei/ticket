/**
 * Created by wujiangwei on 2017/9/13.
 */

var AV = require('leanengine');

exports.sendAlarmSms = function (requestSmsData, callback) {
    //发送报警短信
    //mobilePhoneNumber, template, sign(短信签名)
    AV.Cloud.requestSmsCode(requestSmsData).then(function(){
        //发送成功
        callback(true);
        console.log(requestSmsData['template'] + ': send sms succeed, alarmBike :' + requestSmsData['bikeNumber'] + ' , send sms to ' + requestSmsData['alarmPhone']);
    }, function(err){
        //发送失败
        callback(false);
        console.error(requestSmsData['template'] + ': send sms failed( ' + err.message + ' ), alarmBike :' + requestSmsData['bikeNumber'] + ' , send sms to ' + requestSmsData['alarmPhone']);
    });
}