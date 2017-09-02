/**
 * Created by wujiangwei on 2017/9/03.
 */
const router = require('express').Router()
var AV = require('leanengine');

var NewEBikeLogSql = AV.Object.extend('MimaEBikeHistoryLogs');
var MimaActionSql = AV.Object.extend('MimaAction');

router.post('/', function(req, res) {

    var lock = 0;
    var unlock = 2;
    {
        //Log
        var LogParam = req.body.LogParam;

        if(LogParam == undefined){
            return res.json({'errorCode':1, 'errorMsg':'LogParam is empty'});
        }

        //SN LogType Content Remark OperationTime SourceType
        var newEBikeLog = new NewEBikeLogSql();

        newEBikeLog.set('SN', LogParam.SN);
        newEBikeLog.set('LogType', parseInt(LogParam.LogType));
        newEBikeLog.set('Content', LogParam.Content);
        newEBikeLog.set('Remark', LogParam.Remark);
        // newEBikeLog.set('OperationTime', req.body.OperationTime);
        newEBikeLog.set('SourceType', parseInt(LogParam.SourceType));

        newEBikeLog.save().then(function (savedNewEBikeLog) {
            lock++;
            if(lock == unlock){
                return res.json({'errorCode':0});
            }
        }, function (error) {
            lock++;
            if(lock == unlock) {
                console.error(req.body.SN + ' save log failed:' + error);
                return res.json({'errorCode': -1, 'errorMsg': error.message});
            }
        });
    }


    {
        //Action
        //角色，角色ID，角色名
        //role : user,operator,bike,service(by me)
        //roleGuid : 这些角色在觅马数据库里的Guid
        //rolePhone : userPhone,operatorPhone,SN,servicePhone
        //roleName : userName,operatorName,bikeNumber,serviceName

        //action(录入车辆，预约，借车，锁车，开锁，还车，电池仓，上线，下线，报警):
        //  depositSucceed,depositRefundSubmit,depositRefundSucceed

        //  bindBikeToSystem

        //  （可以根据车辆报文得到success的话，一些success就不用传）
        //  appointmentFailed,appointmentSucceed
        //  tryTakeCar,takeCarSucceed,takeCarFailed
        //  tryUnlockCar,unlockCarSucceed,unlockCarFailed
        //  tryLockCar,lockCarSucceed,lockCarFailed
        //  tryReturnBike,returnBikeSucceed,returnBikeFailed,returnBikeByPic

        // tryOpenBatteryHouse,openBatteryHouseSucceed,openBatteryHouseFailed

        // takeBikeOnline,takeBikeOffline

        // changeBikeAlarm

        // 觅马用户和客服交互的行为
        // reportUseBikeOrder

        // 其他低优先级行为(觅马出行App内)
        // reportBike,feedbackBike

        //actionMethod:(Bike:2G,BlueTooth)(Other:System,Phone)

        //actionMessage:(some string)
        //  bindBikeToSystem(车辆录入到X区域成功)
        //  reportBike,feedbackBike (用户提交的文案)
        //  reportUseBikeOrder(客服的处理结果：无效，退款X元，现金退款X元)

        //actionPicUrl(for action:returnBikeByPic,reportBike,feedbackBike)

        var ActionParam = req.body.ActionParam;

        var MimaAction = new MimaActionSql();


        MimaAction.set('role', ActionParam.role);

        MimaAction.save().then(function (savedMimaActionObject) {
            lock++;
            if(lock == unlock){
                return res.json({'errorCode':0});
            }
        }, function (error) {
            lock++;
            if(lock == unlock) {
                console.error(req.body.SN + ' save log failed:' + error);
                return res.json({'errorCode': -1, 'errorMsg': error.message});
            }
        });
    }
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
