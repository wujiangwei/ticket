/**
 * Created by wujiangwei on 2017/10/9.
 */

exports.getEBikeLogSqlName = function(queryDate) {
    if(queryDate == undefined){
        queryDate = new Date();
    }
    var dataIndex = queryDate.getDate() % 6;
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
        default:
            return 'MimaEBikeHistoryLogs';
    }

    return 'MimaEBikeHistoryLogs';
}