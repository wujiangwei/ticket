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
    ebikeHistoryLogQuery.descending();

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

module.exports = router
