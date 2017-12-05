var express = require('express');
var router = express.Router();
var AV = require('leanengine');

var logSqlUtil = require('../mimaBike/logSqlUtil');


router.get('/', function(req, res) {
    res.render('disconnectLogRem');
});

router.get('/:params', function(req, res, next) {
    res.render('disconnectLogRem');
});

//暂时为车辆日志网站使用的接口
router.post('/disconnectLogRemList',function (req, res) {

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

    ebikeHistoryLogQuery.equalTo('LogType',77);

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

            historyLogObject.userPhone = ebikeHistoryLogObjects[i].get('userPhone');
            historyLogObject.bikeOperationResult = ebikeHistoryLogObjects[i].get('bikeOperationResult');
            historyLogObject.bikeOperationResultDes = ebikeHistoryLogObjects[i].get('bikeOperationResultDes');

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


module.exports = router;