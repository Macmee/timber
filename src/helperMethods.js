var helperMethods = {

	/* combine attributes of obj into self */

	mixin: function(self, obj) {
		// force prototype to be mixin'd if given instead of object
		if(typeof obj == 'function' && typeof obj.prototype == 'object')
			return helperMethods.mixin(self, obj.prototype);
		for(var prop in obj)
			self[prop] = obj[prop];
		// chain game
		return self;
	},

	/* combine attributes of obj into self
	 * but do not overwrite already existing
	 * attributes.
	 */

	mixin_passive: function(self, obj) {
		// force prototype to be mixin'd if given instead of object
		if(typeof obj == 'function' && typeof obj.prototype == 'object')
			return helperMethods.mixin_passive(self, obj.prototype);
		for(var prop in obj)
			if(typeof self[prop] === 'undefined')
				self[prop] = obj[prop];
		// chain game
		return self;
	},

	/* determines if given string ends with
	 * later string
	 */

	endsWith: function(haystack, needle) {
		return haystack.substr(haystack.length - needle.length) === needle;
	}

}

Function.prototype.bind = function(obj) {
     var fn = this;
     return function() {
          return fn.apply(obj, arguments);
     }
}