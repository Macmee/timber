var helperMethods = {

	mixin: function(self, obj) {
		// force prototype to be mixin'd if given instead of object
		if(typeof obj == 'function' && typeof obj.prototype == 'object')
			return helperMethods.mixin(self, obj.prototype);
		for(var prop in obj)
			self[prop] = obj[prop];
		// chain game
		return this;
	},

	// take an object with props or a length and spit out an array
	parseArray: function(object) {
		var returnArray = [];
		if(object.length) {
			for(var i = 0; i < object.length; i++)
				returnArray.push(object[i]);
		}else if(!object.length && typeof object == 'object') {
			for(var prop in object)
				returnArray.push(object[prop]);
		}
		return returnArray;
	}

}

Function.prototype.bind = function(obj) {
     var fn = this;
     return function() {
          return fn.apply(obj, arguments);
     }
}