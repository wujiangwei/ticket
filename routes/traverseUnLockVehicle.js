var express = require('express');
var router = express.Router();
var AV = require('leanengine');

var redisUtil = require('../redis/leanObjectRedis');

router.get('/:yunweiAccountSession', function(req, res) {
    res.render('traverseUnLockVehicle');
});


module.exports = router;