/**
 * Created by wujiangwei on 2017/6/27.
 */
var express = require('express');
var router = express.Router();
var AV = require('leanengine');


router.get('/', function(req, res, next) {
    res.render('mimaProduct');
});


module.exports = router;