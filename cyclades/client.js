var fs = require('fs'),
    mkdirp = require('mkdirp'),
    cosineSimilarity = require('./src/cosineSimilarity'),
jaccardSimilarity = require('./src/jaccardMultiset');
    Node = require('./src/node.js'),
    PropertiesReader = require('properties-reader');

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	properties = PropertiesReader('/home/folz/cycladesExperiments/ldfClient/config.properties'),
	startFragment,
	nbClients,
	idClient,
	repBase,
	nbRoundsWarmUp,
	nbRoundsReal,
        benchmark,
	portServer;

if (process.argv.length > 5) {
    startFragment = process.argv[2];
    nbClients = Number(process.argv[3]);
    idClient = Number(process.argv[4]);
    repBase = process.argv[5];
    nbRoundsWarmUp = Number(process.argv[6]);
    nbRoundsReal = process.argv[7];
    benchmark = process.argv[8];
    portServer = process.argv[9] || undefined;
    peer = process.argv[10] || undefined;
} else {
    console.error('Error: usage is client startFragment idClient repBase nbRoundsWarmUp nbRoundsReal [portServer]');
    process.exit(1);
}

// Node (ip, nbMaxRandomPeer, nbMaxClusterPeer, networkSimilarityMethod, fullPredicate, startFragment, repBaseLog, portServer, peer) 
var nbRandomPeer = properties.get('nbRandomPeer');
var nbClusterPeer = properties.get('nbClusterPeer');

console.log('ClientBench - startFragment: ', startFragment);
console.log('ClientBench - nbClients: ', nbClients);
console.log('ClientBench - idClient: ', idClient);
console.log('ClientBench - repBase: ', repBase);
console.log('ClientBench - nbRoundsWarmUp: ', nbRoundsWarmUp);
console.log('ClientBench - nbRoundsReal: ', nbRoundsReal);
console.log('ClientBench - portServer: ', portServer);
console.log('ClientBench - peer: ', peer);
console.log('ClientBench - nbRandomPeer: ', nbRandomPeer);
console.log('ClientBench - nbClusterPeer: ', nbClusterPeer);
console.log('ClientBench - benchmark: ', benchmark);


//var node = new Node('127.0.0.1', nbRandomPeer, nbClusterPeer, cosineSimilarity, true, startFragment, repBase, portServer, peer);
var node = new Node('127.0.0.1', nbRandomPeer, nbClusterPeer, jaccardSimilarity, true, startFragment, repBase, portServer, peer);

var idRound = 1, 
    idQuery = 1,
    queries = new Array();

if (benchmark === "bsbm")
    createQueriesBSBM();
else if (benchmark === "dbpedia")
    createQueriesDBpedia();
else if (benchmark === "bsbmBis")
    createQueriesBSBMBis();


for (idRound; idRound <= nbRoundsWarmUp; idRound++) {

    idQuery = 1;

	var writeStartTime = false;
	
    queries.forEach(function (query) {
        var rep = repBase + 'warmUpRounds_' + idRound + '/';
        mkdirp(rep , function (err) {
			if (err != null) console.log(err);
        });
	node.query(query, 'query_' + idQuery + '_warmUpRound_' + idRound, repBase, 'warmUpRounds_' + idRound, 1, idRound, idClient, nbClients, nbRoundsWarmUp, nbRoundsReal, queries.length, benchmark);

		idQuery++;
    });

}

idRound = 1;

for (idRound; idRound <= nbRoundsReal; idRound++) {

    idQuery = 1;

	var writeStartTime = false;
	
    queries.forEach(function (query) {
        var rep = repBase + 'rounds_' + idRound + '/';
        mkdirp(rep , function (err) {
			if (err != null) console.log(err);
        });
        
	node.query(query, 'query_' + idQuery + '_realRound_' + idRound, repBase, 'rounds_' + idRound, 0, idRound, idClient, nbClients, nbRoundsWarmUp, nbRoundsReal, queries.length, benchmark);

		idQuery++;
    });

}

function createQueriesBSBM() {
    for (idQuery; idQuery < 26; idQuery++) {
		var query = fs.readFileSync("/home/folz/queries/queries_1M/query_" + idClient + "_" + idQuery).toString();
	    		console.log('Queries:', idClient, ' ', idQuery);
		queries.push(query);
    }
}

function createQueriesBSBMBis() {
     for (idQuery; idQuery < 26; idQuery++) {
		var query = fs.readFileSync("/home/folz/queries/queries_1M/query_" + idClient + "_" + idQuery).toString();
	    //		console.log('Queries:', idClient, ' ', idQuery);
		queries.push(query);
    }
}

function createQueriesDBpedia() {
    var files = fs.readdirSync("/home/folz/queries/queries_DBpedia/");
    var idStart;
    var idStop;

    if (idClient === 1) {
	idStart = 1;
	idStop = 10;
    } else {
	console.log('idClient: ', idClient);
	idStart = ((idClient - 1) * 10) + 1;
	console.log('idStart: ', idStart);
	idStop = idStart + 9;
	console.log('idStop: ', idStop);
    }

    var idQ = 0;

    files.forEach(function(file) {
	if (file.indexOf("query_") > -1) {

	    if (idStart <= idQ && idQ <= idStop) {
		console.log("/home/folz/queries/queries_DBpedia/" + file);
		queries.push(fs.readFileSync("/home/folz/queries/queries_DBpedia/" + file).toString());
	    }
	    idQ++;
	}
    });

   /*var idEnd;
    if (idClient === 30) {
	idEnd = 7;
    } else {
	idEnd = 10;
    }
    //var id = idClient - nbClients + 1;
    for (idQuery; idQuery <= idEnd; idQuery++){
	var query = fs.readFileSync("/home/folz/queries/queries_DBpedia/query_" + idClient + "_" + idQuery).toString();
	queries.push(query);
    }*/
    //queries.push(fs.readFileSync("/home/folz/queries/queries_DBpedia/query_1_1").toString());
    //queries.push(fs.readFileSync("/home/folz/queries/queries_DBpedia/query_1_5").toString());
    //console.log(queries);
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




