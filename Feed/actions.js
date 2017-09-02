/**
 * Created by wujiangwei on 2017/9/2.
 */
const router = require('express').Router()
var AV = require('leanengine');
var MimaActionSql = AV.Object.extend('MimaAction');

router.post('/submitAction', function(req, res) {

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

    var MimaAction = new MimaActionSql();


    MimaAction.set('role', req.body.role);
    MimaAction.set('LogType', parseInt(req.body.LogType));
    MimaAction.set('Content', req.body.Content);
    MimaAction.set('Remark', req.body.Remark);
    // newEBikeLog.set('OperationTime', req.body.OperationTime);
    MimaAction.set('SourceType', parseInt(req.body.SourceType));

    MimaAction.save().then(function (savedMimaActionObject) {
        // console.log('objectId is ' + savedNewEBikeLog.id);
        return res.json({'errorCode':0});
    }, function (error) {
        console.error(req.body.SN + ' save log failed:' + error);
        return res.json({'errorCode':-1, 'errorMsg':error.message});
    });
})

module.exports = router
