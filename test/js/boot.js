//var timber = require('../../timber_compiled.js');

timber.addPath('mods', '~/../modules');

var y = timber({
	extends: ['mods/test/test2.js', 'mods/test3'],
    defaults: {
	    array: [ 1, 2, 3 ]
	},
    requires: [':underscore _', 'mods/test.hbs'],
	init: function() {
        console.log(test(123));
        console.log( _.size({ a: 1, b: 2, c: 3 }) );
		this.super.init();
	}
});

new y;
