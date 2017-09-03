const express = require('express')
var timeout = require('connect-timeout');
const favicon = require('serve-favicon')
const path = require('path')
const bodyParser = require('body-parser')
const compression = require('compression')
const uuid = require('uuid/v4')
const AV = require('leanengine')

const app = express()
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(compression())

//增加跨域访问
require("http").createServer(function(req,res){
    res.setHeader("Access-Control-Allow-Origin","https://mimacx.leanapp.cn");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "PUT, GET, POST, DELETE, HEAD, PATCH"
    );
    res.end(req.method+" "+req.url);
}).listen(1234);

//end

// 设置默认超时时间
app.use(timeout('15s'));

// 加载云引擎中间件
app.use(AV.express())

app.enable('trust proxy')
app.use(AV.Cloud.HttpsRedirect())

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(require('./api'))

//wujiangwei define
app.use('/feeds', require('./Feed/actions'))

app.use('/bikeActionsAndLogs', require('./mimaBike/bikeActionsAndLogs'))

//need remove
app.use('/logs', require('./mimaBike/bikeHistoryLogs'))
//end wujiangwei define

const orgName = require('./api/oauth').orgName

const getIndexPage = (uuid) => {
  return `
<!doctype html public "storage">
<html>
<meta charset=utf-8/>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MimaTicket</title>
<link rel="stylesheet" href="/css/highlight.default.min.css">
<link rel="stylesheet" href="/css/leancloud-base.css">
<link rel="stylesheet" href="/css/react-datepicker.css">
<link rel="stylesheet" href="/index.css">
<link rel="stylesheet" href="${process.env.WEBPACK_DEV_SERVER || ''}/app.css">
<script src="/js/jquery.min.js"></script>
<script src="/js/bootstrap.min.js"></script>
<div id=app></div>
<script>
  LEANCLOUD_APP_ID = '${process.env.LEANCLOUD_APP_ID}'
  LEANCLOUD_APP_KEY = '${process.env.LEANCLOUD_APP_KEY}'
  LEANCLOUD_APP_ENV = '${process.env.LEANCLOUD_APP_ENV}'
  LEAN_CLI_HAVE_STAGING = '${process.env.LEAN_CLI_HAVE_STAGING}'
  SENTRY_PUB_DSN = '${process.env.SENTRY_PUB_DSN || ''}'
  UUID = '${uuid}'
  ORG_NAME = '${orgName}'
  USE_OAUTH = '${!!process.env.OAUTH_KEY}'
</script>
<script src='${process.env.WEBPACK_DEV_SERVER || ''}/bundle.js'></script>
<script>
  window.addEventListener('load', function () {
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission(function (status) {
        if (Notification.permission !== status) {
          Notification.permission = status;
        }
      });
    }
  })
</script>
`
}

app.get('*', function (req, res) {
  res.send(getIndexPage(uuid()))
})

var PORT = parseInt(process.env.LEANCLOUD_APP_PORT || process.env.PORT || 8080)
app.listen(PORT, function() {
  console.log('MimaTicket server running on:' + PORT)
})
