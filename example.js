// example of private scoping

var animal = timber({ 

	defaults: {
		colour: 'brown'
	},

	private: {
		girlfriend: 'Amy'
	},

	init: function(name) {
		console.log(name + ' is the colour ' + this.colour);
	},

	walk: function() {
		console.log('I am walking');
	},

	lover: function() {
		console.log('I love ' + this.private.girlfriend);
	}

});

var myAnimal = new animal({ colour: 'red' }, 'Bob');
myAnimal.walk();
myAnimal.lover();
console.log('attempting to access private variables: ' + myAnimal.private);

/*
Bob is the colour red
I am walking
I love Amy
attempting to access private variables: undefined 
*/



// example of default values and inheritence

var horse = animal.extend({
	
	walk: function() {
		this.super.walk();
		console.log('really FAST!');
	}

});

var myHorse = new horse({}, 'Greg');
myHorse.walk();

/*
Greg is the colour brown
I am walking
really FAST! 
*/


// example of singleton classes, ref1 and ref2 point to the same instance of coolAPI

var coolAPI = timber({

	singleton: true,

	init: function() {
		console.log('hello, I ran just once!');
	}

});

var ref1 = coolAPI();
ref1.id = 5;

var ref2 = coolAPI();
console.log(ref2.id);

/*
hello, I ran just once!
5 
*/