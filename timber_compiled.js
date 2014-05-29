var isNodeJS;
try{
    isNodeJS = typeof module !== 'undefined' && typeof module.exports !== 'undefined'
                                             && process !== 'undefined'
                                             && global !== 'undefined';
}catch(d) {
    isNodeJS = false;
}

(function(globalScope) {

	var settings = {
		version: 1,
		repoBase: 'http://timber.io/repo/'
	};

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

    replaceRange: function(str, startPos, len, replace) {
        var start = str.substr(0, startPos);
        var stop = str.substr(startPos + len);
        var replace = replace ? replace : '';
        return start + replace + stop;
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


	/* handles syncronous package management */
	var pkgEnv = trick.pkgEnv = {

    cachedFiles: {},

    precompiled: {},

    globalScope: globalScope,

    folderSeparator: /^win/.test(process.platform) ? '/' : '/',
    
    paths: {
        '': '/',
        'http:': 'http:',
        'https:': 'https:',
        '~': ''
    },

    resolvePath: function(filename, base, paths) {

        // fetch from web
        if(filename.charAt(0) == ':')
		    return settings.repoBase + '?v=' + settings.version + '&f=' + filename.substr(1);
        // macro
        var slash = filename.indexOf(this.folderSeparator);
        if(slash > -1) {
            var front = filename.substr(0, slash);
            var path = paths && paths[front] || this.paths[front];
            if(typeof path !== 'undefined') {
                return path + filename.substr(slash + 1);   
            }
        }
        // no base provided
        if(typeof base === 'undefined')
            return filename;
	    var filename_parts = filename.split(this.folderSeparator);
	    var basename_parts = base.split(this.folderSeparator);
	    if(basename_parts[basename_parts.length-1] == '')
		    basename_parts.pop();

        while(basename_parts.length && filename_parts.length > 0 && filename_parts[0] == '..') {
		    filename_parts.shift();
		    basename_parts.pop();
	    }

	    return basename_parts.join(this.folderSeparator) + (basename_parts.length > 0 ? this.folderSeparator : '') + filename_parts.join(this.folderSeparator);
    },
    
    basePath: function(path) {
        var slash = path.lastIndexOf(this.folderSeparator);
        var base = path.substr(0, slash);
        return base == '' ? base : base + this.folderSeparator;
    },

    baseName: function(str) {
        return str.substr(str.lastIndexOf(this.folderSeparator)+1);
    },

    // returns base, latest class and sets new environment
    createContext: function(base) {
        var self = this;
        var oldContext = {
            latestClass: self.latestClass,
            base: self.base,
            globalScope: self.globalScope
        };
        delete this.latestClass;
        this.globalScope = {};
        this.base = base;
        return oldContext;
    },

    // takes a context from above and restores it
    restoreContext: function(context) {
        for(var i in context)
            this[i] = context[i];
    },
    
    moduleSelector: function(sel) {
	    // split string into 2 parts, module name and where to store the module
	    var space = sel.indexOf(' ');
	    var moduleName = space == -1 ? sel : sel.substr(0, space);
	    var saveAt = sel.substr(space + 1);
	    // remove and find extension
	    var extension = 'js';
	    var length = moduleName.length;
	    if(helperMethods.endsWith(moduleName, '.js'))
		    moduleName = moduleName.substr(0, length-3);
	    else if(helperMethods.endsWith(moduleName, '.hbs')) {
		    moduleName = moduleName.substr(0, length-4);
            extension = 'hbs';
        }else if(helperMethods.endsWith(moduleName, '.handlebars')) {
		    moduleName = moduleName.substr(0, length-11);
            extension = 'handlebars';
        }

	    // refine exactly where we are storing module
	    var dot = saveAt.indexOf('.');
	    var saveLoc;
        // no save location is given so assume local and same name as file
	    if(space == -1) {
            if(helperMethods.endsWith(saveAt, extension))
                saveAt = saveAt.substr(0, saveAt.length - extension.length - 1);
            saveAt = this.baseName(saveAt);
            saveLoc = 'local';
        // save location is given
	    }else if(dot > -1) {
		    saveLoc = saveAt.substr(0, dot);
		    saveAt = saveAt.substr(dot + 1);
	    }else{
		    saveLoc = 'local';
	    }
        // make sure variable has legal name
        var varName = '';
        for(var i in saveAt) {
            var c = saveAt[i];
            if( (saveAt[i] >= 'a' && saveAt[i] <= 'z') || (saveAt[i] >= 'A' && saveAt[i] <= 'Z') || (saveAt[i] >= '0' && saveAt[i] <= '9') || saveAt[i] === '_' || saveAt[i] === '$' )
                varName += saveAt[i];
        }

        // return the selector
	    return {
		    name: moduleName,
		    saveParent: saveLoc,
		    extension: extension,
            variableName: varName
	    };
    },

    getBasePath: function() {

        // return propagated base
        if(typeof this.base !== 'undefined')
            return this.base;

        // determine which script is running right now, get the 3rd item down the stack if currentScript doesnt exist
        var currentScript;
        if("undefined" === typeof document.currentScript && "undefined" !== document) {
            var stack;
            try{
                throw new Error();
            }catch(e) {
                stack = e.stack;
            }
            currentScript = stack.match(/https?:\/\/[\s\S]+https?:\/\/[\s\S]+(https?.+):[0-9]+:[0-9]+/m);
            currentScript = currentScript && currentScript.length ? currentScript.pop() : '';
        }else{
            currentScript = document.currentScript.src;
        }

        // remove filename from path
        var currentScript = this.basePath(currentScript);

        // remove prefix from path
        if(!this.homeDir)
            this.homeDir = this.basePath(window.location.href);    
        currentScript = currentScript.substr(this.homeDir.length);

        // return base
        if(currentScript !== null)
            return this.basePath(currentScript);

    },

    runInNewContext: function(code, fullPath) {

        // this is the virtual base of where the code is supposed to be running from
        var base = pkgEnv.basePath(fullPath);

        // create new "simulated reference" environment
        function getModule(filename) {
            return pkgEnv.getModule_real(filename, base);
        }
        var module = { exports: { __undefined: true } };
        var oldContext = pkgEnv.createContext(base);
        var exports = {};

        // run the encapsulated code
        try{
            eval(code);
        }catch(e) {
            var line = e.stack.match(/>:([0-9]*):/);
            line = line.length > 0 ? " on line " + line.pop() : "";
            e.message = e.message + ' in file ' + fullPath + line;
            throw e;
        }

        // replace the global variables timber created in the above eval with psuedo global ones
        for(var name in pkgEnv.globalScope) {
            if(name[0] === "!") {
                globalScope[name.substr(1)] = pkgEnv.globalScope[name];
            }else{
                eval("var " + name + "=" + "pkgEnv.globalScope['" + name + "']");
            }
        }

        // restore previous "reference" environment
        var thisClass = pkgEnv.latestClass;
        pkgEnv.restoreContext(oldContext);

        // determine where the module is within the eval and return it
        exports = module.exports;
        delete module.exports;
        if(typeof exports !== "undefined" && !exports.__undefined) {
            return exports;
        }else if(Object.keys(module).length > 0) {
            return module;
        }else{
            return thisClass;
        }

    }

};

// elements of the packageManager differ for web and nodeJS
if(isNodeJS) {
    // default base for requiring timber classes to be the base of where timber was initially included
pkgEnv.base = pkgEnv.basePath(module.parent.filename.replace(/\\/g, '/'));

// we need a way to fetch modules over the internet
pkgEnv.webRequire = function(fullPath, base) {
    var httpsync = pkgEnv.httpsync;
    if(typeof httpsync === 'undefined') {
        try{
            httpsync = pkgEnv.httpsync = require('httpsync');
        }catch(e) {
            throw "\n\n\n\n===========================================================\n\nTimber requires the package httpsync, run the command: \n\n\tnpm -g install httpsync\n\n===========================================================\n\n\n\n";
        }
    }
    var code = httpsync.get(fullPath).end().data.toString();
    var sandbox = { console: console, setTimeout: setTimeout, clearTimeout: clearTimeout, require: require, process: process, Buffer: Buffer, timber: timber, exports: exports };
    sandbox.module = { exports: { __undefined: true } };
    var base = pkgEnv.basePath(fullPath);
    sandbox.getModule = function(filename) { return pkgEnv.getModule_real(filename, base) };
    require('vm').runInNewContext(code, sandbox, fullPath);
    return typeof sandbox.module.exports !== 'undefined' && !sandbox.module.exports.__undefined ? sandbox.module.exports : sandbox.module;
}

pkgEnv.getModule_real = function(filename, base) {

    // find the file
    var fullPath = this.resolvePath(filename, base);
    var basename = this.baseName(filename);

    // use cache to get file

    if(typeof this.cachedFiles[fullPath] !== 'undefined')
        return this.cachedFiles[fullPath];

    // this file came precomiled
    if(typeof this.precompiled[fullPath] !== 'undefined') {
        return this.cachedFiles[fullPath] = this.precompiled[fullPath](this);
    }

    /* LOAD IN THE FILE FOR NODEJS */

    // special class loading for node
    var oldBase = this.base;
    var oldLatestClass = this.latestClass;
    this.base = this.basePath(fullPath);
    var mod;
    // this package must be downloaded from the web
    if(fullPath.substr(0, 5) === 'http:') {
        mod = this.webRequire(fullPath, base);
    // laad package in
    }else{
        // first try loading module directly from user given path
        try{
            if(require('fs').existsSync(fullPath))
                mod = require(fullPath);
            // now try loading without the file extension (maybe they gave us a folder?)
            else{
                var fullPathNoExtension = fullPath.substr(0, fullPath.lastIndexOf('.'));
                if(require('fs').existsSync(fullPathNoExtension)) {
                    mod = require(fullPathNoExtension);
                }else{
                    throw 1;
                }
            }
        // couldnt find module, assume its a node module and include it
        }catch(e) {
            var dotPos = filename.lastIndexOf('.');
            if(dotPos > -1)
                filename = filename.substr(0, dotPos);
           try{
               mod = require(filename);
           }catch(e) {
               console.log('ERROR: failed to find module:', filename);
           }
       }
    }
    // extract the fetched module and return it, also cache it
    if(typeof mod === 'object' && Object.keys(mod).length === 0)
        mod = this.latestClass;
    this.latestClass = oldLatestClass;
    this.base = oldBase;
    return this.cachedFiles[basename] = mod;
    
}

}else{
    pkgEnv.getModule_real = function(filename, base) {

    // find the file
    var fullPath = this.resolvePath(filename, base);
    var basename = this.baseName(filename);

    // use cache to get file
    if(typeof this.cachedFiles[fullPath] !== 'undefined')
        return this.cachedFiles[fullPath];

    // this file came precomiled
    if(typeof this.precompiled[fullPath] !== 'undefined') {
        return this.cachedFiles[fullPath] = this.precompiled[fullPath](this);
    }

    // open and send a synchronous request
    var xhrObj = new XMLHttpRequest();
    xhrObj.open('GET', fullPath, false);
    xhrObj.send('');

    // handle handlebars
    if(helperMethods.endsWith(fullPath, '.hbs') || helperMethods.endsWith(fullPath, '.handlebars')) {
        var handlebars = this.getModule_real(':handlebars.js', '');
        return this.cachedFiles[basename] = handlebars.compile(xhrObj.responseText);
    }

    // return object requested
    return this.cachedFiles[fullPath] = this.runInNewContext(xhrObj.responseText, fullPath);

}
    
}

trick.addPath = function(key, filename) {
    var path = pkgEnv.resolvePath( filename, pkgEnv.getBasePath() );
    if(!helperMethods.endsWith(path, this.folderSeparator))
        path = path + this.folderSeparator;
    pkgEnv.paths[key] = path;
}

globalScope.getModule = function(filename) {
	return pkgEnv.getModule_real(filename, pkgEnv.getBasePath());
};


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
		get: generateSuper
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
		    }
		});

	}

};


	/* The base class for new timber classes, with core functionality
	 * such as binding, delay, el/$el creation, etc.
	 */
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


	/* returns the "timber" method exposed in the window below, used to create new timbers */
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
	var newTrick = function(params) {
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

/* allow changing settings */
trick.config = function(givenSettings) {
    helperMethods.mixin(settings, givenSettings);
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
            var requirement = reqList[i];
            if(!requirement)
                continue;
			var moduleDetails = pkgEnv.moduleSelector(requirement);
			var mod = getModule(moduleDetails.name + '.' + moduleDetails.extension);
			// store module
			if(moduleDetails.saveParent === 'this')
				newTrick.prototype[moduleDetails.variableName] = mod;
            else if(moduleDetails.saveParent === 'window' || pkgEnv.globalScope === globalScope)
                globalScope[moduleDetails.variableName] = mod;
			else{
                pkgEnv.globalScope['!' + moduleDetails.variableName] = globalScope[moduleDetails.variableName]; // temporarily overwrite global scope
                globalScope[moduleDetails.variableName] = mod;
		        pkgEnv.globalScope[moduleDetails.variableName] = mod;
            }
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


    /* expose SOME helper methods */
    trick.endsWith = helperMethods.endsWith;
    trick.replaceRange = helperMethods.replaceRange;
    
	/* expose the timber builder to the global object */
    globalScope.timber = trick;

    /* expot to express */
    if( typeof module !== 'undefined' && typeof module.exports !== 'undefined' )
        module.exports = trick;
    
	/* expose timber to AMD */
	if (typeof globalScope.define === "function" && typeof globalScope.define.amd === "function") {
	  globalScope.define("timber", [], function() {
	    return trick;
	  });
	}

})( isNodeJS ? global : window );
