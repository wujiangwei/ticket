/**
 * Created by wujiangwei on 2017/8/31.
 */
const router = require('express').Router()
var AV = require('leanengine');

var redisUtil = require('../redis/leanObjectRedis');

var NewEBikeLogSql = AV.Object.extend('MimaEBikeHistoryLogs');

//暂时为车辆日志网站使用的接口
router.post('/ebileLogList',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    if(req.body.pageCount == undefined){
        req.body.pageCount = 60;
    }

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
    ebikeHistoryLogQuery.limit(req.body.pageCount);

    if(req.body.selectedTime != undefined && req.body.selectedTime != null){
        //下一页，必须用时间才是准确的下一页
        var selectedDate = new Date(req.body.selectedTime);
        ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', selectedDate);
    }else {
        //若未传时间，则用分页的index
        if(req.body.pageIndex == undefined){
            req.body.pageIndex = 0;
        }
        ebikeHistoryLogQuery.skip(req.body.pageCount * req.body.pageIndex);
    }

    ebikeHistoryLogQuery.descending('createdAt');

    // console.log('----- ebileLogList ----- start: ' + new Date() + ':' + new Date().getMilliseconds());
    ebikeHistoryLogQuery.find().then(function(ebikeHistoryLogObjects) {

        // console.log('----- ebileLogList ----- end: ' + new Date() + ':' + new Date().getMilliseconds());

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

        if(ebikeHistoryLogObjects.length > 0){
            var tempLastLogTime = new Date(ebikeHistoryLogObjects[ebikeHistoryLogObjects.length - 1].createdAt.getTime());
            res.json({'ebikeHistoryLogs' : resLogList, 'lastLogTime': tempLastLogTime});
        }else {
            res.json({'ebikeHistoryLogs' : resLogList});
        }

    }).catch(function(err) {
        res.status(500).json({
            error: err.message
        });
    });
})

//暂时为客服系统查询车辆状态使用的接口
router.post('/ebikeHistoryLocationBySnAndTime',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
    ebikeHistoryLogQuery.exists('bikeGeo');

    if(req.body.queryDate != undefined && req.body.queryDate.length > 0){
        var queryDateTime = new Date(req.body.queryDate).getTime();
        var queryDateTimeBigger = new Date(queryDateTime + 20*60*1000);
        var queryDateTimeLower = new Date(queryDateTime - 30*1000);

        ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDateTimeLower);
        // ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', queryDateTime);
    }

    ebikeHistoryLogQuery.ascending('createdAt');
    ebikeHistoryLogQuery.limit(1);

    // console.log('----- ebikeHistoryLocationBySnAndTime ----- start: ' + new Date() + ':' + new Date().getMilliseconds());

    ebikeHistoryLogQuery.find().then(function(ebikeHistoryLogObjects) {

        // console.log('----- ebikeHistoryLocationBySnAndTime ----- end: ' + new Date() + ':' + new Date().getMilliseconds());

        function retToClinet(retEBikeLogObject) {
            var bikeGeo = retEBikeLogObject.get('bikeGeo');
            var lat = bikeGeo.latitude;
            var lon = bikeGeo.longitude;

            var satellite = retEBikeLogObject.get('satellite');
            var totalMileage = retEBikeLogObject.get('totalMileage');
            var battery = retEBikeLogObject.get('battery');

            var gpstype = retEBikeLogObject.get('gpstype');

            var gpsRemark = '';
            switch (parseInt(gpstype)){
                case 1:
                    gpsRemark = '实时定位';
                    break;
                case 2:
                    gpsRemark = '历史定位';
                    break;
            }

            redisUtil.getSimpleValueFromRedis(req.body.SN + '_BikeEState', function (bikeLatest) {
                if(bikeLatest != undefined || bikeLatest != null){
                    console.log('哦' + bikeLatest)
                    res.json({'errorCode':0, 'bikeEState' :bikeLatest,'totalMileage':totalMileage ,'lat' : lat, 'lon' : lon, 'gpsRemark' :gpsRemark, 'satellite':satellite,
                        'locationTime': new Date(retEBikeLogObject.createdAt.getTime() + 8*60*60*1000)});
                }else {
                    //exist in redis , update
                    res.json({'errorCode':0, 'bikeEState' :undefined,'totalMileage':totalMileage ,'lat' : lat, 'lon' : lon, 'gpsRemark' :gpsRemark, 'satellite':satellite,
                        'locationTime': new Date(retEBikeLogObject.createdAt.getTime() + 8*60*60*1000)});
                }
            })
        }

        if(ebikeHistoryLogObjects.length == 0) {
            //获取一个最新位置返回
            var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
            ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
            ebikeHistoryLogQuery.exists('bikeGeo');
            ebikeHistoryLogQuery.descending('createdAt');
            ebikeHistoryLogQuery.limit(1);
            ebikeHistoryLogQuery.find().then(function(latestEbikeHistoryLogObjects) {
                if(latestEbikeHistoryLogObjects.length == 0) {
                    res.json({'errorCode': 1, 'message': 'can not find location anytime'});
                }

                retToClinet(latestEbikeHistoryLogObjects[0]);
            }, function (err) {
                res.status(500).json({
                    error: err.message
                });
            })
            return;
        }

        retToClinet(ebikeHistoryLogObjects[0]);

    }).catch(function(err) {
        res.status(500).json({
            error: err.message
        });
    });
})


//以下为测试代码

function testLink(queryDate, bachCount, queryCountEatchBatch, logList) {

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('Remark', '鉴权');
    // ebikeHistoryLogQuery.contains('Content', 'longitudeMinute');

    // ebikeHistoryLogQuery.startsWith('bikeID', '000');

    ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDate);

    var queryDate = new Date("2017-09-23 11:40:30");
    // ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', queryDate);

    ebikeHistoryLogQuery.ascending('createdAt');
    ebikeHistoryLogQuery.limit(queryCountEatchBatch);
    ebikeHistoryLogQuery.find().then(function (xMinBeforeLogs) {

        bachCount--;
        if(xMinBeforeLogs.length != 0) {
            if (bachCount > 0) {
                return testLink(xMinBeforeLogs[xMinBeforeLogs.length - 1].createdAt, bachCount, queryCountEatchBatch, logList.concat(xMinBeforeLogs));
            }
        }

        var bikeSns = [];
        xMinBeforeLogs = logList.concat(xMinBeforeLogs)
        console.log('第一个鉴权时间:' + xMinBeforeLogs[0].createdAt);
        console.log('最后一个鉴权时间:' + xMinBeforeLogs[xMinBeforeLogs.length - 1].createdAt);
        console.log('total 鉴权次数:' + xMinBeforeLogs.length);

        for(var t = 0; t < xMinBeforeLogs.length; t++){

            console.log(t + ': ' + xMinBeforeLogs[t].createdAt + ' ------- ' + xMinBeforeLogs[t].get('Content'));

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
                // console.log(xMinBeforeLogObject.get('SN'));
            }
        }

        console.log('----------------------------');
        console.log('----------------------------');
        console.log('----------------------------');
        console.log('----------------------------');


        var manyTimeSy = [];
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
            }

            if(manyTimeSy.length < bikeCount){
                for(var j = 0; j < bikeCount; j++){
                    if(manyTimeSy.length <= j){
                        manyTimeSy[j] = 0;
                    }
                }
            }
            manyTimeSy[bikeCount - 1]++;
        }

        var totalEBkke = 0;

        for(var j = 0; j < manyTimeSy.length; j++){
            console.log('车辆鉴权分布:' + (j+1) + ' 次' + '的有' + manyTimeSy[j] + '辆车');
            totalEBkke += manyTimeSy[j];
        }

        console.log('共' + totalEBkke + '辆车，重复分布为:' + xMinBeforeLogs.length);

    })
}

var queryDate = new Date("2017-09-29 23:40:56");
// testLink(queryDate, 1, 1000, []);

module.exports = router
