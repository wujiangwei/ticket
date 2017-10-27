/**
 * Created by wujiangwei on 2017/8/31.
 */
const router = require('express').Router()
var AV = require('leanengine');
var logSqlUtil = require('./logSqlUtil');

var redisUtil = require('../redis/leanObjectRedis');

//debug code
function sleep(milliSeconds) {
    console.log('---------- began debug');
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds){

    }
    console.log('---------- end debug');;
};
//end debug code

//暂时为车辆日志网站使用的接口
router.post('/ebileLogList',function (req, res) {
    if((req.body.SN == undefined || req.body.SN.length < 10) && (req.body.userPhone == undefined || req.body.userPhone.length != 11)){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty and Phone is empty/error'});
    }

    if(req.body.pageCount == undefined){
        req.body.pageCount = 100;
    }

    // sleep(8000);

    var ebikeHistoryLogQuery = undefined;

    var selectedDate = new Date(req.body.selectedTime);
    var selectedStartDate = new Date(req.body.selectedStartTime);
    ebikeHistoryLogQuery = new AV.Query(logSqlUtil.getEBikeLogSqlName(selectedDate));
    ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', selectedDate);
    ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', selectedStartDate);

    if(req.body.userPhone != undefined && req.body.userPhone.length == 11){
        ebikeHistoryLogQuery.equalTo('userPhone', req.body.userPhone);
    }else {
        if(req.body.SN != undefined && req.body.SN.length > 9){
            ebikeHistoryLogQuery.equalTo('SN', req.body.SN);

            if(req.body.justBikeGetReturn != undefined && req.body.justBikeGetReturn == true){
                ebikeHistoryLogQuery.contains('Remark', '车');
            }

            if(req.body.justBikeOperationLog != undefined && req.body.justBikeOperationLog == true){
                ebikeHistoryLogQuery.notEqualTo('Remark', '上报数据');
            }

            if(req.body.justBikeAlarm != undefined && req.body.justBikeAlarm == true){
                ebikeHistoryLogQuery.exists('bikeNState');
            }
        }else {
            return res.json({'errorCode':1, 'errorMsg':'SN and Phone is invalid'});
        }
    }

    ebikeHistoryLogQuery.limit(req.body.pageCount);
    ebikeHistoryLogQuery.descending('createdAt');

    // console.log('----- ebileLogList ----- start: ' + new Date() + ':' + new Date().getMilliseconds());
    ebikeHistoryLogQuery.find().then(function(ebikeHistoryLogObjects) {

        // console.log('----- ebileLogList ----- end: ' + new Date() + ':' + new Date().getMilliseconds());

        var resLogList = new Array();
        for(var i = 0; i < ebikeHistoryLogObjects.length; i++){
            var historyLogObject = Object();
            historyLogObject.SN = ebikeHistoryLogObjects[i].get('SN');
            historyLogObject.bikeID = ebikeHistoryLogObjects[i].get('bikeID');
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

//暂时为客服系统查询车辆状态使用的接口【废弃】
router.post('/ebikeHistoryLocationBySnAndTime',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    var queryDate = new Date();
    if(req.body.queryDate != undefined && req.body.queryDate.length > 0){
        queryDate = new Date(req.body.queryDate);
    }
    
    function getTimeQuery(isBefore) {
        var ebikeHistoryLogQuery = new AV.Query(logSqlUtil.getEBikeLogSqlName(queryDate));
        if(isBefore == true){
            ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', queryDate);
            ebikeHistoryLogQuery.descending('createdAt');
        }else {
            ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDate);
            ebikeHistoryLogQuery.ascending('createdAt');
        }

        ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
        ebikeHistoryLogQuery.exists('bikeGeo');

        ebikeHistoryLogQuery.limit(1);
        return ebikeHistoryLogQuery;
    }

    var ebikeHistoryLogQueryBefore = getTimeQuery(true);
    var ebikeHistoryLogQueryLater = getTimeQuery(false);

    var lockIndex = 0;
    var queryTotalLogObjects = [];
    ebikeHistoryLogQueryBefore.find().then(function(ebikeHistoryLogObjects) {
        lockIndex++;
        if(ebikeHistoryLogObjects != undefined && ebikeHistoryLogObjects.length > 0){
            queryTotalLogObjects = queryTotalLogObjects.concat(ebikeHistoryLogObjects);
        }
        dealSelectedLogDate();
    }).catch(function(err) {
        lockIndex++;
        console.error('ebikeHistoryLocationBySnAndTime error ', err.message);
        dealSelectedLogDate();
    });
    ebikeHistoryLogQueryLater.find().then(function(ebikeHistoryLogObjects) {
        lockIndex++;
        if(ebikeHistoryLogObjects != undefined && ebikeHistoryLogObjects.length > 0){
            queryTotalLogObjects = queryTotalLogObjects.concat(ebikeHistoryLogObjects);
        }
        dealSelectedLogDate();
    }).catch(function(err) {
        lockIndex++;
        console.error('ebikeHistoryLocationBySnAndTime error ', err.message);
        dealSelectedLogDate();
    });

    function dealSelectedLogDate() {

        if(lockIndex != 2){
            return;
        }

        if(queryTotalLogObjects.length == 0){
            return res.json({'errorCode': 1, 'message': 'can not find location anytime'});
        }

        if(queryTotalLogObjects.length == 1){
            return retToClinet(queryTotalLogObjects[0]);
        }else {
            //看before和after的时间哪个距离 想要的时间最近（且不是用车中报文）
            var logFObject = queryTotalLogObjects[0];
            var logSObject = queryTotalLogObjects[1];

            var targetLogObject = logFObject.createdAt > logSObject.createdAt ? logFObject : logSObject;

            return retToClinet(targetLogObject);
        }

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
                    // console.log('哦' + bikeLatest)
                    res.json({'errorCode':0, 'bikeEState' :bikeLatest,'totalMileage':totalMileage ,'lat' : lat, 'lon' : lon, 'gpsRemark' :gpsRemark, 'satellite':satellite,
                        'locationTime': new Date(retEBikeLogObject.createdAt.getTime() + 8*60*60*1000)});
                }else {
                    //exist in redis , update
                    res.json({'errorCode':0, 'bikeEState' :undefined,'totalMileage':totalMileage ,'lat' : lat, 'lon' : lon, 'gpsRemark' :gpsRemark, 'satellite':satellite,
                        'locationTime': new Date(retEBikeLogObject.createdAt.getTime() + 8*60*60*1000)});
                }
            })
        }
    }
})

// 按照车辆SN号查询车辆是否上锁
router.post('/lookVehicleIsNoElectric', function (req, res) {
    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    redisUtil.getSimpleValueFromRedis(req.body.SN + '_BikeEState', function (bikeLatest) {
        if(bikeLatest != undefined || bikeLatest != null){
            // console.log('哦' + bikeLatest)
            res.json({'errorCode':0, 'isBikeEState' :bikeLatest, 'locationTime': new Date(retEBikeLogObject.createdAt.getTime() + 8*60*60*1000)});
        }else {
            //exist in redis , update
            res.json({'errorCode':0, 'isBikeEState' :undefined, 'locationTime': new Date(retEBikeLogObject.createdAt.getTime() + 8*60*60*1000)});
        }
    })
})


//以下为测试代码

function testLink(queryDate, bachCount, queryCountEatchBatch, logList) {

    var ebikeHistoryLogQuery = new AV.Query(logSqlUtil.getEBikeLogSqlName(undefined));
    // ebikeHistoryLogQuery.equalTo('LogType', 99);
    // ebikeHistoryLogQuery.contains('bikeOperationResult', '失败');
    // ebikeHistoryLogQuery.equalTo('Remark', '鉴权');
    // ebikeHistoryLogQuery.equalTo('userPhone', '15767758151');
    ebikeHistoryLogQuery.contains('Content', 'Redis');

    // ebikeHistoryLogQuery.startsWith('bikeID', '000');

    if(queryDate == undefined){
        ebikeHistoryLogQuery.descending('createdAt');
    }else {
        ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDate);
        ebikeHistoryLogQuery.ascending('createdAt');
    }

    // var queryDate = new Date("2017-09-23 11:40:30");
    // ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', queryDate);


    ebikeHistoryLogQuery.limit(queryCountEatchBatch);
    ebikeHistoryLogQuery.find().then(function (xMinBeforeLogs) {

        console.log('数据返回个数:' + xMinBeforeLogs.length);

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

        var bikeList = [];
        for(var t = 0; t < xMinBeforeLogs.length; t++){


            var tBikeID = xMinBeforeLogs[t].get('bikeID');
            if(tBikeID != undefined){

                if(!bikeList.indexOf(tBikeID)){
                    bikeList.push(tBikeID);
                }
                console.log(xMinBeforeLogs[t].createdAt + ', bike : ' + tBikeID + ', ' + xMinBeforeLogs[t].get('bikeOperationResultDes'));
            }else {
                console.log(t + ': ' + xMinBeforeLogs[t].createdAt + ' ------- ' + xMinBeforeLogs[t].get('Content'));
            }

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

        console.log(bikeList);
    }
        , function (error) {
        // 异常处理
            console.error('testLink' + error.message);
    })
}

var queryDate = new Date("2017-10-10 02:06:32");
// testLink(queryDate, 1, 1000, []);


//应用内搜索示例
function searchLogContent(searchKey) {
    var query = new AV.SearchQuery(logSqlUtil.getEBikeLogSqlName(undefined));
    query.queryString(searchKey);
    query.find().then(function(results) {
        console.log('Found %d objects', query.hits());
        //Process results
    });
}

// searchLogContent('15767758151')

module.exports = router
