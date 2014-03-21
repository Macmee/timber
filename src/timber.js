(function(globalScope) {

	/* includes useful methods like mixin */
	include "helper_methods.js";

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

	/* expose the timber builder to the window */
	globalScope[ typeof globalScope.exports !== 'undefined' ? 'exports' : 'timber' ] = trick;

})( typeof module !== 'undefined' && typeof module.exports !== 'undefined' ? module : window );