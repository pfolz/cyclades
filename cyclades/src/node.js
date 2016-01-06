/* Node in a network */
var sleep = require('sleep'),
Tables = require('./neighborhoodTables.js'),
ldfClient = require('./ldfClient'),
sleep = require('sleep'),
uuid = require('node-uuid'),
Server = require('./server.js'),
Client = require('./client.js'),
cacheToBloomFilter = require ('./cacheToBloomFilter.js'),
bloomFilter = require('./bloomFilter.js'),
freeport = require('freeport'),
fs = require('fs'),
EventEmitter = require('events').EventEmitter,
util = require('util'),
Log = require('./log.js'),
http = require('http'),
request=require('request'),
ldf = require('ldf-client'),
HashMap = require('hashmap'),
PropertiesReader = require('properties-reader');
Logger = require('ldf-client').Logger,
lruCache = require('lru-cache'),
cacheToProfile = require('./cacheToProfile.js');


var self,done = 1, months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],properties = PropertiesReader('/home/folz/cycladesExperiments/ldfClient/config.properties');

Logger.setLevel('ALERT');


/**
 * @param {String} ip: IP address of the node
 * @param {Integer} nbMaxRandomPeer: nb of peers in the Random Peer table
 * @param {Integer} nbMaxClusterPeer: nb of peers in the Cluster Peer table
 * @param {Function} networkSimilarityMethod: method used to compute the similarity between nodes
 * @param {Boolean} fullPredicate: true if we consider complete fragment, false otherwise
 * @param {String} startFragment: address of the dataset
 * [@param {String} peer: optional, a peer in the network]
 */
function Node (ip, nbMaxRandomPeer, nbMaxClusterPeer, networkSimilarityMethod, fullPredicate, startFragment, repBaseLog, portServer, peer) {
    this._id = uuid.v4();
    this._ip = ip;
    this._startFragment = startFragment;
    this._maxSizeCache = properties.get('sizeCache'); // Same as cache in FragmentClient.js
    this._peer = peer || undefined; 
    this._portClient;
    this._portServer = portServer || undefined;
    this._nbMaxRandomPeer = nbMaxRandomPeer;
    this._nbMaxClusterPeer= nbMaxClusterPeer;
    this._networkSimilarityMethod = networkSimilarityMethod;
    this._repBase = repBaseLog;
    this._waitingQueries = new HashMap(); //(RoundId, listOfQueries)
    this._waitingQueriesRR = new HashMap();
    this._warmUpQueriesExecuted = new HashMap(); //(RoundId, listOfQueries)
    this._realQueriesExecuted = new HashMap();
    
    //console.log('Node - maxSizeCache: ', this._maxSizeCache);
    
    self = this;
    generatePorts();
}

function generatePorts() {
    freeport(function(err, port) {
	if (err) throw err;
	self._portClient = port;
	if (typeof(self._portClient) != 'undefined' && self._portServer != 'undefined') {
	    self.start();
	} else {
	    console.log('PortClient not set');
	}
    });

    if (self._portServer === 'undefined') {
	freeport(function(err, port) {
	    if (err) throw err;
	    self._portServer = port;
	    if (typeof(self._portClient) != 'undefined' && typeof(self._portServer) != 'undefined') {
		self.start();
	    } else {
		console.log('PortServer not set');
	    }
	});
    }
}

Node.prototype.start = function () {
    self._address = self._ip + ':' + self._portServer;
    self._fragmentsClient = new ldf.FragmentsClient(self._startFragment, self._address);
    self._cache = self._fragmentsClient.getCache();
    /*self._cacheBloomFilter = {content: cacheToBloomFilter.create(self._cache)};
    self._nbElementInCache = {content: self._cache.length};*/
    console.log('Profile size:', properties.get('kprofile'));
    self._profile = new lruCache({max: properties.get('kprofile')});
    self._tables = new Tables(self._nbMaxRandomPeer, self._nbMaxClusterPeer, self._networkSimilarityMethod, self._id, self._cache, self._profile);
    self._nodeInNetwork;
    
    self._client = new Client(self._id, self._ip, self._portClient, self._portServer, self._tables, self._cache, self._profile);
    self._server = new Server(self._id, self._ip, self._portServer, self._portClient, self._tables, self._cache, self._profile, self._client);

    self._fragmentsClient.setClient(self._client);
    self._fragmentsClient.setProfileAndTransform(self._profile, cacheToProfile);

    self._server.start();
    
    if (typeof(self._peer) != 'undefined') {
        self._client.connectTo(self._peer, true);
    }

    setTimeout(executeQueries(), 5000);
};

Node.prototype.query = function (query, idQuery, repBase, directoryLog, warmupPhase, idRound, idClient, nbClients, nbRoundsWarmUp, nbRoundsReal, nbQueries, dataset){ // nbQueries for a queryMix
    console.log(idQuery);
    self._log = new Log(self._repBase + 'res_' + idClient, self._id);
    var res = idQuery.split('_');
    var query = {query: query, fullQueryId: idQuery, queryId: res[1], repBase: repBase, directoryLog: directoryLog, warmupPhase: warmupPhase, idRound: idRound, idClient: idClient, nbClients: nbClients, nbRoundsWarmUp: nbRoundsWarmUp, nbRoundsReal: nbRoundsReal, nbQueries: nbQueries, dataset: dataset};
    
    if (warmupPhase) {
	if (!self._waitingQueries.has(idRound)) {
	    var queries = new Array();
	    queries.push(query);
	    self._waitingQueries.set(idRound, queries);
	} else {
	    var queries = self._waitingQueries.get(idRound);
	    queries.push(query);
	}
    } else {
	if (!self._waitingQueriesRR.has(idRound)) {
	    var queries = new Array();
	    queries.push(query);
	    self._waitingQueriesRR.set(idRound, queries);
	} else {
	    var queries = self._waitingQueriesRR.get(idRound);
	    queries.push(query);
	}
    }
    
    var repLog = repBase + 'logClient_' + idClient;
    self._waitingQueries.keys().forEach(function(key) {
	var queries = self._waitingQueries.get(key);
    });
    self._waitingQueriesRR.keys().forEach(function(key) {
	var queries = self._waitingQueriesRR.get(key);
    });

}

function executeQueries() {
    
    var currentIdRound = Math.min.apply(null,self._waitingQueries.keys());
    
    var queries = self._waitingQueries.get(currentIdRound);

    if (queries.length > 0) {
	var query = queries.shift();
	executeQuery(query);
    }

}

function executeQueriesRR() {
    if (self._waitingQueriesRR.keys().length > 0) {
	var currentIdRound = Math.min.apply(null,self._waitingQueriesRR.keys());
    
	var queries = self._waitingQueriesRR.get(currentIdRound);
    
	if (queries.length > 0) {
	    var query = queries.shift();
	    executeQuery(query);
	}
    }
}

function executeQuery(queryInfos) {
    var repLog = queryInfos.repBase + 'logClient_' + queryInfos.idClient;

    if ( (queryInfos.queryId === '1') && (queryInfos.idRound === 1) && (queryInfos.warmupPhase === 1) )
	fs.appendFileSync(repLog, 'Start WarmUpPhase: ' + getCurrentDate() + '\n');
    if ( (queryInfos.queryId === '1') && (queryInfos.idRound === 1) && (queryInfos.warmupPhase === 0) ) {
	fs.appendFileSync(repLog, 'Start RealPhase: ' + getCurrentDate() + '\n');
	self._server.resetNbReceiveQueries();
	self._server.resetNbAnswerQueries();
    }
    
    fs.appendFileSync(repLog, '[' + getCurrentDate() + '] - Query: ' + queryInfos.queryId + '... start \n');
    
    var results = new ldf.SparqlIterator(queryInfos.query, { fragmentsClient: self._fragmentsClient });
    var writer = new ldf.SparqlResultWriter('application/json', results);
    
    (function (idQuery, idRound, dataset) { 
	var writtenQuery = false;
	var repResults = queryInfos.repBase + queryInfos.directoryLog + '/' + 'idClient_' + queryInfos.idClient + '_dataset_' + dataset  + '_idQuery_' + idQuery;
	writer.on('data', function (data) { 
	    if (!writtenQuery) {
		fs.appendFile(repResults, 'Query: ' + idQuery, function(err) { if(err) throw err;});
		writtenQuery = true;
	    }
	    fs.appendFile(repResults, data, function(err) { if(err) throw err;});
	});
	writer.on('error', function(error) {
	    console.trace("Node - Error in writter: ", idQuery, ' ', error);
	});
    })(queryInfos.queryId, queryInfos.idRound, queryInfos.dataset);
    
    (function (idQuery, idRound, warmupPhase, nbRoundsWarmUp, nbRoundsReal, idClient, nbClients, nbQueries) {
	fs.appendFileSync(repLog, '[' + getCurrentDate() + '] - Query: ' + idQuery + idRound + warmupPhase + nbRoundsWarmUp + nbRoundsReal + idClient + nbClients + nbQueries+ '... instanciate \n');
	results.on('end', function() {
	    
	    fs.appendFileSync(repLog, '[' + getCurrentDate() + '] - Query: ' + idQuery + '... finished \n');
	    fs.appendFileSync(repLog, 'Queries: ' + self._warmUpQueriesExecuted.get(idRound) + ' \n');
	    
	    // Add finished query to list
	    if (warmupPhase) {
		if (!self._warmUpQueriesExecuted.has(idRound)) {
		    var queries = new Array();
		    queries.push(idQuery);
		    self._warmUpQueriesExecuted.set(idRound, queries);
		} else {
		    var queries = self._warmUpQueriesExecuted.get(idRound);
		    queries.push(idQuery);
		}
	    } else {
		if (!self._realQueriesExecuted.has(idRound)) {
		    var queries = new Array();
		    queries.push(idQuery);
		    self._realQueriesExecuted.set(idRound, queries);
		} else {
		    var queries = self._realQueriesExecuted.get(idRound);
		    queries.push(idQuery);
		}
	    }
	    
	    // Check if a round is finished
	    if (warmupPhase) {
		if (self._warmUpQueriesExecuted.get(idRound).length === nbQueries) {
		    fs.appendFileSync(repLog, 'Stop Round ' + idRound + ': ' + getCurrentDate() + '\n');
		    self._waitingQueries.remove(idRound);
		    if (self._waitingQueries.keys().length > 0) 
			executeQueries();
		    else {
			fs.appendFileSync(repLog, 'Stop WarmUpPhase: ' + getCurrentDate() + '\n');
			fs.writeFileSync(queryInfos.repBase + 'wu_' + idClient, 'finished');
			self.clearData();
			// TODO Change so it won't be launch when we are in real phase
			setInterval(function() { launchRealPhase(queryInfos.repBase, nbClients, warmupPhase);}, 1000);
		    }
		} else {
		    executeQueries();
		}
		
	    } else {
		if (self._realQueriesExecuted.get(idRound).length === nbQueries) {
		    fs.appendFileSync(repLog, 'Stop Round ' + idRound + ': ' + getCurrentDate() + '\n');
		    self._waitingQueriesRR.remove(idRound);
		    		    if(self._waitingQueriesRR.keys().length > 0) {
			executeQueriesRR();
		    } else {
			fs.appendFileSync(repLog, 'Stop RealPhase: ' + getCurrentDate() + '\n');
			self.saveData(); 
			fs.writeFileSync(queryInfos.repBase + 'stop_' + idClient, 'finished');
			setInterval(function() { checkState(queryInfos.repBase, nbClients);}, 1000);
		    }
		} else {
		    executeQueriesRR();
		}
	    }
	    
	    results.on('error',function(error) {
		console.log('Error on res');
		console.log('Error on res: ', idQuery + '_' + idRound);
	    });
	    
	});
    })(queryInfos.queryId, queryInfos.idRound, queryInfos.warmupPhase, queryInfos.nbRoundsWarmUp, queryInfos.nbRoundsReal, queryInfos.idClient, queryInfos.nbClients, queryInfos.nbQueries);
    
}

function launchRealPhase(repRes, nbClients) {
	var files = fs.readdirSync(repRes);
	var nbClientFinishWarmUp = 0;
	files.forEach(function(file) {
	    if (file.indexOf("wu") >= 0) {
		nbClientFinishWarmUp++;
		if (nbClientFinishWarmUp === nbClients) {
		    launch = true;
		    executeQueriesRR();
		} 
	    }
	});
}

function checkState(repRes, nbClients) {
    var files = fs.readdirSync(repRes);
    var nbClientStop = 0;
    files.forEach(function(file) {
	if (file.indexOf("stop") >= 0) {
	    nbClientStop++;
	    if (nbClientStop === nbClients) {
		process.exit();
	    }
	}
    });
}

function getCurrentDate() {
    var today = new Date(),
    day = today.getDate(),
    month = months[today.getMonth()], // getMonth() start with 0
    year = today. getFullYear(),
    hour = today.getHours(),
    min = today.getMinutes(),
    sec = today.getSeconds(),
    ms = today.getMilliseconds(),
    fullDate = day + '/' + month + '/' + year + ':' + hour + ':' + min + ':' + sec + ':' + ms;
    return fullDate;
}

Node.prototype.clearData = function() {
    self._fragmentsClient.clearNbCallsNeighbourhood();
    self._fragmentsClient.clearNbCallsHimself();
    self._fragmentsClient.clearNbTotalCalls();
}

Node.prototype.saveData = function() {
    var nbCallsNeighbourhood = self._fragmentsClient.getNbCallsNeighbourhood();
    self._log.writeCallsInNeighbourhood(nbCallsNeighbourhood);
    
    var nbCallsHimself= self._fragmentsClient.getNbCallsHimself();
    self._log.writeCallsInHimself(nbCallsHimself);

    var nbTotalCalls = self._fragmentsClient.getNbTotalCalls();
    self._log.writeTotalCalls(nbTotalCalls);

    var randomPeers = self._tables.getRandomPeers();
    self._log.writeRandomPeers(randomPeers);

    var clusterPeers = self._tables.getClusterPeers();
    self._log.writeClusterPeers(clusterPeers);

    var nbReceiveQueries = self._server.getNbReceiveQueries();
    self._log.writeNbReceiveQueries(nbReceiveQueries);

    var nbAnswerQueries = self._server.getNbAnswerQueries();
    self._log.writeNbAnswerQueries(nbAnswerQueries);

    /*self._cache.keys().forEach(function(key) {
	var k = JSON.parse(key);
	self._log.writeCachePredicate(k.predicate);
    });*/
    self._log.saveResults();
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = Node;
