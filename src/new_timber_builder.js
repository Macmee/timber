function trick(trickProps, isExtending) {

	// if this trick extends another trick(s) perform parent.extend(trickProps), instead of building new trick
	if(trickProps && trickProps['extends']) {
		var extending = trickProps['extends'];
		delete trickProps['extends'];
		if(extending instanceof Array && extending.length > 0) {
			var firstClass = extending.shift();
			if(typeof firstClass === 'string')
				firstClass = getModule(helperMethods.endsWith(firstClass, '.js') ? firstClass : firstClass + '.js');
			return firstClass.extend(trickProps, extending);
		}
		else{
			if(typeof extending === 'string')
				extending = getModule(helperMethods.endsWith(extending, '.js') ? extending : extending + '.js');
			return extending.extend(trickProps);
		}
	}

	// create constructor for the new trick
	var newTrick;
	newTrick = function(params) {
		// call the setupTrick method
		tricks.call(this, params);
		// invoke "init" constructor unless we're a singleton
		if( (typeof trickProps === 'undefined' || !trickProps.singleton) && typeof this.init === 'function')
			this.init.apply(this, arguments);
	}

	// give the trick .extend() like functionality
	newTrick.extend = extendTrick;

	// optimization, if trick invoked by extendTrick, the below will be overwritten anyway so dont run it
	if(isExtending)
        return newTrick;

	// give prototype for this function access to the tricks API
	newTrick.prototype = Object.create(tricks.prototype);

	// apply trickProps to the trick
	return applyTrickProps(newTrick, trickProps);

}

/* takes a timber and returns a singleton instance */
function makeSingletonInstace(newTrick) {
	var singleton;
	return function(params) {
		if(singleton)
			return singleton;
		singleton = new newTrick(params);
		if(typeof singleton.init === 'function')
			singleton.init.apply(singleton, arguments);
		return singleton;
	}
}

/* takes trickProps object and deflates it onto the trick prototype */
function applyTrickProps(newTrick, trickProps) {

	if(typeof trickProps === 'undefined')
		return newTrick;

	// rip out defaults
	if(typeof trickProps.defaults !== 'undefined') {
		var defaults = trickProps.defaults;
		delete trickProps.defaults;
	}

	// if newTrick already has private variables, combine them into new privates given
	if(typeof newTrick.prototype.private !== 'undefined' && typeof trickProps.private !== 'undefined') {
		helperMethods.mixin_passive(trickProps.private, newTrick.prototype.private);
	}

	// set all properties
	helperMethods.mixin(newTrick.prototype, trickProps);

	// now set defaults and make a dump of objects to deep copy
	if(typeof defaults !== 'undefined') {
		if(typeof newTrick.prototype.deepProperties === 'undefined')
		    var deepProperties = newTrick.prototype.deepProperties = {};
		else
		    var deepProperties = newTrick.prototype.deepProperties;
		for(var prop in defaults) {
		    if(defaults[prop] instanceof Object)
			deepProperties[prop] = JSON.stringify(defaults[prop]);
		    else
			newTrick.prototype[prop] = defaults[prop];
		}
		helperMethods.mixin(newTrick.prototype, defaults);
	}

	// setup requirements
	if(typeof trickProps.requires !== 'undefined') {
		var reqList = typeof trickProps.requires === 'string' ? [trickProps.requires] : trickProps.requires;
		for(var i in reqList) {
			var moduleDetails = moduleSelector(reqList[i]);
			var module = getModule(moduleDetails.name + '.' + moduleDetails.extension);
			// store module
			if(moduleDetails.saveParent == 'this')
				newTrick.prototype[moduleDetails.variableName] = module;
			else if(typeof pkgEnv.globalScope[moduleDetails.variableName] === 'undefined')
				pkgEnv.globalScope[moduleDetails.variableName] = module;
		}
		delete trickProps.requires;
	}

	// generate singleton
	if(trickProps.singleton)
		newTrick = makeSingletonInstace(newTrick);

	// store class on window
	pkgEnv.latestClass = newTrick;
	return newTrick;

}

/* allows for extending another trick */

function extendTrick(trickProps, mixins) { /* this = some trick function */

	// the class we inherit from directly is the first item in the array
	var newClass = trick(trickProps, true);
	classExtender(newClass, this);

	// mixin the other extendees
	if(typeof mixins !== 'undefined')
		for(var i = 0; i < mixins.length; i++) {
			var extending = mixins[i];
			if(typeof extending === 'string')
				extending = getModule(helperMethods.endsWith(extending, '.js') ? extending : extending + '.js');
            helperMethods.mixin_passive(newClass.prototype, extending);
		    // fix deep copy defaults
		    if(typeof extending.prototype.defaults !== 'undefined') {
			    // determine where on prototype to store deep vars
			    if(typeof newClass.prototype.deepProperties === 'undefined')
				    var deepProperties = newClass.prototype.deepProperties = {};
			    else
				    var deepProperties = newClass.prototype.deepProperties;
			    // add deep vars to prototype
			    for(var prop in defaults)
				    if(defaults[prop] instanceof Object && typeof deepProperties[prop] === 'undefined')
				        deepProperties[prop] = JSON.stringify(defaults[prop]);
				    
			}
				    
		}

	// only after everything should we apply trick props to our new class
	return applyTrickProps(newClass, trickProps);
}
