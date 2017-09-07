/**
 * Created by wujiangwei on 2017/8/31.
 */
const router = require('express').Router()
var AV = require('leanengine');

var NewEBikeLogSql = AV.Object.extend('MimaEBikeHistoryLogs');

//暂时为车辆日志网站使用的接口
router.post('/ebileLogList',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    if(req.body.pageIndex == undefined){
        req.body.pageIndex = 0;
    }
    if(req.body.pageCount == undefined){
        req.body.pageCount = 200;
    }

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
    ebikeHistoryLogQuery.limit(req.body.pageCount);

    if(req.body.lastLogTime != undefined && req.body.lastLogTime != null){
        //下一页，必须用时间才是准确的下一页
        var queryDateTime = new Date(req.body.lastLogTime).getTime();
        ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', new Date(queryDateTime));
    }else {
        //首次
        ebikeHistoryLogQuery.skip(req.body.pageCount * req.body.pageIndex);
    }

    if(req.body.selectedTime != undefined && req.body.selectedTime != null){
        //下一页，必须用时间才是准确的下一页
        var selectedDate = new Date(req.body.selectedTime);
        ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', selectedDate);
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
            res.json({'ebikeHistoryLogs' : resLogList, 'lastLogTime': ebikeHistoryLogObjects[ebikeHistoryLogObjects.length - 1].createdAt});
        }else {
            res.json({'ebikeHistoryLogs' : resLogList});
        }

    }).catch(function(err) {
        res.status(500).json({
            error: err.message
        });
    });
})

//暂时为未客服系统查询车辆状态使用的接口
router.post('/ebikeHistoryLocationBySnAndTime',function (req, res) {

    if(req.body.SN == undefined || req.body.SN.length == 0){
        return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
    }

    var ebikeHistoryLogQuery = new AV.Query('MimaEBikeHistoryLogs');
    ebikeHistoryLogQuery.equalTo('SN', req.body.SN);
    ebikeHistoryLogQuery.exists('bikeGeo');

    if(req.body.queryDate != undefined && req.body.queryDate.length > 0){
        var queryDateTime = new Date(req.body.queryDate).getTime();
        var queryDateTimeLower = new Date(queryDateTime - 10*60*1000);

        ebikeHistoryLogQuery.greaterThanOrEqualTo('createdAt', queryDateTimeLower);
        ebikeHistoryLogQuery.lessThanOrEqualTo('createdAt', new Date(queryDateTime));
    }

    ebikeHistoryLogQuery.descending('createdAt');
    ebikeHistoryLogQuery.limit(1);

    // console.log('----- ebikeHistoryLocationBySnAndTime ----- start: ' + new Date() + ':' + new Date().getMilliseconds());

    ebikeHistoryLogQuery.find().then(function(ebikeHistoryLogObjects) {

        // console.log('----- ebikeHistoryLocationBySnAndTime ----- end: ' + new Date() + ':' + new Date().getMilliseconds());

        if(ebikeHistoryLogObjects.length == 0) {
            return res.json({'errorCode': 1, 'message': 'can not find location at pointer time(10 min)'});
        }

        var bikeGeo = ebikeHistoryLogObjects[0].get('bikeGeo');
        var lat = bikeGeo.latitude;
        var lon = bikeGeo.longitude;

        var satellite = ebikeHistoryLogObjects[0].get('satellite');
        var totalMileage = ebikeHistoryLogObjects[0].get('totalMileage');
        var battery = ebikeHistoryLogObjects[0].get('battery');

        var gpstype = ebikeHistoryLogObjects[0].get('gpstype');
        var gpsRemark = '';
        switch (parseInt(gpstype)){
            case 1:
                gpsRemark = '实时定位';
                break;
            case 2:
                gpsRemark = '历史定位';
                break;
        }

        res.json({'errorCode':0, 'totalMileage':totalMileage ,'lat' : lat, 'lon' : lon, 'gpsRemark' :gpsRemark, 'satellite':satellite,
            'locationTime': new Date(historyLogObject.createdAt.getTime() + 8*60*60*1000)});
    }).catch(function(err) {
        res.status(500).json({
            error: err.message
        });
    });
})


//以下为测试代码

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

// testLink(34)

module.exports = router
