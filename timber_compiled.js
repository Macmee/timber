(function(globalScope) {

	/* includes useful methods like mixin */
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

	/* classExtender takes a child function and a parent function, 
	 * and makes the child extend the parent, along with this.super
	 * support
	 */
	var generateSuper = function() {

	// this object will be populated with methods of the superclass bound to the child this scope
	var simulatedSuperInstance = {};

	// pointer to super
	var atInvokeSuper = this._super;

	// bind methods of the super to this object
	for(var prop in atInvokeSuper)
		if(typeof atInvokeSuper[prop] == 'function' && prop != 'constructor')
			simulatedSuperInstance[prop] = bind_for_super_propagation(atInvokeSuper[prop], this, atInvokeSuper._super);
	// manually pull the constructor from the superclass, it seems that for the top of inheritence doesnt get listed when looping props
	simulatedSuperInstance['constructor'] = bind_for_super_propagation(atInvokeSuper['constructor'], this, atInvokeSuper._super);

	// return the simulated super
	return simulatedSuperInstance;

}

// works the same as regular js bind, except it propagates the _super attribute once

var bind_for_super_propagation = function(fn, scope, tempParentProto) {
	return function() {
		'.super'; // we need further children to proxy this method too
		scope = scope ? scope : this;
		var atInvokeSuper = scope._super;
		scope._super = tempParentProto;
		var ret = fn.apply(scope, arguments);
		scope._super = atInvokeSuper;
		return ret;
	}
}

// allow inheritence

var classExtender = function(newClass, parent) {

	 // inherit from prototype
     newClass.prototype = Object.create(parent.prototype);

     // the child's prototype must know where its superclass protoype is so that the super method knows where to look for methods
     newClass.prototype._super = parent.prototype;

     // the child prototype needs the super method to access methods of the super class
     Object.defineProperty(newClass.prototype, 'super', {
		enumerable: false,
		configurable: true,
		set: function(data) {},
		get: generateSuper,
	 });

     // when the subclass inherits a method from the superclass where the method uses the super method, super in this case must point to the superclass's superclass, we fix this by defining these methods directly on the subclass to essensially proxy call super so that the value of ._super propagates correctly
     var needsProxy = /\.super/;
     for(var prop in parent.prototype)
     	if( typeof parent.prototype[prop] == 'function' && needsProxy.test(parent.prototype[prop].toString()) )
     		newClass.prototype[prop] = bind_for_super_propagation(parent.prototype[prop], undefined, parent.prototype._super);

     // fix wrong constructor
     newClass.prototype.constructor = newClass;
     
}

	/* When psased a function, it performs lexical analysis, used
	 * for determining if that function has private scope
	 */
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

	/* The base class for new timber classes, with core functionality
	 * such as binding, delay, el/$el creation, etc.
	 */
	function tricks(params) {

	var self = this;

	// give this timber private scope
	var privateScope = helperMethods.mixin({}, this.private || {});
	fn_parser.addPrivateScope(this, privateScope);

	/* EVENT MANAGEMENT */

	var propChangeCallbacks = {};
	var realData = {};

	this.trigger = function(name, value, callback) {
		var callbacks = propChangeCallbacks[name];
		if(callbacks)
			for(var i in callbacks)
				callbacks[i].call(this, value, callback);
	}

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
	}

	// create objects if none were given
	if(!params)
		params = {};

	// do actions only relavent if tricks was inherited with the dom property enabled
	if(this.domless != true) {

		/* create or locate the view for this trick */

		// if the user gave us a selector use that one
		if(params.el) {
			// user given selector is jQuery selector
			if(params.el instanceof jQuery) {
				params.$el = params.el;
				params.el = params.el[0];
			// user given selector is not jquery
			}else if(wiundow.jQuery) {
				params.$el = $(params.el);
			}
		// user gave us no selector so make one
		}else{
			if(typeof document !== 'undefined') {
				params.el = document.createElement(this.tagName ? this.tagName : 'div');
				if(typeof jQuery !== 'undefined')
					params.$el = jQuery(params.el);
			}
		}

		if(this.className)
			params.el.className = this.className;

		if(this.id)
			params.el.id = this.id;



	}

	/* handle events for the trick */

	if(this.events) {
		// determine method of adding the events
		var el = params.el;
		var $el = params.$el;
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

	// slap parameters into function as attributes
	helperMethods.mixin(this, params);

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
	//this.trigger('change:' + key, value);
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

	/* returns the "timber" method exposed in the window below, used to create new timbers */
	function trick(trickProps, isExtending) {

	// if this trick extends another trick(s) perform parent.extend(trickProps), instead of building new trick
	if(trickProps && trickProps['extends']) {
		var extending = trickProps['extends'];
		delete trickProps['extends'];
		if(extending instanceof Array && extending.length > 0)
			return extending.shift().extend(trickProps, extending);
		else
			return extending.extend(trickProps);
	}

	// create constructor for the new trick
	var newTrick;
	newTrick = function(params) {
		// call the setupTrick method
		tricks.call(this, params);
		// invoke "init" constructor unless we're a singleton
		if(!trickProps.singleton) {
			var args = helperMethods.parseArray(arguments);
			args.shift();
			if(typeof this.init === 'function')
				this.init.apply(this, args);
		}
	}

	// give the trick .extend() like functionality
	newTrick.extend = extendTrick;

	// optimization, if trick invoked by extendTrick, the below will be overwritten anyway so dont run it
	if(isExtending) return newTrick;

	// give prototype for this function access to the tricks API
	newTrick.prototype = Object.create(tricks.prototype);

	// apply trickProps to the trick
	_applyTrickProps(newTrick, trickProps);

	// return a singleton instance
	if(trickProps.singleton) {
		var singleton;
		return function(params) {
			if(singleton)
				return singleton;
			singleton = new newTrick(params);
			var args = helperMethods.parseArray(arguments);
			args.shift();
			if(typeof singleton.init === 'function')
				singleton.init.apply(singleton, args);
			return singleton;
		}
	}

	// return our new trick
	return newTrick;

}

/* takes trickProps object and deflates it onto the trick prototype */
function _applyTrickProps(newTrick, trickProps) {

	// rip out defaults
	if(trickProps && trickProps.defaults) {
		var defaults = trickProps.defaults;
		delete trickProps.defaults;
	}

	// if newTrick already has private variables, combine them into new privates given
	if(typeof newTrick.prototype.private !== 'undefined' && typeof trickProps.private !== 'undefined') {
		helperMethods.mixin_passive(trickProps.private, newTrick.prototype.private);
	}

	// set all properties
	helperMethods.mixin(newTrick.prototype, trickProps);

	// now set defaults
	if(defaults)
		helperMethods.mixin(newTrick.prototype, defaults);
}

/* allows for extending another trick */

function extendTrick(trickProps, mixins) {

	// the class we inherit from directly is the first item in the array
	var inheritFrom = this instanceof Array ? extending.shift() : this;
	var newClass = trick(trickProps, true);
	classExtender(newClass, inheritFrom);

	// mixin the other extendees
	if(typeof mixins !== 'undefined')
		for(var i = 0; i < mixins.length; i++)
			helperMethods.mixin(newClass.prototype, mixins[i]);

	// only after everything should we apply trick props to our new class
	_applyTrickProps(newClass, trickProps);

	return newClass;
}

	/* expose the timber builder to the window */
	globalScope[ typeof globalScope.exports !== 'undefined' ? 'exports' : 'timber' ] = trick;

})( typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? module : window );