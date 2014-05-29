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
    include "packageManagerNodeJS.js";
}else{
    include "packageManagerWeb.js";    
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
