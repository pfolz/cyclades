/* A Server*/
var io = require('socket.io'),
Client = require('./client.js'),
http = require('http'),
EventEmitter = require('events').EventEmitter,
util = require('util'),
url = require("url"),
querystring = require('querystring'),
negotiate = require('negotiate'),
_ = require('lodash'),
path = require('path'),
N3Util = require('n3').Util,
Readable = require('stream').Readable,
cacheToProfile = require('./cacheToProfile');
PropertiesReader = require('properties-reader'),
serialize = require('node-serialize'),
Logger = require('ldf-client').Logger;

var nbAnswer = 0,self;

var nbReceiveQueries = 0;
var nbAnswerQueries = 0;

function Server(id, ip, portServer, portClient, tables, cache, profile, client) {
    this._id = id;
    this._ip = ip;
    this._portServer = portServer;
    this._portClient = portClient,
    this._tables = tables;
    this._cache = cache;
    this._profile = profile;
    this._address = 'http://' + ip + ':' + portServer;
    this._client = client;
    this._sockets;
    this._prefixes;
    this._datasources;
    this._properties = PropertiesReader('/home/folz/cycladesExperiments/ldfClient/config.properties');
    this._logger = new Logger('Server');

    self = this;

    self._logger.info('Start: ', this._address);

}
util.inherits(Server, EventEmitter);

Server.prototype.start = function (socketServer) {


    var server = http.createServer();

    io = io.listen(server);

    this._sockets = io.sockets;

    io.sockets.on('connection', function (socket) {
	socket.on('error', function (err) {
	    self._logger.error('Socket: ', err);
	    console.trace(err);
	});
	
        // First exchange
        socket.on('demandNewConnection', function (msg) {
	    
            // Add the new connected peer
	    self._logger.info('DemandNewConnection: ', msg.src.adr);

            var peer = msg.content;

            socket.idPeer = peer.id;
            socket.address = msg.src.adr;

            var repInfo = {
                'src': {'id': self._id, 'adr': self._address},
                'dst': msg.src,
                'content': {
                    'id': self._id,
                    'ip': self._ip,
                    'portServer': self._portServer,
                    'portClient': self._portClient,
                    'profile': JSON.stringify(self._profile.toObject())
                }
            };
	    self._logger.debug('Answerbuild');
            socket.emit('answerDemandeNewConnection', repInfo);
	    
	    // Construct the network at the beginnning
	    if (!self._tables.RandomPeersFull()) {
		var newPeer = {
                    'id': peer.id,
                    'ip': peer.ip,
                    'portClient': peer.portClient,
                    'portServer': peer.portServer,
                    'profile': peer.profile,
                    'timestamp': 0
		};
		self._tables.addRandomPeer(newPeer);
	    }
        });


        socket.on('exchangeNeighbourhoodTablesClientToServer', function (msg) {
	    self._logger.info('ReceivePeers: ', msg.src.adr);
          
            self._tables.updateProfile(msg.src.id, JSON.parse(msg.src.profile));

	    var content = sendNeigborhoodTables(socket.idPeer);
	    var msg = {'dst': socket.address, 'src': {'id': self._id, 'adr': self._address, 'profile': JSON.stringify(self._profile.toObject())}, 'content': content};

            socket.emit('exchangeNeighbourhoodTablesServerToClient', msg);

            receiveNeigborhoodTables(msg.content);
	    
        });

        socket.on('query', function (key) {
	    nbReceiveQueries++;                                                                                                                                                                                                 
	    self._logger.info('Query: ', key);
            var answer;
            if (self._cache.has(key)) {
		// answer = JSON.stringify(self._cache.get(key)._cache);
	    nbAnswerQueries++;
		answer = 'found';
	    } else {
		answer = 'Not found';
	    }
	    // Be carefull to serialize only serializable things
	    // otherwise -> socket error
            var msgRep = {key: key, fragment: answer};
            socket.emit('answer', msgRep);
        });

        /*socket.on('cacheBloomFilter', function (msg) {
            var content = msg.content;
            self._tables.updateCacheBloomFilter(content.peerId, bloomFilter.deserialize(content.cacheBloomFilter), content.nbElementInCache);
        });*/

	
	// Ne pas supprimer tout de suite
        /*socket.on('askPeerInfo', function (msg) {
	    
	    /*self._cacheBloomFilter.content = cacheToBloomFilter.create(self._cache);
	    self._nbElementInCache.content = self._cache.length;
//      cacheToProfile(self._cache, self._profile);

            var repInfo = {
                'src': {'id': self._id, 'adr': self._address},
                'dst': msg.src,
                'content': {
                    'id': self._id,
                    'ip': self._ip,
                    'portServer': self._portServer,
                    'portClient': self._portClient,
                    /*'cacheBloomFilter': self._cacheBloomFilter.content.serialize(),
                    'nbElementInCache': self._nbElementInCache.content
                    'profile': JSON.stringify(self._profile.toObject())
                }
            };

            socket.emit('answerPeerInfo', repInfo);
        });*/

        socket.on('disconnection', function (msg) {
	    self._logger.info('Disconnection: ', msg);
            removeConnectedPeer(socket.idPeer);
        });

        socket.on('disconnect', function (msg) {
	    self._logger.info('Disconnect: ', msg);
	    if (self._tables.containRandomPeer(socket.idPeer))
		self._tables.removePeer(socket.idPeer);
        });
    });

    server.listen(this._portServer);
};

Server.prototype.getNbReceiveQueries = function() {
    return nbReceiveQueries;
}

Server.prototype.resetNbReceiveQueries = function() {
    console.log('reset receive queries');
    nbReceiveQueries = 0;
}

Server.prototype.getNbAnswerQueries = function() {
    return nbAnswerQueries;
}

Server.prototype.resetNbAnswerQueries = function() {
    console.log('reset nb answer queries');
    nbAnswerQueries = 0;
}

function sendNeigborhoodTables(peerId) {
    return self._tables.sendNeigborhoodTables(peerId);
}

function receiveNeigborhoodTables(peers) {
    var peersToDelete = self._tables.receiveNeigborhoodTables(peers);
    self._client.tryNewConnections(peers);
}


function himself(peer) {
    var isHimself = (self._id === peer.id) ? true : false;
    return isHimself;
}


module.exports = Server;
