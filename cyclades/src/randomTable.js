/* Create a table of n neighbors for a given node */
var RandomLib = require('random-js');
var HashMap = require('hashmap');
var bloomFilter = require('./bloomFilter.js');
var self;

/*
 * @nbMaxPeers: nb maximal peers in the random table
 */
function Random (nbMaxPeers, hostId) {
    this._nbMaxPeers = nbMaxPeers;
    this._hostId = hostId;
    this._randomPeersSended = [];
    this._table = new HashMap();
    
    self = this;
}

function add(peer) {
    if (self._table.has(peer.id)) {
	self._table.get(peer.id).timestamp = 0;
    } else {
	self._table.set(peer.id, {'id': peer.id, 'ip': peer.ip, 'portClient': peer.portClient, 'portServer': peer.portServer, 'profile': peer.profile, 'timestamp': 0});
    }
}

Random.prototype.remove = function (peerId) {
    if (this._table.has(peerId)) {
    	this._table.remove(peerId);
    } else { 
    	//throw ('The peer does not exist in the table: ' + peerId);
	console.error('The peer does not exist in the table: ' , peerId);
    }
}

// Handle first connection 
Random.prototype.addPeer = function (peer) {
    if (peer.id != self._hostId && !self._table.has(peer.id)) {
	if (self._table.count() === self._nbMaxPeers) {
	    var oldestPeerId = self.oldestPeer().id;                                          
	    self.remove(oldestPeerId);
	}
	add(peer);
    }
}


Random.prototype.addPeers = function (peers) { // array of peers
    
    var randomPeersToDelete = peersToExclude(self._randomPeersSended, peers);

    if (self._table.count() > 0) incrementTimestamp();
    
    if (peers.length > 0) {
    	peers.forEach(function(peer) {
    	    if (peer.id != self._hostId) {
    		add(peer);
    	    }
    	});
    }

    randomPeersToDelete.forEach(function (peerId) {
	if (self._table.count() > self._nbMaxPeers) {
    	    self.remove(peerId);
	}
    });

    if (self._table.count() > self._nbMaxPeers) {
	self._table.keys().forEach(function(key) {
	    if (self._table.count() > self._nbMaxPeers) {
		var oldestPeerId = self.oldestPeer();
		self.remove(oldestPeerId);
	    }
	});
    }
    
    var peersRemoved = self._randomPeersSended.slice(0);
    self._randomPeersSended = [];
    return peersRemoved;
}

function peersToExclude(peersToDelete, peersToExclude) {
    var tmp = [];
    peersToDelete.forEach(function (peerD) {
	var found = false;
	peersToExclude.forEach(function (peerE) {
	    if (peerD.id === peerE.id) found = true; 
	});
	
	if (!found) tmp.push(peerD.id);
    });
    return tmp;
}

function incrementTimestamp() {
    self._table.forEach(function(value, key) {
	value.timestamp +=1;
    });
}

Random.prototype.RandomPeersFull = function() {
    return self._table.count() === self._nbMaxPeers;
}

Random.prototype.getPeers = function () {
    var randomAsTable = [];
    this._table.forEach(function(value, key) {
  var peer = {'id': key, 'ip': value.ip, 'portClient': value.portClient, 'portServer': value.portServer, 'profile': value.profile, 'timestamp': value.timestamp}
	randomAsTable.push(peer);
    });
    return randomAsTable;
}

Random.prototype.size = function () {
    return this._table.count();
}

Random.prototype.halfRandomPeers = function (peerId) {	
    if (!(this._table.count() < 2)) {
	var engine = RandomLib.engines.nativeMath;
	var tmp = this._table.keys().filter(excludeSendingPeer(peerId));
	var randomPeersIdToRemove = RandomLib.sample(engine, tmp, Math.round(tmp.length/2));
	self._randomPeersSended = buildListOfPeers(randomPeersIdToRemove);
	return self._randomPeersSended;
    }
    
    var halfPeers = this._table.keys().filter(excludeSendingPeer(peerId));
    self._randomPeersSended = buildListOfPeers(halfPeers);
    return self._randomPeersSended;
}

function buildListOfPeers(peersId) {
    var peers = [];
    peersId.forEach(function(id) {
	var properties = self._table.get(id);
peers.push({'id': id, 'ip': properties.ip, 'portClient': properties.portClient, 'portServer': properties.portServer, 'profile': properties.profile,'timestamp': properties.timestamp});
    });
    return peers;
}

function excludeSendingPeer(peerIdToExclude) {
    return function(peerId) {
	return !(peerId === peerIdToExclude);
    }
}

Random.prototype.oldestPeer = function () {
    if (this._table.count() > 0) {
	var oldestPeer;
	var oldestPeerTimestamp = -1;
	this._table.forEach(function(value, key) {
	    if (value.timestamp > oldestPeerTimestamp) {
		oldestPeerTimestamp = value.timestamp;
		oldestPeer = value;
	    }
	});
	
	if (typeof(oldestPeer) === 'undefined') throw 'Oldest peer id undefined';
	
	return oldestPeer;
    }
    
    return undefined;
}

Random.prototype.contain = function (peerId) {
    return this._table.has(peerId);
}

Random.prototype.setProfile = function(peerId, profile) {
    this._table.get(peerId).profile = profile;
    this._table.get(peerId).timestamp = 0;
}

module.exports = Random;