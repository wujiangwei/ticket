/**
 * Created by wujiangwei on 2016/11/25.
 */
var AV = require('leanengine');
var Promise = require('bluebird');
var _ = require('underscore');
var Q = require('q');

var redis = require('redis');
var Promise = require('bluebird');

//使用 bluebird 为 node-redis 添加 Promise 接口
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

function createClient() {
    // 本地环境下此环境变量为 undefined, node-redis 会链接到默认的 127.0.0.1:6379
    // console.log('process.env : ',  process.env);
    var redisClient = redis.createClient(process.env['REDIS_URL_MimaRedis']);

    //增加 redisClient 的 on error 事件处理，否则可能因为网络波动或 redis server 主从切换等原因造成短暂不可用导致应用进程退出。
    redisClient.on('error', function(err) {
        return console.error('redis err: %s', err);
    });

    return redisClient;
}

var redisClient = createClient();
exports.redisClient = redisClient;

/*
 *   Redis 基础接口:设置某个值 && 获取某个值
 */
//往redis中设置某个值,并且设置这个key的过期时间（秒）,key过期后,对应的值也不存在
//expiration = 0 永久有效
exports.setSimpleValueToRedis =  function(redisKey, value, expiration) {
    redisClient.set(redisKey, value, redisClient.print);//set "string key" "string val"
    if(expiration > 0){
        redisClient.expire(redisKey, expiration);
    }
};

//获取redis中之前设置的某个值
exports.getSimpleValueFromRedis =  function(redisKey, callback) {
    return redisClient.get(redisKey, function (err, reply) {
        if (err) return;
                              // 取值成功，返回指定键值对应的value,若键值不存在，返回null
        callback(reply);
    });
};


// module.exports = redisClient;
