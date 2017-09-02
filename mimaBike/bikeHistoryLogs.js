/**
 * Created by wujiangwei on 2017/8/31.
 */
const router = require('express').Router()
var AV = require('leanengine');
var NewEBikeLogSql = AV.Object.extend('MimaEBikeHistoryLogs');

router.get('/ebileHistorys', function(req, res) {
    res.json({'errorCode':0, 'errorMsg':'no error'})
});

router.post('/ebileHistorys', function(req, res) {
    //SN LogType Content Remark OperationTime SourceType
    var newEBikeLog = new NewEBikeLogSql();

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    newEBikeLog.set('SN', req.body.SN);
    newEBikeLog.set('LogType', parseInt(req.body.LogType));
    newEBikeLog.set('Content', req.body.Content);
    newEBikeLog.set('Remark', req.body.Remark);
    // newEBikeLog.set('OperationTime', req.body.OperationTime);
    newEBikeLog.set('SourceType', parseInt(req.body.SourceType));

    newEBikeLog.save().then(function (savedNewEBikeLog) {
        // console.log('objectId is ' + savedNewEBikeLog.id);
        return res.json({'errorCode':0});
    }, function (error) {
        console.error(req.body.SN + ' save log failed:' + error);
        return res.json({'errorCode':-1, 'errorMsg':error.message});
    });
})


router.post('/ebileLogList',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    if(req.body.pageIndex == undefined){
        req.body.pageIndex = 0;
    }
    if(req.body.pageCount == undefined){
        req.body.pageCount = 500;
    }

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
    ebikeHistoryLogQuery.limit(req.body.pageCount);
    ebikeHistoryLogQuery.skip(req.body.pageCount * req.params.pageIndex);
    ebikeHistoryLogQuery.descending('createdAt');

    ebikeHistoryLogQuery.find().then(function(ebikeHistoryLogObjects) {
        var resLogList = new Array();
        for(var i = 0; i < ebikeHistoryLogObjects.length; i++){
            var historyLogObject = Object();
            historyLogObject.SN = ebikeHistoryLogObjects[i].get('SN');
            historyLogObject.Content = ebikeHistoryLogObjects[i].get('Content');
            historyLogObject.LogType = ebikeHistoryLogObjects[i].get('LogType');
            historyLogObject.Remark = ebikeHistoryLogObjects[i].get('Remark');
            historyLogObject.SourceType = ebikeHistoryLogObjects[i].get('SourceType');
            historyLogObject.OperationTime = new Date(ebikeHistoryLogObjects[i].createdAt.getTime() + 8*60*60*1000);

            resLogList.push(historyLogObject);
        }

        res.json({'ebikeHistoryLogs' : resLogList});
    }).catch(function(err) {
        res.status(500).json({
            error: err.message
        });
    });
})


router.post('/ebikeHistoryLocationBySnAndTime',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
    ebikeHistoryLogQuery.contains('Content', 'latitudeMinute');

    // if(req.body.queryDate != undefined || req.body.queryDate.length > 0){
    //     var queryDateTime = new Date(req.body.queryDate).getTime();
    //     var queryDateTimeLower = new Date(queryDateTime - 5*60*1000);
    //
    //     ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDateTimeLower);
    //     ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', new Date(queryDateTime));
    // }

    ebikeHistoryLogQuery.descending('createdAt');
    ebikeHistoryLogQuery.limit(1);

    ebikeHistoryLogQuery.find().then(function(ebikeHistoryLogObjects) {

        if(ebikeHistoryLogObjects.length == 0){
            return res.json({'errorCode':1, 'message' : 'can not find location at pointer time'});
        }

        var middleIndex = parseInt(ebikeHistoryLogObjects.length / 2);
        var historyLogObject = ebikeHistoryLogObjects[middleIndex];
        var Content = historyLogObject.get('Content');

        function getValueFromStr(valueKey) {
            //"longitudeDegree":111,  "longitudeDegree":"111",
            var valueIndex = Content.indexOf(valueKey);
            var valueIndexEnd = Content.indexOf(",", valueIndex);
            var longValueStr = Content.substr(valueIndex, valueIndexEnd - valueIndex);
            var longValueArray = longValueStr.split(':');
            if(longValueArray[1].indexOf("\"") != -1){
                return longValueArray[1].substr(1, longValueArray[1].length - 2);
            }
            return longValueArray[1];
        }

        var latitudeMinute = getValueFromStr('latitudeMinute');
        var latitudeDegree = getValueFromStr('latitudeDegree');
        var longitudeMinute = getValueFromStr('longitudeMinute');
        var longitudeDegree = getValueFromStr('longitudeDegree');

        var lat = Number(latitudeMinute) / 60.0 + Number(latitudeDegree);
        var lon = Number(longitudeMinute) / 60.0 + Number(longitudeDegree);

        res.json({'errorCode':0, 'lat' : lat, 'lon' : lon, 'locationTime': new Date(historyLogObject.createdAt.getTime() + 8*60*60*1000)});
    }).catch(function(err) {
        res.status(500).json({
            error: err.message
        });
    });
})


function testLink(XMinBefore) {

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('Remark', '鉴权');

    var currentDateTime = (new Date()).getTime();
    var queryDate = new Date(currentDateTime - XMinBefore*60*1000);

    // queryDate = new Date("2017/09/1 05:53:45");
    queryDate = new Date("2017/09/1 05:59:00");

    ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDate);
    var bikeSns = new Array();
    ebikeHistoryLogQuery.limit(500);
    ebikeHistoryLogQuery.find().then(function (xMinBeforeLogs) {

        console.log('第一个鉴权时间:' + xMinBeforeLogs[0].createdAt);
        console.log('最后一个鉴权时间:' + xMinBeforeLogs[xMinBeforeLogs.length - 1].createdAt);
        console.log('total 鉴权次数:' + xMinBeforeLogs.length);

        for(var t = 0; t < xMinBeforeLogs.length; t++){
            var xMinBeforeLogObject = xMinBeforeLogs[t];
            var isExist = false;
            for(var i = 0 ; i < bikeSns.length; i++){
                if(bikeSns[i] == xMinBeforeLogObject.get('SN')){
                    isExist = true;
                    break;
                }
            }
            if(isExist == false){
                bikeSns.push(xMinBeforeLogObject.get('SN'));
                console.log(xMinBeforeLogObject.get('SN'));
            }
        }

        console.log('----------------------------');
        console.log('----------------------------');
        console.log('----------------------------');
        console.log('----------------------------');


        var manyTimeSy = [0, 0 , 0 , 0 ];
        for(var i = 0; i < bikeSns.length; i++){
            var bikeCount = 0;
            for(var t = 0; t < xMinBeforeLogs.length; t++){
                var xMinBeforeLogObject = xMinBeforeLogs[t];
                if(bikeSns[i] == xMinBeforeLogObject.get('SN')){
                    bikeCount++;
                }
            }

            if(bikeCount > 1){
                console.log(bikeSns[i] + ' : ' + bikeCount + '次')
            }else {
                manyTimeSy[0]++;
            }

            if(bikeCount == 2){
                manyTimeSy[1]++;
            }
            if(bikeCount == 3){
                manyTimeSy[2]++;
            }
            if(bikeCount == 4){
                manyTimeSy[3]++;
            }
            if(bikeCount == 5){
                manyTimeSy[4]++;
            }
            if(bikeCount == 6){
                manyTimeSy[5]++;
            }
        }

        var totalEBkke = 0;

        for(var j = 0; j < manyTimeSy.length; j++){
            console.log('车辆鉴权分布:' + (j+1) + ' 次' + '的有' + manyTimeSy[j] + '辆车');
            totalEBkke += manyTimeSy[j];
        }

        console.log('共' + totalEBkke + '辆车，重复分布为:' + xMinBeforeLogs.length);

    })



}

function querySomeLogs(searchKey) {
    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.contains('Content', searchKey);

    var currentDateTime = (new Date()).getTime();
    var queryDate = new Date(currentDateTime - 8*60*1000);

    // queryDate = new Date("2017/09/1 05:53:45");
    queryDate = new Date("2017/09/2 05:00:00");
    var queryDateLess = new Date("2017/09/1 06:00:00");

    ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDateLess);
    ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', queryDate);

    ebikeHistoryLogQuery.descending('createdAt');
    ebikeHistoryLogQuery.limit(1000);

    var bikeSns = new Array();

    ebikeHistoryLogQuery.find().then(function(xMinBeforeLogs) {

        console.log('第一个鉴权时间:' + xMinBeforeLogs[0].createdAt);
        console.log('最后一个鉴权时间:' + xMinBeforeLogs[xMinBeforeLogs.length - 1].createdAt);
        console.log('total 鉴权次数:' + xMinBeforeLogs.length);

        for(var t = 0; t < xMinBeforeLogs.length; t++){
            var xMinBeforeLogObject = xMinBeforeLogs[t];
            var isExist = false;
            for(var i = 0 ; i < bikeSns.length; i++){
                if(bikeSns[i] == xMinBeforeLogObject.get('SN')){
                    isExist = true;
                    break;
                }
            }
            if(isExist == false){
                bikeSns.push(xMinBeforeLogObject.get('SN'));
                console.log(xMinBeforeLogObject.get('SN'));
            }
        }

        console.log('----------------------------');
        console.log('----------------------------');
        console.log('----------------------------');
        console.log('----------------------------');


        var manyTimeSy = [0, 0 , 0 , 0 ];
        for(var i = 0; i < bikeSns.length; i++){
            var bikeCount = 0;
            for(var t = 0; t < xMinBeforeLogs.length; t++){
                var xMinBeforeLogObject = xMinBeforeLogs[t];
                if(bikeSns[i] == xMinBeforeLogObject.get('SN')){
                    bikeCount++;
                }
            }

            if(bikeCount > 1){
                console.log(bikeSns[i] + ' : ' + bikeCount + '次')
            }else {
                manyTimeSy[0]++;
            }

            if(bikeCount == 2){
                manyTimeSy[1]++;
            }
            if(bikeCount == 3){
                manyTimeSy[2]++;
            }
            if(bikeCount == 4){
                manyTimeSy[3]++;
            }
            if(bikeCount == 5){
                manyTimeSy[4]++;
            }
            if(bikeCount == 6){
                manyTimeSy[5]++;
            }
        }

        var totalEBkke = 0;

        for(var j = 0; j < manyTimeSy.length; j++){
            console.log('车辆历史报文分布:' + (j+1) + ' 次' + '的有' + manyTimeSy[j] + '辆车');
            totalEBkke += manyTimeSy[j];
        }

        console.log('共' + totalEBkke + '辆车，重复分布为:' + xMinBeforeLogs.length);

    });
}

// testLink(34)
// querySomeLogs('"messageType":8');

module.exports = router
