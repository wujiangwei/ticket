/**
 * Created by wujiangwei on 2017/6/27.
 */
var express = require('express');
var router = express.Router();
var AV = require('leanengine');

// router.post('/ebileHistorys', function(req, res) {
//     //SN LogType Content Remark OperationTime SourceType
//     var newEBikeLog = new NewEBikeLogSql();
//
//     if(req.body.SN == undefined || req.body.SN.length == 0){
//         return res.json({'errorCode':1, 'errorMsg':'SN is empty'});
//     }
//
//     newEBikeLog.set('SN', req.body.SN);
//     newEBikeLog.set('LogType', parseInt(req.body.LogType));
//     newEBikeLog.set('Content', req.body.Content);
//     newEBikeLog.set('Remark', req.body.Remark);
//     // newEBikeLog.set('OperationTime', req.body.OperationTime);
//     newEBikeLog.set('SourceType', parseInt(req.body.SourceType));
//
//     newEBikeLog.save().then(function (savedNewEBikeLog) {
//         console.log('objectId is ' + savedNewEBikeLog.id);
//         return res.json({'errorCode':0});
//     }, function (error) {
//         console.error(req.body.SN + ' save log failed:' + error);
//         return res.json({'errorCode':-1, 'errorMsg':error.message});
//     });
// })

router.get('/', function(req, res, next) {
    res.render('allBikes');
});


module.exports = router;