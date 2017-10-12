/**
 * Created by wujiangwei on 2017/10/9.
 */

exports.getEBikeLogSqlName = function(queryDate) {
    if(queryDate == undefined){
        queryDate = new Date();
    }
    var dayDate = parseInt(queryDate.getDate());
    var monthDate = parseInt(queryDate.getMonth());

    //老日志
    if(dayDate < 9 && monthDate == 9){
        return 'MimaEBikeHistoryLogs';
    }

    var dataIndex = dayDate % 6;
    switch (dataIndex){
        case 0:
            return 'MimaEBikeLogsPartA';
        case 1:
            return 'MimaEBikeLogsPartB';
        case 2:
            return 'MimaEBikeLogsPartC';
        case 3:
            return 'MimaEBikeLogsPartD';
        case 4:
            return 'MimaEBikeLogsPartE';
        // case 5:
        //     return 'MimaEBikeLogsPartF';
        default:
            return 'MimaEBikeHistoryLogs';
    }

    return 'MimaEBikeHistoryLogs';
}