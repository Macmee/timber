function tricks(params) {

	var self = this;

        // give this timber deep copies of its defaults
    if(typeof this.deepProperties !== 'undefined') {
	    for(var prop in this.deepProperties)
		this[prop] = JSON.parse(this.deepProperties[prop]);
	    delete this.deepProperties;
	}
   
	// give this timber private scope
	var privateScope = helperMethods.mixin({}, this.private || {});
	fn_parser.addPrivateScope(this, privateScope);

	/* EVENT MANAGEMENT */

	var propChangeCallbacks = {};
	var realData = {};

	this.trigger = function(name, value, callback) {
		var callbacks = propChangeCallbacks[name];
		if(callbacks) {
            var args = [];
            for(var i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
		    for(var i in callbacks)
				callbacks[i].apply(this, args);
        }
	};

	this.on = function(key, callback) {
		// if event is for property, cause assignment to trigger change
		if(key.substr(0, 7) === 'change:') {
			var varname = key.substr(7);
			if(typeof realData[varname] === 'undefined')
				realData[varname] = this[varname];
			Object.defineProperty(this, varname, {
			  enumerable: true,
			  configurable: true,
			  get: function() { return realData[varname] },
			  set: function(data) {
			  	realData[varname] = data;
			  	self.trigger(key, data, function(d) { realData[varname] = d });
			  	return data;
			  }
			});
		}
		// add event
		if(!propChangeCallbacks[key])
			propChangeCallbacks[key] = [ callback ];
		else
			propChangeCallbacks[key].push(callback);
	};

	// create objects if none were given
	if(!params)
		params = {};

	// do actions only relavent if tricks was inherited with the dom property enabled
	if(this.domless != true) {

        var jQuery = globalScope.jQuery || globalScope.$;
        
		// if the user gave us a selector use that one
		if(params.el) {
			// user given selector is jQuery selector
			if(params.el instanceof jQuery) {
				this.$el = params.el;
				this.el = params.el[0];
			// user given selector is not jquery
			}else if(typeof jQuery !== 'undefined') {
				this.$el = $(params.el);
				this.el = params.el;
			}
		// user gave us no selector so make one
		}else{
			if(typeof document !== 'undefined') {
				this.el = document.createElement(this.tagName ? this.tagName : 'div');
				if(typeof jQuery !== 'undefined')
					this.$el = jQuery(this.el);
			}
		}

		if(typeof this.className !== 'undefined')
			this.el.className = this.className;

		if(typeof this.id !== 'undefined')
			this.el.id = this.id;



	}

	/* handle events for the trick */

	if(typeof this.events !== 'undefined') {
		// determine method of adding the events
		var el = this.el;
		var $el = this.$el;
		// fix for webkitMatchesSelector
		if(!$el) {
			var matchesSelector = false;
			if(document.body.webkitMatchesSelector)
				var matchesSelector = 'webkitMatchesSelector';
			else if(document.body.mozMatchesSelector)
				var matchesSelector = 'mozMatchesSelector';
			else
				var matchesSelector = false;
		}
		// add eventts
		var events = this.events;
		for(var e in events) {
			// this preserves variables
			(function(){
				// grab a direct pointer to the callback we will invoke for this event
				var callback = events[e];
				if(typeof callback == 'string') {
					var callback_checking = self[callback];
					if(!callback_checking) {
						console.log('TRICKS: the event method "' + callback + '" was not found on the trick', self);
						return;
					}else{
						callback = callback_checking;
					}
				}
				// get the event name and selector from the prop we were given
				var space = e.indexOf(' ');
				if(space == -1) {
					var eventName = e;
				}else{
					var eventName = e.substr(0, space);
					var eventSelector = e.substr(space + 1);
				}
				// bind the event with jQuery if its available
				if($el) {
					$el.on(eventName, eventSelector, function(e) {
						callback.call(self, e, this);
					});
				// no jquery access, will have to do this old school
				}else{
					el.addEventListener(eventName, function(e) {
						// abort if we have no way to check matches on something
						if(!matchesSelector)
							return;
						// only allow 50 iterations incase something wacky happens
						var node = e.target;
						for(var i = 0; i < 50; i++) {
							if(!node) {
								break;
							}else if(space == -1 || node[matchesSelector](eventSelector)) {
								e.currentTarget = node; 
								callback.call(self, e, node);
								break;
							}else{
								node = node.parentNode;
								if(node === el)
									break;
							}
						}
					});
				}
			})();
		}
	}

}

/* take another object or function and steal its functions/prototypes and dump them into our prototype */

tricks.prototype.extend = function(/* arg1, arg2, ... */) {
	for(var i = 0; i < arguments.length; i++)
		helperMethods.mixin(Object.getPrototypeOf(this), arguments[i]);
}

/* PROPERTY MUTATION */

tricks.prototype.get = function(key) {
	return this[key];
}

tricks.prototype.set = function(key, value) {
	this[key] = value;
}

tricks.prototype.delay = function(time) {
	var dummy = {};
	var self = this;
	var fn = function(name) {
		return function() {
			setTimeout(function(){
				self[name].apply(self, arguments);
			}, time);
			return self;
		}
	}
	for(var prop in this)
		if(typeof this[prop] === 'function')
		dummy[prop] = fn(prop);
	return dummy;
}
