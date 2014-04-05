var parent = timber({

        defaults: {
	    x : 5,
	    y: { a: 55 }
	},
    
	init: function() {
		console.log('quack');
	}


});

module.exports = parent.extend({
	requires: ['../test a'],
	init: function() {
		a();
		this.super.init()
	}
});
