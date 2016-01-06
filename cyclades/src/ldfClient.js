var ldf = require('ldf-client');
var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var returnValue = new Array();
var self;

function LdfClient (startFragment, hostAddress) {
	EventEmitter.call(this);
	this._fragmentClient = new ldf.FragmentsClient(startFragment, hostAddress);
	self = this;
}
util.inherits(LdfClient, EventEmitter);

LdfClient.prototype.query = function (query) {
    var results = new ldf.SparqlIterator(query, { fragmentsClient: this._fragmentClient });
    results.on('data', function(data) {
    	self.emit('data', data);
    });
    
    results.on('end', function() {
    	self.emit('computeCache', query );
    });
}

LdfClient.prototype.getCache = function () {
	return this._fragmentClient.getCache();
}

LdfClient.prototype.setAskNeighborhood = function (fnc) {
	this._fragmentClient.setAskNeighborhood(fnc);
}

LdfClient.prototype.getNbCallsNeighbourhood = function () {
  return this._fragmentClient.getNbCallsNeighbourhood();
}

LdfClient.prototype.getNbTotalCalls = function () {
  return this._fragmentClient.getNbTotalCalls();
}

module.exports = LdfClient;
