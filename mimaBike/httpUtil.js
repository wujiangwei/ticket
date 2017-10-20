/**
 * Created by wujiangwei on 2017/9/13.
 */
var request = require('request');
var http = require('http');

exports.httpGetRequest = function (url, callback) {
    //http://120.27.221.91:8080/minihorse_zb/StuCert/GetCarMes.do?SN=mimacx0000000326
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                callback(eval("(" + body + ")"));
            }catch (err){
                callback(undefined);
            }
        }else {
            console.error(url, ' , request error, ', error.message);
        }
    })
}

exports.httpGetBicycleState = function(bikeId, callback){
    var aso100RequestUrl = encodeURI('http://120.27.221.91:8080/minihorse_zb/outerInterface/findBicycleStatus.do?bicycleNo=' + bikeId);

    //创建请求
    request(aso100RequestUrl,function(error, response, body){
        if (!error && response.statusCode == 200) {
            var bodyT =  JSON.parse(body);
            if (bodyT.data.bicycleState == 1 || bodyT.data.bicycleState == 2){
                callback(true);
            }
            else {
                callback(false);
            }

        }else {
            callback('网络错误');
        }
    });
};

var http=require('http');

var request=require('request');

// var a = {BicycleNo:"999999982" + " | " + "2", Message:"99999982非法位移咯"}
// node.js 向接口POST传入参数
exports.httpPost = function (bodyInfo) {
    var options = {
        // headers: {"Connection": "close"},
        url: 'http://120.27.221.91:2000/Operations/InsertLegalMove',
        method: 'POST',
        json:true,
        body: bodyInfo
    };

    function callback(error, response, data) {
        if (!error && response.statusCode == 200) {
            // console.log('----info------',data);
        }
    }

    request(options, callback);
}

// httpPost(a)

exports.httpPostRequest = function (url, port, path, reqData, callback) {
    //BUGBUG 不知道为何参数无效
    return;

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

// var reqData = {'SN': 'mimacx0000000326'};
// request('http://120.27.221.91:8080/minihorse_zb/StuCert/GetCarMes.do?SN=mimacx0000000326', function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//         console.log(body) // Show the HTML for the baidu homepage.
//     }else {
//         console.error('request error, ', error.message);
//     }
// })

// request({
//     url: 'http://120.27.221.91:8080/minihorse_zb/StuCert/GetCarMes.do',
//     method: "POST",
//     headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//         "Content-Length": jsonData.length
//     },
//     body: JSON.stringify(reqData)
// }, function(error, response, body) {
//     if (!error && response.statusCode == 200) {
//         console.log(response.body);
//     }else {
//         console.error('request error, ', error.message);
//     }
// });
