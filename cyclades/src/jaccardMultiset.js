var HashMap = require('hashmap');

module.exports = function(h1, h2) {
    var hall = new HashMap();
    hall.copy(h1);
    hall.copy(h2);
    var max = 0;
    var min = 0;
    hall.forEach(function(val, key) {
	var v1 = h1.get(key);
	if (typeof(v1) === 'undefined') v1 = 0;
	var v2 = h2.get(key);
	if (typeof(v2) === 'undefined') v2 = 0;
	max = max + Math.max(v1, v2);
	min = min + Math.min(v1, v2);
    });
    if (max === 0) {return 0;
		   } else {
		       return min / max;
		   }
}


