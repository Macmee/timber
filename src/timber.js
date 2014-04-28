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
	include "helperMethods.js";

	/* handles syncronous package management */
	include "packageManager.js";

	/* classExtender takes a child function and a parent function, 
	 * and makes the child extend the parent, along with this.super
	 * support
	 */
	include "classExtender.js";

	/* When psased a function, it performs lexical analysis, used
	 * for determining if that function has private scope
	 */
	include "function_parser.js";

	/* The base class for new timber classes, with core functionality
	 * such as binding, delay, el/$el creation, etc.
	 */
	include "base_timber_class.js";

	/* returns the "timber" method exposed in the window below, used to create new timbers */
	include "new_timber_builder.js";

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
