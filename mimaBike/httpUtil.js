/**
 * Created by wujiangwei on 2017/9/13.
 */
var http = require('http');

exports.httpRequest = function (url, port, path, method, reqData, callback) {

    if(method == 'POST'){
        var jsonData = JSON.stringify(reqData);
        var post_options = {
            host: url,
            port: port,
            path: path,
            method: 'POST'

        };

        var post_req = http.request(post_options, function (response) {
            var responseText = [];
            var size = 0;

            if (response.statusCode == 200){
                var body = "";
                response.on('data', function (data) {
                            body += data;
                        })
                        .on('end', function () {
                            callback(body);
                        });
            }
            else {
                callback(undefined);
            }
        });

        // post the data
        post_req.write(jsonData);
        post_req.end();
    }
}

// var reqData = {'SN': 'mimacx0000000326'};
// exports.httpRequest('120.27.221.91', 8080, 'minihorse_zb/StuCert/GetCarMes.do', 'POST', reqData, function (responseData) {
//     if(responseData == undefined){
//         console.error('minihorse_zb/StuCert/GetCarMes.do api error');
//     }else {
//
//         console.log(responseData);
//
//         redisUtil.getSimpleValueFromRedis(sn, function (bikeId) {
//             if(bikeId != null){
//                 bikeNumber = bikeId;
//             }
//
//             var sendSmsData = {
//                 mobilePhoneNumber: alarmPhone,
//                 template: 'bikeAlarm',
//                 bikeNumber: bikeNumber,
//                 alarmTime: process.env['illegalityMovePoliceMin'],
//                 touches: illegalTouch,
//                 illegalityMove: illegalMove
//             };
//
//             alarmPhone.sendAlarmSms(sendSmsData, );
//         })
//
//         //报警完，删掉这个key，reset
//         redisUtil.redisClient.del(alarmRedisKey, function (err, reply) {
//             if(err != null){
//                 console.error('alarmBike del in redis error, ', err.message);
//                 return;
//             }
//         });
//     }
// })