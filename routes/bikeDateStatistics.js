var express = require('express');
var router = express.Router();
var AV = require('leanengine');

var logSqlUtil = require('../mimaBike/logSqlUtil');

router.get('/', function(req, res, next) {
    res.render('bikeDateStatistics');
});

var todayDate = new Date();

//todayDate == 2017/10/09
var selectedStartDate = todayDate.toLocaleDateString() + ' 23:59:59';

var startDate = new Date(Date.parse(selectedStartDate.replace(/-/g,  "/")));

var selectedEndDate = todayDate.toLocaleDateString() + ' 00:00:00';

var endDate = new Date(Date.parse(selectedEndDate.replace(/-/g,  "/")));

router.get('/borrowBikeSucceed',function (req,res) {

    var borrowElectricBikeSucceedCount = 0;
    var twoGBorrowSuccessCount = 0;
    var bluetoothBorrowElectricBikeSucceedCount = 0;
    var borrowBikeFailureCount = 0;
    var offlineBorrowBikeCount = 0;
    var lowPowerBorrowBikeCount = 0;
    var redisCBorrowBikeCount = 0;
    var notOpenBluetoothBorrowBikeCount = 0;
    var outSABorrowBikeFailureCount = 0;
    var existProcessOrderCount = 0;

    //query结束一个钥匙
    var borrowElectricBikeSucceed = false;
    var twoGBorrowSuccess = false;
    var bluetoothBorrowElectricBikeSucceed = false;
    var borrowBikeFailure = false;
    var offlineBorrowBike = false;
    var lowPowerBorrowBike = false;
    var redisCBorrowBike = false;
    var notOpenBluetoothBorrowBike = false;
    var outSABorrowBikeFailure = false;
    var existProcessOrder = false;

    // 1，每天成功开锁总数
    var bikeLogQueryA = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryA.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryA.greaterThanOrEqualTo('createdAt', endDate);

    bikeLogQueryA.equalTo('LogType', 99);
    bikeLogQueryA.equalTo('cmdSucceed', true);

    bikeLogQueryA.count().then(function (borrowBikeSucceedCount) {
        borrowElectricBikeSucceedCount = borrowBikeSucceedCount;
        borrowElectricBikeSucceed = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 2，每天2G开锁成功数
    var bikeLogQueryB = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryB.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryB.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryB.equalTo('LogType', 99);
    bikeLogQueryB.equalTo('cmdSucceed', true);
    bikeLogQueryB.equalTo('SourceType', 0);

    bikeLogQueryB.count().then(function (twoGBorrowSuccessC) {
        twoGBorrowSuccessCount = twoGBorrowSuccessC;
        twoGBorrowSuccess = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })


    // 3，每天蓝牙开锁成功数
    var bikeLogQueryC = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));

    bikeLogQueryC.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryC.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryC.equalTo('LogType', 99);
    bikeLogQueryC.equalTo('cmdSucceed', true);
    bikeLogQueryC.equalTo('SourceType', 1);

    bikeLogQueryC.count().then(function (bluetoothBElBikeSucceedC) {
        bluetoothBorrowElectricBikeSucceedCount = bluetoothBElBikeSucceedC;
        bluetoothBorrowElectricBikeSucceed = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 4，每天开锁失败总数
    var bikeLogQueryD = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryD.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryD.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryD.equalTo('LogType', 99);
    bikeLogQueryD.equalTo('cmdSucceed', false);

    bikeLogQueryD.count().then(function (borrowBikeFailureC) {
        borrowBikeFailureCount = borrowBikeFailureC;
        borrowBikeFailure = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 5，每天由于车辆下线开锁失败
    var bikeLogQueryE = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryE.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryE.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryE.equalTo('LogType', 99);
    bikeLogQueryE.equalTo('cmdSucceed', false);
    bikeLogQueryE.contains('bikeOperationResultDes', '下线')

    bikeLogQueryE.count().then(function (offlineBorrowBikeC) {
        offlineBorrowBikeCount = offlineBorrowBikeC;
        offlineBorrowBike = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 6，每天由于电量过低开锁失败
    var bikeLogQueryF = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryF.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryF.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryF.equalTo('LogType', 99);
    bikeLogQueryF.equalTo('cmdSucceed', false);
    bikeLogQueryF.contains('bikeOperationResultDes', '当前车辆电量过低')

    bikeLogQueryF.count().then(function (lowPowerBorrowBikeC) {
        lowPowerBorrowBikeCount = lowPowerBorrowBikeC;
        lowPowerBorrowBike = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 7，每天由于Redis车辆被锁开锁失败
    var bikeLogQueryG = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryG.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryG.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryG.equalTo('LogType', 99);
    bikeLogQueryG.equalTo('cmdSucceed', false);
    bikeLogQueryG.contains('bikeOperationResultDes', 'Redis车辆被锁')

    bikeLogQueryG.count().then(function (redisCBorrowBikeC) {
        redisCBorrowBikeCount = redisCBorrowBikeC;
        redisCBorrowBike = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 8，每天由于未开蓝牙开锁失败
    var bikeLogQueryH = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryH.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryH.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryH.equalTo('LogType', 99);
    bikeLogQueryH.equalTo('cmdSucceed', false);
    bikeLogQueryH.contains('bikeOperationResultDes', '蓝牙')

    bikeLogQueryH.count().then(function (notOpenBluetoothBorrowBikeC) {
        notOpenBluetoothBorrowBikeCount = notOpenBluetoothBorrowBikeC;
        notOpenBluetoothBorrowBike = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 9，每天由于Redis车辆被锁开锁失败
    var bikeLogQueryI = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryI.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryI.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryI.equalTo('LogType', 99);
    bikeLogQueryI.equalTo('cmdSucceed', false);
    bikeLogQueryI.contains('bikeOperationResultDes', '车辆在服务区外')

    bikeLogQueryI.count().then(function (outSABorrowBikeFailureC) {
        outSABorrowBikeFailureCount = outSABorrowBikeFailureC;
        outSABorrowBikeFailure = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 10，由于存在存在处理中订单
    var bikeLogQueryJ = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryJ.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryJ.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryJ.equalTo('LogType', 99);
    bikeLogQueryJ.equalTo('cmdSucceed', false);
    bikeLogQueryJ.contains('bikeOperationResultDes', '处理中订单')

    bikeLogQueryJ.count().then(function (existProcessOrderC) {
        existProcessOrderCount = existProcessOrderC;
        existProcessOrder = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })


    function rtnJson() {
        if (borrowElectricBikeSucceed == true && twoGBorrowSuccess == true && bluetoothBorrowElectricBikeSucceed == true &&
            borrowBikeFailure == true && offlineBorrowBike == true && lowPowerBorrowBike == true &&
            redisCBorrowBike == true && notOpenBluetoothBorrowBike == true && outSABorrowBikeFailure == true &&
            existProcessOrder == true){

            res.json({'errorId' : 0, 'message' : '','borrowElectricBikeSCount':borrowElectricBikeSucceedCount,'twoGBorrowSuccessCount':twoGBorrowSuccessCount,
            'bluetoothBorrowElectricBikeSucceedCount':bluetoothBorrowElectricBikeSucceedCount,'borrowBikeFailureCount':borrowBikeFailureCount,
            'offlineBorrowBikeCount':offlineBorrowBikeCount,'lowPowerBorrowBikeCount':lowPowerBorrowBikeCount,
            'redisCBorrowBikeCount':redisCBorrowBikeCount,'notOpenBluetoothBorrowBikeCount':notOpenBluetoothBorrowBikeCount,
            'outSABorrowBikeFailureCount':outSABorrowBikeFailureCount,'existProcessOrderCount':existProcessOrderCount,
                'date':todayDate.toLocaleDateString()})

        }
    }
})

module.exports = router;