function moduleSelector(sel) {
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
	if(space == -1) {
        if(helperMethods.endsWith(saveAt, extension))
            saveAt = saveAt.substr(0, saveAt.length - extension.length - 1);
        saveAt = baseName(saveAt);
	}else if(dot > -1) {
		saveLoc = saveAt.substr(0, dot);
		saveAt = saveAt.substr(dot + 1);
	}else{
		saveLoc = saveAt;
	}
	return {
		name: moduleName,
		saveParent: saveLoc,
		extension: extension,
        variableName: saveAt.charAt(0) === ':' ? saveAt.substr(1) : saveAt
	};
}

function evaluateCode(code) {
	var se = document.createElement('script');
	se.type = "text/javascript";
	se.text = code;
	document.getElementsByTagName('head')[0].appendChild(se);
}

function basePath(path) {
	var slash = path.lastIndexOf('/');
	var base = path.substr(0, slash);
	return base == '' ? base : base + '/';
}

function baseName(str) {
	return str.substr(str.lastIndexOf('/')+1);
}

function resolvePath(filename, base) {
    if(filename.charAt(0) == ':')
		return settings.repoBase + '?v=' + settings.version + '&f=' + filename.substr(1);
	if(filename.substr(0, 2) == './')
		return filename.substr(2);
	if(filename.charAt(0) == '/' || filename.substr(0, 5) == 'http:')
		return filename;
    if(typeof base === 'undefined')
        return filename;
	var filename_parts = filename.split('/');
	var basename_parts = base.split('/');
	if(basename_parts[basename_parts.length-1] == '')
		basename_parts.pop();
	while(filename_parts.length > 0 && filename_parts[0] == '..') {
		filename_parts.shift();
		basename_parts.pop();
	}
	return basename_parts.join('/') + (basename_parts.length > 0 ? '/' : '') + filename_parts.join('/');
}

var pkgEnv = {
    cachedFiles: {},
    globalScope: globalScope
};

if(isNodeJS) {

    // node needs the default base for requiring timber classes to be the base of where timber was initially included
    pkgEnv.base = basePath(module.parent.filename);

    // we need a way to fetch modules over the internet
    function webRequire(fullPath, base) {
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
        var base = basePath(fullPath);
        sandbox.getModule = function(filename) { return pkgEnv.getModule_real(filename, base) };
        require('vm').runInNewContext(code, sandbox, fullPath);
        return typeof sandbox.module.exports !== 'undefined' && !sandbox.module.exports.__undefined ? sandbox.module.exports : sandbox.module;
    }

}
    
pkgEnv.getModule_real = function(filename, base) {

    // find the file
	var fullPath = resolvePath(filename, base);
	var basename = baseName(filename);
    
    // use cache to get file
	if(typeof pkgEnv.cachedFiles[basename] !== 'undefined')
		return pkgEnv.cachedFiles[basename];

    /* LOAD IN THE FILE FOR NODEJS */
    
    // special class loading for node
    if(isNodeJS) {
        var oldBase = pkgEnv.base;
        var oldLatestClass = pkgEnv.latestClass;
        pkgEnv.base = basePath(fullPath);
        var mod;
        // this package must be downloaded from the web
        if(fullPath.substr(0, 5) === 'http:') {
            mod = webRequire(fullPath, base);
        // laad package in
        }else{
            try{
                mod = require(fullPath);            
            }catch(e) { // couldnt find module, assume its a node module and include it
                var dotPos = filename.lastIndexOf('.');
                if(dotPos > -1)
                    filename = filename.substr(0, dotPos);
                mod = require(filename);
            }
        }
        // extract the fetched module and return it, also cache it
        if(typeof mod === 'object' && Object.keys(mod).length === 0)
            mod = pkgEnv.latestClass;
        pkgEnv.latestClass = oldLatestClass;
        pkgEnv.base = oldBase;
        return pkgEnv.cachedFiles[basename] = mod;
    }

    /* LOAD IN THE FILE FOR WEB */

	// open and send a synchronous request
	var xhrObj = new XMLHttpRequest();
	xhrObj.open('GET', fullPath, false);
	xhrObj.send('');

    // handle handlebars
    if(helperMethods.endsWith(fullPath, '.hbs') || helperMethods.endsWith(fullPath, '.handlebars')) {
        var handlebars = pkgEnv.getModule_real(':handlebars.js', '');
        return pkgEnv.cachedFiles[basename] = handlebars.compile(xhrObj.responseText);
    }

	var base = basePath(fullPath);

	var code = 'window.__timberRequire = function(pkgEnv) {\
                    \
					function getModule(filename) {\
						return pkgEnv.getModule_real(filename, "' + base + '");\
					}\
                    \
					var module = { exports: { __undefined: true } };\
                    \
					var prevLatestClass = pkgEnv.latestClass;\
					delete pkgEnv.latestClass;\
					var prevBase = pkgEnv.base;\
                    /*var prevGlobalScope = pkgEnv.globalScope;*/\
                    /*pkgEnv.globalScope = {};*/\
                    pkgEnv.base = "' + base + '";\
                    \
					' + xhrObj.responseText + ';\
                    \
					var thisClass = pkgEnv.latestClass;\
					pkgEnv.latestClass = prevLatestClass;\
					pkgEnv.base = prevBase;\
                    \
                    /*for(var name in pkgEnv.globalScope)\
                        eval("var " + name + "=" + "pkgEnv.globalScope[\'" + name + "\']");\
                    pkgEnv.globalScope = prevGlobalScope;*/\
                    \
					var exports = module.exports;\
					delete module.exports;\
					if(typeof exports !== "undefined" && !exports.__undefined) {\
						return exports;\
					}else if(Object.keys(module).length > 0) {\
						return module;\
					}else{\
						return thisClass;\
					}\
				}';
    evaluateCode(code);
	return pkgEnv.cachedFiles[basename] = window.__timberRequire(pkgEnv);
}

globalScope.getModule = function(filename) {
	return pkgEnv.getModule_real(filename, typeof pkgEnv.base === 'undefined' ? basePath(document.currentScript.src) : pkgEnv.base);
}

if(typeof globalScope.require === 'undefined')
    globalScope.require = globalScope.getModule;