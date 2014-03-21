var fn_parser = {

	cache: {},

	hasPrivateScope: function(fn) {
		var fn_str = fn.toString();
		var signature = fn.name + ':' + fn.length + ':' + fn_str.length;
		if(typeof this.cache[signature] !== 'undefined')
			return this.cache[signature];
		else
			return this.cache[signature] = fn_str.indexOf('this.private') > -1;
	},

	addPrivateScope: function(obj, privateScope) {

		if(typeof privateScope === 'undefined')
			privateScope = {};
		var self = this;

		Object.defineProperty(obj, 'private', {
		  enumerable: true,
		  configurable: true,
		  set: function(data) {},
		  get: function() {
		       return self.hasPrivateScope(arguments.callee.caller) ? privateScope : undefined;
		  },
		});

	}

};