/**
 * Created by wujiangwei on 2017/6/27.
 */
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('mimacxLog');
});

router.get('/:params', function(req, res, next) {
    res.render('mimacxLog');
});

module.exports = router;