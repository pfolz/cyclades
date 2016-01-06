var fs = require('fs');

/**
 *@param {String} fileName: full path and name of the file
 */
function Log(fileName, idNode) {
    if (!(this instanceof Log))
        return new Log(fileName);
    
    this._fileName = fileName;
    this._results = {};
    this._results['id'] = idNode;
}

Log.prototype.writeCallsInNeighbourhood = function (nbCalls) {
    this._results['callsNeighbourhood'] = nbCalls;
}

Log.prototype.writeCallsInHimself = function (nbCalls) {
    this._results['callsHimself'] = nbCalls;
}

Log.prototype.writeCachePredicate = function (predicate) {
    if (typeof (this._results['cachePredicates']) === 'undefined') {
        this._results['cachePredicates'] = [predicate];
    } else {
        this._results['cachePredicates'].push(predicate);
    }
}

Log.prototype.writeTotalCalls = function (totalCalls) {
    this._results['totalCalls'] = totalCalls;
}

Log.prototype.writeRandomPeers = function (randomPeers) {
    var peers = [];
    randomPeers.forEach(function(peer) {
	peers.push(peer.id);
    });
    this._results['randomPeers'] = peers;
}

Log.prototype.writeClusterPeers = function (clusterPeers) {
    var peers = [];
    clusterPeers.forEach(function(peer) {
	peers.push(peer.id);
    });
    this._results['clusterPeers'] = peers;
}

Log.prototype.writeNbReceiveQueries = function (nbReceiveQueries) {
    this._results['nbReceiveQueries'] = nbReceiveQueries;
}

Log.prototype.writeNbAnswerQueries = function (nbAnswerQueries) {
    this._results['nbAnswerQueries'] = nbAnswerQueries;
}

Log.prototype.saveResults = function() {
    fs.writeFileSync(this._fileName, JSON.stringify(this._results));
    //fs.closeSync();
}

module.exports = Log;
