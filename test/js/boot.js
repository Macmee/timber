//var timber = require('../../timber_compiled.js');

var y = timber({
	extends: ['../../modules/test/test2.js', '../../modules/test3'],
    defaults: {
	    array: [ 1, 2, 3 ]
	},
    requires: [':underscore _', '../../modules/test.hbs'],
	init: function() {
        console.log(test(123));
        console.log( _.size({ a: 1, b: 2, c: 3 }) );
		this.super.init();
	}
});

new y;
