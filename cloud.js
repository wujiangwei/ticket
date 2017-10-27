/**
 * Created by wujiangwei on 2017/9/21.
 */
var AV = require('leanengine');
var httpUtil = require('./httpUtil');

var redisUtil = require('../redis/leanObjectRedis');


// 第二个函数处理裸奔车辆上锁
// function lockedVehicles() {
//     redisUtil.redisClient.lrange('unLockedList', 0, -1, function (err, unLockList) {
//
//         if (unLockList.length > 0){
//             for (var i = 0; i < unLockList.length; i++){
//                 var bicycleNo = unLockList[i];
//                 httpUtil.lockBikePost(bicycleNo);
//             }
//         }
//     })
// }

// AV.Cloud.define('lockedVehicles', function (request) {
//     redisUtil.redisClient.lrange('unLockedList', 0, -1, function (err, unLockList) {
//
//         if (unLockList.length > 0){
//             for (var i = 0; i < unLockList.length; i++){
//                 var bicycleNo = unLockList[i];
//                 httpUtil.lockBikePost(bicycleNo);
//             }
//         }
//     })
// })
//
// var paramsJson = {
//     movie: "夏洛特烦恼"
// };
//
// AV.Cloud.run('lockedVehicles', paramsJson).then(function(data) {
//     // 调用成功，得到成功的应答 data
// }, function(err) {
//     // 处理调用失败
// });