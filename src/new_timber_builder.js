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
	if(trickProps && trickProps.defaults) {
		var defaults = trickProps.defaults;
		delete trickProps.defaults;
	}
	// set defaults
	helperMethods.mixin(newTrick.prototype, trickProps);
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