var express = require('express');
var router = express.Router();
var AV = require('leanengine');

var logSqlUtil = require('../mimaBike/logSqlUtil');

router.get('/', function(req, res, next) {
    res.render('bikeDateStatistics');
});

router.get('/:wu', function(req, res, next) {
    res.render('bikeDateStatistics');
});

// var todayDate = new Date();
//
// var selectedStartDate = todayDate.toLocaleDateString() + ' 23:59:59';
//
// var startDate = new Date(Date.parse(selectedStartDate.replace(/-/g,  "/")));
//
// var selectedEndDate = todayDate.toLocaleDateString() + ' 00:00:00';
//
// var endDate = new Date(Date.parse(selectedEndDate.replace(/-/g,  "/")));


router.post('/borrowBikeSucceed',function (req,res) {

    var todayDate = new Date(req.body.date);

    var selectedStartDate = todayDate.toLocaleDateString() + ' 23:59:59';

    var startDate = new Date(Date.parse(selectedStartDate.replace(/-/g,  "/")));

    var selectedEndDate = todayDate.toLocaleDateString() + ' 00:00:00';

    var endDate = new Date(Date.parse(selectedEndDate.replace(/-/g,  "/")));

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
    var unlockFaileCount = 0;
    var batteryUnlockFaileCount = 0;

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
    var unlockFaile = false;
    var batteryUnlockFaile = false;

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

    // 7，每天由于车辆已被他人使用开锁失败
    var bikeLogQueryG = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryG.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryG.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryG.equalTo('LogType', 99);
    bikeLogQueryG.equalTo('cmdSucceed', false);
    bikeLogQueryG.contains('bikeOperationResultDes', '车辆已被他人使用')

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

    // 11，2G开锁失败数
    var bikeLogQueryK = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryK.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryK.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryK.equalTo('LogType', 99);
    bikeLogQueryK.equalTo('cmdSucceed', false);
    bikeLogQueryK.equalTo('SourceType', 0);
    bikeLogQueryK.count().then(function (unlockFaileK) {
        unlockFaileCount = unlockFaileK;
        unlockFaile = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })


    // 12，蓝牙开锁失败
    var bikeLogQueryL = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    bikeLogQueryL.lessThanOrEqualTo('createdAt', startDate);
    bikeLogQueryL.greaterThanOrEqualTo('createdAt', endDate);
    bikeLogQueryL.equalTo('LogType', 99);
    bikeLogQueryL.equalTo('cmdSucceed', false);
    bikeLogQueryL.equalTo('SourceType', 1);
    bikeLogQueryL.count().then(function (batteryUnlockFaileC) {
        batteryUnlockFaileCount = batteryUnlockFaileC;
        batteryUnlockFaile = true;
        rtnJson();
    },function (error) {
        res.json({'errorMsg':error.message, 'errorId': error.code});
    })

    // 还车成功和失败查询
    // 还车成功
    var returningBikeSuccessCount = 0;     // 还车总成功数
    var twoGReturningBikeSuccessCount = 0;  // 2G还车成功数
    var batteryReturningBikeSuccessCount = 0;  // 蓝牙还车成功数
    // 还车失败
    var returningBikeFailureCount = 0;         // 总还车失败总数
    var twoGReturningBikeFailureCount = 0;     // 2G还车失败总数
    var batteryReturningBikeFailureCount = 0;  // 蓝牙还车失败总数
    var notOpenBatteryReBikeFailureCount = 0;  // 还车时上锁失败且未开蓝牙
    var returningBikeTimeoutCount = 0;         // 还车超时
    var outSAReBikeFailureCount = 0;       // 服务区外还车
    var GPSFailureCount = 0;                   // gps卫星数小于5


    // query结束后的锁
    var returningBikeSuccess = false;
    var twoGReturningBikeSuccess = false;
    var batteryReturningBikeSuccess = false;

    var returningBikeFailure = false;
    var twoGReturningBikeFailure = false;
    var batteryReturningBikeFailure = false;
    var notOpenBatteryReBikeFailure = false;
    var returningBikeTimeout = false;
    var outSAReBikeFailure = false;
    var GPSFailure = false;

    //1，还车成功总数
    var returningBikeLogQueryA = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryA.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryA.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryA.equalTo('LogType', 100);
    returningBikeLogQueryA.equalTo('cmdSucceed', true);

    returningBikeLogQueryA.count().then(function (returningBikeSuccessC) {
        returningBikeSuccessCount = returningBikeSuccessC;
        returningBikeSuccess = true;
        rtnJson();
    })

    // 2，2G还车成功
    var returningBikeLogQueryB = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryB.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryB.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryB.equalTo('LogType', 100);
    returningBikeLogQueryB.equalTo('cmdSucceed', true);
    returningBikeLogQueryB.equalTo('SourceType', 0);

    returningBikeLogQueryB.count().then(function (twoGReturningBikeSuccessC) {
        twoGReturningBikeSuccessCount = twoGReturningBikeSuccessC;
        twoGReturningBikeSuccess = true;
        rtnJson();
    })

    // 3，蓝牙还车成功
    var returningBikeLogQueryC = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryC.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryC.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryC.equalTo('LogType', 100);
    returningBikeLogQueryC.equalTo('cmdSucceed', true);
    returningBikeLogQueryC.equalTo('SourceType', 1);

    returningBikeLogQueryC.count().then(function (batteryReturningBikeSuccessC) {
        batteryReturningBikeSuccessCount = batteryReturningBikeSuccessC;
        batteryReturningBikeSuccess = true;
        rtnJson();
    })

    // 4，还车失败总数
    var returningBikeLogQueryD = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryD.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryD.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryD.equalTo('LogType', 100);
    returningBikeLogQueryD.equalTo('cmdSucceed', false);

    returningBikeLogQueryD.count().then(function (returningBikeFailureC) {
        returningBikeFailureCount = returningBikeFailureC;
        returningBikeFailure = true;
        rtnJson();
    })

    // 5，2G还车失败
    var returningBikeLogQueryE = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryE.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryE.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryE.equalTo('LogType', 100);
    returningBikeLogQueryE.equalTo('cmdSucceed', false);
    returningBikeLogQueryE.equalTo('SourceType', 0);

    returningBikeLogQueryE.count().then(function (twoGReturningBikeFailureC) {
        twoGReturningBikeFailureCount = twoGReturningBikeFailureC;
        twoGReturningBikeFailure = true;
        rtnJson();
    })

    // 6，蓝牙还车失败
    var returningBikeLogQueryF = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryF.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryF.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryF.equalTo('LogType', 100);
    returningBikeLogQueryF.equalTo('cmdSucceed', false);
    returningBikeLogQueryF.equalTo('SourceType', 1);

    returningBikeLogQueryF.count().then(function (batteryReturningBikeFailureC) {
        batteryReturningBikeFailureCount = batteryReturningBikeFailureC;
        batteryReturningBikeFailure = true;
        rtnJson();
    })

    // 7，还车时上锁失败且未开蓝牙
    var returningBikeLogQueryG = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryG.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryG.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryG.equalTo('LogType', 100);
    returningBikeLogQueryG.equalTo('cmdSucceed', false);
    returningBikeLogQueryG.contains('bikeOperationResultDes','还车时上锁失败且未开蓝牙')

    returningBikeLogQueryG.count().then(function (notOpenBatteryReBikeFailureC) {
        notOpenBatteryReBikeFailureCount = notOpenBatteryReBikeFailureC;
        notOpenBatteryReBikeFailure = true;
        rtnJson();
    })

    // 8，还车超时
    var returningBikeLogQueryH = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryH.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryH.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryH.equalTo('LogType', 100);
    returningBikeLogQueryH.equalTo('cmdSucceed', false);
    returningBikeLogQueryH.contains('bikeOperationResultDes','还车超时')

    returningBikeLogQueryH.count().then(function (returningBikeTimeoutC) {
        returningBikeTimeoutCount = returningBikeTimeoutC;
        returningBikeTimeout = true;
        rtnJson();
    })

    // 9，服务区外还车失败
    var returningBikeLogQueryI = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryI.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryI.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryI.equalTo('LogType', 100);
    returningBikeLogQueryI.equalTo('cmdSucceed', false);
    returningBikeLogQueryI.contains('bikeOperationResultDes','车辆在服务区外')

    returningBikeLogQueryI.count().then(function (outSAReBikeFailureC) {
        outSAReBikeFailureCount = outSAReBikeFailureC;
        outSAReBikeFailure = true;
        rtnJson();
    })

    // 10，GPS星数小于5
    var returningBikeLogQueryJ = new AV.Query(logSqlUtil.getEBikeLogSqlName(startDate));
    returningBikeLogQueryJ.lessThanOrEqualTo('createdAt', startDate);
    returningBikeLogQueryJ.greaterThanOrEqualTo('createdAt', endDate);

    returningBikeLogQueryJ.equalTo('LogType', 100);
    returningBikeLogQueryJ.equalTo('cmdSucceed', false);
    returningBikeLogQueryJ.contains('bikeOperationResultDes','GPS星数小于5')

    returningBikeLogQueryJ.count().then(function (GPSFailureC) {
        GPSFailureCount = GPSFailureC;
        GPSFailure = true;
        rtnJson();
    })

    function rtnJson() {
        if (borrowElectricBikeSucceed == true &&
            twoGBorrowSuccess == true &&
            bluetoothBorrowElectricBikeSucceed == true &&
            borrowBikeFailure == true &&
            offlineBorrowBike == true &&
            lowPowerBorrowBike == true &&
            redisCBorrowBike == true &&
            notOpenBluetoothBorrowBike == true &&
            outSABorrowBikeFailure == true &&
            existProcessOrder == true &&

            unlockFaile == true &&
            batteryUnlockFaile == true &&
            returningBikeSuccess == true &&
            twoGReturningBikeSuccess == true &&
            batteryReturningBikeSuccess == true &&
            returningBikeFailure == true &&
            twoGReturningBikeFailure == true &&
            batteryReturningBikeFailure == true &&
            notOpenBatteryReBikeFailure == true &&
            returningBikeTimeout == true &&
            outSAReBikeFailure == true &&
            GPSFailure == true

        ){

            res.json({'errorId' : 0, 'message' : '',
                'borrowElectricBikeSCount':borrowElectricBikeSucceedCount,
                'twoGBorrowSuccessCount':twoGBorrowSuccessCount,
                'bluetoothBorrowElectricBikeSucceedCount':bluetoothBorrowElectricBikeSucceedCount,
                'borrowBikeFailureCount':borrowBikeFailureCount,
                'offlineBorrowBikeCount':offlineBorrowBikeCount,
                'lowPowerBorrowBikeCount':lowPowerBorrowBikeCount,
                'redisCBorrowBikeCount':redisCBorrowBikeCount,
                'notOpenBluetoothBorrowBikeCount':notOpenBluetoothBorrowBikeCount,
                'outSABorrowBikeFailureCount':outSABorrowBikeFailureCount,
                'existProcessOrderCount':existProcessOrderCount,
                'unlockFaileCount':unlockFaileCount,
                'batteryUnlockFaileCount':batteryUnlockFaileCount,
                'otherReasons':borrowBikeFailureCount - offlineBorrowBikeCount - lowPowerBorrowBikeCount -redisCBorrowBikeCount -
                notOpenBluetoothBorrowBikeCount - outSABorrowBikeFailureCount - existProcessOrderCount,

                'returningBikeSuccessCount':returningBikeSuccessCount,
                'twoGReturningBikeSuccess':twoGReturningBikeSuccessCount,
                'batteryReturningBikeSuccess':batteryReturningBikeSuccessCount,

                'returningBikeFailure':returningBikeFailureCount,
                'twoGReturningBikeFailure':twoGReturningBikeFailureCount,
                'batteryReturningBikeFailure':batteryReturningBikeFailureCount,
                'notOpenBatteryReBikeFailure':notOpenBatteryReBikeFailureCount,
                'returningBikeTimeout':returningBikeTimeoutCount,
                'outSAReBikeFailure':outSAReBikeFailureCount,
                'GPSFailure':GPSFailureCount,
                'otherReasonsFailure':returningBikeFailureCount - notOpenBatteryReBikeFailureCount -
                returningBikeTimeoutCount - outSAReBikeFailureCount - GPSFailureCount
            })

        }
    }
})


module.exports = router;