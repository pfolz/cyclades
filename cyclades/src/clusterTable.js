/* Create a table of n close neighbors for a given node */

var HashMap = require('hashmap'),
bloomFilter = require('./bloomFilter.js'),
PropertiesReader = require('properties-reader'),
Logger = require('ldf-client').Logger;

var self,
properties = PropertiesReader('/home/folz/cycladesExperiments/ldfClient/config.properties');

/**
 * @param {Integer} nbMaxPeers: maximum peers that the cluster table can contains
 * @param {Function} similarityMethod
 * @param {String} hostId: id of the current node
 * @param {Lru-cache} currentNodeCache
 * @param {Array} randomPeers: list of the randomPeers of the node
 */
//function Cluster(nbMaxPeers, similarityMethod, hostId, currentNodeCache, randomPeers) {
function Cluster(nbMaxPeers, similarityMethod, hostId, profile, randomPeers) {
    this._table = new HashMap(); // (idNode, properties)
    this._maxSimilarity = 0;
    this._minSimilarity = 1;
    this._minSimilarityNodeId = [];
    this._nbMaxPeers = nbMaxPeers;
    this._similarityMethod = similarityMethod;
    this._hostId = hostId;
    this._profile = profile
    this._randomPeers = randomPeers;
    this._logger = new Logger('ClusterTable');
    
    self = this;
}

Cluster.prototype.printClusterTable = function () {
    this._table.forEach(function(value, key) {
    	console.log("cluster table: key:",key," value:",value);
    })
}

function add(peer) {
    var profile = toHashMap(peer.profile);
    var similarity = self._similarityMethod(self._profile.toHashMap(), profile);
    
    if (peer.id != self._hostId && peer.nbElementInCache > 0 && !self._table.has(peer.id)) {
	if (self._maxSimilarity < similarity) { // I am the most similar
	    self._maxSimilarity = similarity;
	    if (self._table.count() >= self._nbMaxPeers) popPeer();
	    self._table.set(peer.id, peerProperties(peer, similarity));
	} else if (self._minSimilarity < similarity) { // I am most similar than the less similar
	    if (self._table.count() >= self._nbMaxPeers) {
		popPeer();
		if (self._minSimilarityNodeId.length === 0) {
		    self._minSimilarity = similarity;
		    self._minSimilarityNodeId.push(peer.id);
		}
	    }
	    self._table.set(peer.id, peerProperties(peer, similarity));
	} else if (self._table.count() < self._nbMaxPeers && similarity > 0 && !self._table.has(peer.id)) { // Enough place
	    self._logger.debug('AddPeer-EnoughSpace');
	    self._logger.debug('AddPeer: self._minSimilarity ', self._minSimilarity);
	    self._logger.debug('AddPeer: peer similarity ', similarity);
	    self._logger.debug('AddPeer: _minSimilarityNodeId ', self._minSimilarityNodeId);
	    
	    if (similarity < self._minSimilarity) {
		self._minSimilarity = similarity;
		self._minSimilarityNodeId = [];
		self._minSimilarityNodeId.push(peer.id);
	    } else if (similarity === self._minSimilarity) {
		self._minSimilarityNodeId.push(peer.id);
	    }			
	    self._logger.debug('AddPeer: _minSimilarityNodeId ', self._minSimilarityNodeId);
	    self._table.set(peer.id, peerProperties(peer, similarity));
	}
    } 
}

function peerProperties(peer, similarity) {
    return {'ip': peer.ip, 'portClient': peer.portClient, 'portServer': peer.portServer, 'profile': peer.profile, 'similarity': similarity,'timestamp': peer.timestamp}
}

function popPeer() {
    if (self._minSimilarityNodeId.length ===1) { // Remove the peer with the lowest similarity
	
	var peerToRemove = self._minSimilarityNodeId.shift();
	self._table.remove(peerToRemove);
	
    } else { // Remove the peer with the oldest timestamp
	
	var oldestTimestamp = 0.0;
	var oldestTimestampId;

	self._logger.debug('PopPeer: table ', self._table);
	self._logger.debug('PopPeer: minSimilarityNodeId ', self._minSimilarityNodeId);
	self._minSimilarityNodeId.forEach(function(id) {
	    var nodeTimestamp = self._table.get(id).timestamp;
	    if (parseFloat(nodeTimestamp) > parseFloat(oldestTimestamp)) {
		oldestTimestamp = nodeTimestamp;
		oldestTimestampId = id;
	    }
	});
	self._logger.debug('oldestTimestampId: ', oldestTimestampId);
	var indexOfId = self._minSimilarityNodeId.indexOf(oldestTimestampId);
	self._logger.debug('_minSimilarityNodeId - Before: ', self._minSimilarityNodeId);
	var tmp = new Array();
	self._minSimilarityNodeId.forEach(function(id) {
	    if (id != oldestTimestampId)
		tmp.push(id);
	});
	self._minSimilarityNodeId = tmp;
	self._logger.debug('PopPeer: minSimilarityNodeId ', self._minSimilarityNodeId);
	self._table.remove(oldestTimestampId);
    }

    if (self._minSimilarityNodeId.length === 0) computeMinSimilarity();
}

function computeMinSimilarity() {
    self._minSimilarity = 1;
    var peerSimilarity = self._table.values().map(function (v) {
	return v.similarity;
    });
    var minSimilarity = Math.min.apply(Math, peerSimilarity);
    self._minSimilarity = minSimilarity;
    self._table.forEach(function(value,key) {
	if (value.similarity === minSimilarity) self._minSimilarityNodeId.push(key);
    });
}


Cluster.prototype.getPeers = function() {
    var clusterAsTable = [];
    this._table.forEach(function(value, key) {
	var peer = {'id': key, 'ip': value.ip, 'portClient': value.portClient, 'portServer': value.portServer, 'profile': value.profile, 'timestamp': value.timestamp}
	clusterAsTable.push(peer);
    });
    return clusterAsTable;
}

/*
 * Get all the cluster peers excluding the peer in parameter
 * @param {String} peerId: the peer exclude from the list
 */
Cluster.prototype.getPeers = function(peerId) {
    var clusterAsTable = [];
    this._table.forEach(function(value, key) {
	var peer = {'id': key, 'ip': value.ip, 'portClient': value.portClient, 'portServer': value.portServer, 'profile': value.profile, 'timestamp': value.timestamp}
        if (peerId != peer.id) 
            clusterAsTable.push(peer);
    });
    return clusterAsTable;
}

Cluster.prototype.size = function () {
    return this._table.count();
}

Cluster.prototype.oldestPeer = function () {
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

function toHashMap(obj) {
    var h = new HashMap();
    Object.keys(obj).forEach(function(key) {
	h.set(key, obj[key]);
    });
    return h;
}

Cluster.prototype.addPeers = function (peers) {
    self._logger.debug('Peers: ', peers);
    var candidates = peers.concat(this.getPeers()).concat(this._randomPeers.getPeers());
    self._logger.debug('This peers: ', this.getPeers());
    self._logger.debug('Random peers: ', this._randomPeers.getPeers());
    // Compute similarity for each candidate
    candidates.forEach(function (c) {
	self._logger.debug('C.profile: ', c.profile);
	self._logger.debug('Typeofc.profile: ', typeof(c.profile));
	var candidateProfile = (typeof(c.profile) === 'string') ? JSON.parse(c.profile) : c.profile;
	self._logger.debug('Typeofc.profile: ', typeof(candidateProfile));
	var profile = toHashMap(candidateProfile);
	self._logger.debug('Candidate profile: ', profile);
	c.similarity = self._similarityMethod(self._profile.toHashMap(), profile);
    });
    self._logger.debug('Finish compute similarity for candidate');
    self._table.clear();
    self._minSimilarity = 1;
    self._minSimilarityNodesId = [];
    self._maxSimilarity = 0;
    if (self._table.count() > 0) incrementTimestamp();
    
    candidates.sort(function(a,b) {
	if (a.similarity > b.similarity)
	    return -1;
	if (a.similarity < b.similarity)
	    return 1;
	return 0;
    });
//    console.log('Candidates sorting: ', candidates);

    candidates.forEach(function(c) {
	if (self._table.count() < self._nbMaxPeers) {
	    self._table.set(c.id, c);
	}
    });
    
//    console.log('Table: ', self._table);
    var peerNotAdded = [];
    candidates.forEach(function(peer) {
	if(!self._table.has(peer.id)) peerNotAdded.push(peer);
    })
    
    return peerNotAdded;
}

function incrementTimestamp() {
    self._table.forEach(function(value, key) {
	value.timestamp +=1;
    });
}


Cluster.prototype.contain = function (peerId) {
    return self._table.has(peerId);
}

Cluster.prototype.remove = function (peerId) {
    self._table.remove(peerId);
}

Cluster.prototype.setProfile = function(peerId, profile) {
    self._table.get(peerId).profile = profile;
    self._table.get(peerId).timestamp = 0;
}

Cluster.prototype.contain = function (peerId) {
    return this._table.has(peerId);
}

module.exports = Cluster;



