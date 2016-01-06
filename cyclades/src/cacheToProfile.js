/*
 * Create a frequence of predicates
 */
module.exports = function(cache, profile) {
    var keys = cache.keys();
    keys.forEach(function(key) {
       var k = JSON.parse(key);
       if (!profile.has(k.predicate)) {
//            profile.set(k.predicate, cache.get(key)._cache.length);
	   profile.set(k.predicate, 1);
       } else {
	   var oldValue = profile.get(k.predicate);
//           var newValue = oldValue + cache.get(key)._cache.length;
           var newValue = oldValue + 1;
	   profile.set(k.predicate, newValue);
       }
    });
}