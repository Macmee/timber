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
