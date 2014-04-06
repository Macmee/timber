var parent = timber({

    defaults: {
	    x : 5,
	    y: { a: 55 }
	},
    
	init: function() {
		console.log('quack');
	}


});

var someClass = parent.extend({
	requires: ['../test a'],
	init: function() {
		a();
		this.super.init();
	}
});

module.exports = someClass;
