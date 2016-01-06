/* Create two overlay one random overlay and one cluster overlay */
var ClusterTable = require('./clusterTable.js');
var RandomTable = require('./randomTable.js');
var self;

function neighborhoodTables (nbMaxRandomPeer, nbMaxClusterPeer, networkSimilarityMethod, hostId, nodeCache, profile) {
    this._randomPeers = new RandomTable(nbMaxRandomPeer, hostId);
    this._clusterPeers = new ClusterTable(nbMaxClusterPeer, networkSimilarityMethod, hostId, profile, this._randomPeers);
    this._hostId = hostId;
    this._nbMaxRandomPeer = nbMaxRandomPeer;
    this._nbMaxClusterPeer = nbMaxClusterPeer;
    self = this;
}

neighborhoodTables.prototype.getNbMaxRandomPeer = function() {
    return self._nbMaxRandomPeer;
}

neighborhoodTables.prototype.getNbMaxClusterPeer = function() {
    return self._nbMaxClusterPeer;
}

//TODO correct spelling
/*
 * @param {String} peerId: Id of the peer to whom we send the tables
 */
neighborhoodTables.prototype.sendNeigborhoodTables = function(peerId) {
    return {'randomPeers': this._randomPeers.halfRandomPeers(peerId), 'clusterPeers': this._clusterPeers.getPeers(peerId)};
}

// TODO correct spelling
neighborhoodTables.prototype.receiveNeigborhoodTables = function (peers) {
    var deletedRandomPeers = this._randomPeers.addPeers(peers.randomPeers);
    var deletedClusterPeers = this._clusterPeers.addPeers(peers.clusterPeers);
    var deletedPeers = deletedRandomPeers.concat(deletedClusterPeers);
    return excludePeerInTable(deletedPeers);
}

/*
 * Peers which were deleted in ClusterPeers can be present in RandomPeers and vice-versa
 */
function excludePeerInTable(deletedPeers) {
    var peersToDelete = [];
    deletedPeers.forEach(function(peer) {
	if (!(self._randomPeers.contain(peer.id) || self._clusterPeers.contain(peer.id)) && peer.id != self._hostId) {
	    peersToDelete.push(peer);
	}
    });
    return peersToDelete;
}

neighborhoodTables.prototype.RandomPeersFull = function() {
    return this._randomPeers.RandomPeersFull();
}

neighborhoodTables.prototype.addRandomPeer = function(peer) {
    this._randomPeers.addPeer(peer);
}


neighborhoodTables.prototype.oldestPeer = function() {
    if (this._randomPeers.size() > 0) {
        /*if (this._clusterPeers.size() > 0) {
            return this._clusterPeers.oldestPeer();
        } else {*/
            return this._randomPeers.oldestPeer();
        //}
    }
    return undefined;
}

neighborhoodTables.prototype.removePeer = function (peerId) {
    if (this._randomPeers.contain(peerId)) {this._randomPeers.remove(peerId);}
    if (this._clusterPeers.contain(peerId)) this._clusterPeers.remove(peerId);
}

neighborhoodTables.prototype.updateProfile = function(peerId, profile) {
    if (this._randomPeers.contain(peerId)) {this._randomPeers.setProfile(peerId, profile);}
    if (this._clusterPeers.contain(peerId)) {this._clusterPeers.setProfile(peerId, profile);}
}

neighborhoodTables.prototype.getClusterTable = function() {
    return this._clusterPeers;
}

neighborhoodTables.prototype.getClusterPeers = function() {
    return this._clusterPeers.getPeers();
}

neighborhoodTables.prototype.getRandomTable = function() {
    return this._randomPeers;
}

neighborhoodTables.prototype.getRandomPeers = function() {
    return this._randomPeers.getPeers();
}

neighborhoodTables.prototype.containRandomPeer = function(peerId) {
    return this._randomPeers.contain(peerId);
}

neighborhoodTables.prototype.containClusterPeer = function(peerId) {
    return this._clusterPeers.contain(peerId);
}
module.exports = neighborhoodTables;
