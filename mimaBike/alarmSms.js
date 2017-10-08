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
        console.log(requestSmsData['template'] + ': send sms succeed, alarmBike :' + requestSmsData['bikeNumber'] + ' , send sms to ' + requestSmsData['mobilePhoneNumber']);
    }, function(err){
        //发送失败
        callback(false);
        console.error(requestSmsData['template'] + ': send sms failed( ' + err.message + ' ), alarmBike :' + requestSmsData['bikeNumber'] + ' , send sms to ' + requestSmsData['alarmPhone']);
    });
}

exports.getServiceMonitorMembers = function () {
    var sendSmsData = {
        mobilePhoneNumber: '17601528908',
        template: 'getBikeBack',
        bikeNumber: 'Socket服务器异常',
        ServiceMonitorDes: 'Socket服务器异常'
    };
    var sendSmsData_Wrr = {
        mobilePhoneNumber: '18362627616',
        template: 'getBikeBack',
        bikeNumber: 'Socket服务器异常(截屏异常时的log)',
        ServiceMonitorDes: 'Socket服务器异常(截屏异常时的log)'
    };
    var sendSmsData_Sk = {
        mobilePhoneNumber: '18362627616',
        template: 'getBikeBack',
        bikeNumber: 'Socket服务器异常(截屏异常时的log)',
        ServiceMonitorDes: 'Socket服务器异常(截屏异常时的log)'
    };
    var sendSmsData_Wcl = {
        mobilePhoneNumber: '18362627616',
        template: 'getBikeBack',
        bikeNumber: 'Socket服务器异常(电话相关人)',
        ServiceMonitorDes: 'Socket服务器异常(电话相关人)'
    };
    var sendSmsData_Lym = {
        mobilePhoneNumber: '18362627616',
        template: 'getBikeBack',
        bikeNumber: 'Socket服务器异常(电话相关人)',
        ServiceMonitorDes: 'Socket服务器异常(电话相关人)'
    };

    return [sendSmsData];

    return [sendSmsData, sendSmsData_Sk, sendSmsData_Wrr, sendSmsData_Wcl, sendSmsData_Lym];
}