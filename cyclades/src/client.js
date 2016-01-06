/* A client*/

var ioClient = require('socket.io-client'),
HashMap = require('hashmap'),
EventEmitter = require('events').EventEmitter,
util = require('util'),
cacheToProfile = require('./cacheToProfile.js'),
PropertiesReader = require('properties-reader'),
Logger = require('ldf-client').Logger;
keyCache = require('lru-cache');


var self,
properties = PropertiesReader('/home/folz/cycladesExperiments/ldfClient/config.properties');


function Client (id, ip, portClient, portServer, tables, cache, profile) {
    this._id = id;
    this._ip = ip;
    this._portClient = portClient;
    this._portServer = portServer;
    this._tables = tables;
    this._cache = cache;
    this._profile = profile;
    this._address = 'http://' + ip + ':' + portClient;
    // List of connections to other peer (peerId, socket)
    this._listOfConnections = new HashMap();
    // Queries to neighbourhood (key, nextNeighbour)
    this._queries = new keyCache({max:1000});
    this._logger = new Logger('Client');

    self = this;
    

    self._logger.info('Start: ', this._address);

    if (properties.get('cyclade') === 'on') {                                              
        // Send neighborhood tables each n sec
	self._logger.debug('SetInterval to shuffle: ', properties.get('timeShuffleTables'));
        setInterval(function () {                                                                
            shuffleTables();                                                              
        }, properties.get('timeShuffleTables'));                                           
    }
}
//util.inherits(Client, EventEmitter);


Client.prototype.connectTo = function (serverAddress, firstConnection, idPeer) {
    var thisfunction = this;
    var socketClient = ioClient.connect(serverAddress);
    
    if (typeof(idPeer) != 'undefined') {
	if (!self._listOfConnections.has(idPeer)) {
	    self._listOfConnections.set(idPeer, socketClient);
	} 
    }

    socketClient.on('error', function (err) {
	self._logger.error('ERROR', 'ClientError: ', err);
    });
    
    socketClient.on('connect', function() {
        
    var msg = {'src': {'id': self._id, 'adr': self._address},
              'dst': serverAddress,
              'content': {'id': self._id, 'ip': self._ip, 'portClient': self._portClient,
			  'portServer': self._portServer, 'profile': JSON.stringify(self._profile.toObject())}};
        
	self._logger.debug('AskConnection to: ', serverAddress , ' msg: ', msg);
        socketClient.emit('demandNewConnection', msg);
    });
    
    socketClient.on('answerDemandeNewConnection', function(msg) {
	
	self._logger.debug('Client-AnswerNewConnection from: ' + msg.src.adr);
	
	var peer = msg.content;
	if (firstConnection) {
	    self._tables.addRandomPeer({'id': peer.id, 'ip': peer.ip, 'portClient': peer.portClient, 'portServer': peer.portServer, 'profile': JSON.parse(peer.profile),'timestamp': 0});
	}

	if (!self._listOfConnections.has(peer.id)) {
    	    self._listOfConnections.set(peer.id, socketClient);
	} 
	socketClient.peerId = peer.id;
	self._logger.debug('After connect RPS: ', self._tables.getRandomPeers());

    });
    

    socketClient.on('exchangeNeighbourhoodTablesServerToClient', function(msg) {
	
	self._tables.updateProfile(msg.src.id, JSON.parse(msg.src.profile));
        
	self._logger.info('Client-ReceivePeers from: ', msg.src.adr);
        
        receiveNeigborhoodTables(msg.content);

    });
    
    // Ne pas supprimer tout de suite
    /*socketClient.on('answerPeerInfo', function (msg) {
	/*self._cacheBloomFilter.content = cacheToBloomFilter.create(self._cache);
	self._nbElementInCache.content = self._cache.length;
//  cacheToProfile(self._cache, self._profile);
	
	self._logger.info('Answer peer info from: ', msg.src.adr);
	var peer = msg.content;
	self._tables.addRandomPeer({'id': peer.id, 'ip': peer.ip, 'portClient': peer.portClient, 'portServer': peer.portServer, 'profile': JSON.parse(peer.profile),'timestamp': 0});

//	if (!self._listOfConnections.has(peer.id) || (self._listOfConnections.get(peer.id) === 'pending')) {
	if (!self._listOfConnections.has(peer.id)) {
    	    self._listOfConnections.set(peer.id, socketClient);
	} 
	socketClient.peerId = peer.id;
    });*/

    
    // receive asked keys here -> put in cache...
    socketClient.on('answer', function(msg) {
	self._logger.info('Answer: ', msg.key);
	self._logger.debug('Fragment: ', msg.fragment);
	if (msg.fragment != 'Not found') {
//	    console.log(socketClient.peerId);
	    self._queries.set(msg.key,msg.fragment);
	}
    });
}

Client.prototype.askNeighbourhood = function (key, callback) {
    var rps = self._tables.getRandomPeers();
    var cluster = self._tables.getClusterPeers();
    var nbconn=self._listOfConnections.count();

    var common = 0;
    
    rps.forEach(function(e) {
	cluster.forEach(function(eC) {
	    if (e.id === eC.id)
		common++;
	});
    });

    var nbpeers = (rps.length + cluster.length) - common;

    if (nbconn != nbpeers || rps.length!=properties.get('nbRandomPeer') || cluster.length!=properties.get('nbClusterPeer')) {
	self._logger.alert('tables conn: ', nbconn,"/", nbpeers ," rps:" ,rps.length ,"/", properties.get('nbRandomPeer') , " cluste:" , cluster.length, "/" , properties.get('nbClusterPeer'));
    }

    for (i = 0; i < self._listOfConnections.count(); i++) {
	var id = self._listOfConnections.keys()[i];
	var socket = self._listOfConnections.get(id);
	if (typeof(socket) === 'udefined')
	    throw new Error('Client - socket undefined');

	self._logger.info('EmitQuery: to', id, ' key ', key);
	socket.emit('query',key);
    }

    setTimeout(function () {
	self._logger.debug('Callback: ', key);
        callback(self._queries.get(key));
    }, properties.get('timeoutLookupNeighbourhood'));
};

function shuffleTables() {
    self._logger.debug('In shuffle tables');
    var oldestPeer = self._tables.oldestPeer();
    self._logger.debug('OldestPeer: ', oldestPeer);
    if (oldestPeer === 'undefined')
	self._logger.alert("No oldest peer to shuffle");
    
    if (typeof(oldestPeer) != 'undefined') {

	if (!self._listOfConnections.has(oldestPeer.id)) {
	    var adr = "http://127.0.0.1:" + oldestPeer.portServer;
	    self.connectTo(adr, false, oldestPeer.id);
	}
	var socket = self._listOfConnections.get(oldestPeer.id);
        var content = sendNeigborhoodTables(oldestPeer.id);
        var msg = {'dst': oldestPeer.ip, 'src': {'id': self._id, 'adr': self._address, 'profile': JSON.stringify(self._profile.toObject())}, 'content': content};

	self._logger.debug('SendPeers to: ', oldestPeer.ip + ':' + oldestPeer.portServer);
	self._logger.debug('ClusterTable', content);
	
	socket.emit('exchangeNeighbourhoodTablesClientToServer', msg);
    }

}

function sendNeigborhoodTables(peerId) {
    return self._tables.sendNeigborhoodTables(peerId);
}

function receiveNeigborhoodTables(peers) {
    var peersToDelete = self._tables.receiveNeigborhoodTables(peers);
    if (peersToDelete.length > 0) self.removeConnections(peersToDelete);
    self.tryNewConnections(peers);
}


Client.prototype.tryNewConnections = function (peers) {
    self._logger.debug('Try new connections with: ', peers);
    var randomPeers = peers.randomPeers;
    var clusterPeers = peers.clusterPeers;
    
    if (randomPeers.length > 0) {
	randomPeers.forEach(function (p) {
	    tryNewConnection(p);
	})
    }
    
    if (clusterPeers.length > 0) {
	clusterPeers.forEach(function (p){
	    tryNewConnection(p);
	})
    }
}

Client.prototype.tryNewConnection = tryNewConnection;

function tryNewConnection (peer) {
    if (!alreadyConnectedTo(peer) && !himself(peer)) {
	var peerAdr = 'http://' + peer.ip + ':' + peer.portServer;
	self.connectTo(peerAdr, false);
    }
}

Client.prototype.removeConnections = function(peersToDelete) {
    peersToDelete.forEach(function(peer) {
	removeConnection(peer);
    });
}

Client.prototype.getListOfConnections = function() {
    return self._listOfConnections;
}

function removeConnection(peer){
//    if (self._listOfConnections.has(peer.id) && self._listOfConnections.get(peer.id) != 'pending') {
    if (self._listOfConnections.has(peer.id)) {
	var socket = self._listOfConnections.get(peer.id);
	socket.close();
	self._listOfConnections.remove(peer.id);
	var peerAdr = peer.id + ':' + peer.socketClient;
    }  
}

function alreadyConnectedTo(peer) {
//    return (self._listOfConnections.has(peer.id) && (self._listOfConnections.get(peer.id) != 'pending'));
    return (self._listOfConnections.has(peer.id));
}

function himself(peer) {
    var isHimself = (self._id === peer.id) ? true : false;
    return isHimself;
}

module.exports = Client;
