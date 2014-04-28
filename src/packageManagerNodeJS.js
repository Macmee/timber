// default base for requiring timber classes to be the base of where timber was initially included
pkgEnv.base = pkgEnv.basePath(module.parent.filename);

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
