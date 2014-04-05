[Timber](http://timber.io/) - Shiver me objects
==================================================

What this library does?
--------------------------------------

This library's aim is to provide light weight class functionality to javascript which supports:

* Works on both the web and NodeJS
* Multiple Inheritence (with super keyword support)
* Classes with private variables
* Singleton classes
* Bindable events on variable changes
* A package/module manager (planned)

A compiled version of this library is `timber_compiled.js`

Example uses
--------------------------------------

Private Scoping:

```javascript
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
		console.log('I am walking with my girlfriend ' + this.private.girlfriend);
	}

});

var myAnimal = new animal({ colour: 'red' }, 'Bob');
myAnimal.walk();
console.log('attempting to access private variables: ' + myAnimal.private);

/*
Bob is the colour red
I am walking with my girlfriend Amy
attempting to access private variables: undefined 
*/
```

Events:

```html
<html>
...
	<body>
	...
		<div class="seven" style="background: #000; height: 10px; width: 10px;">7</div>
	...
	</body>
</html>
```

```javascript
var six = timber({
	
	init: function() {

	},

	events: {
		"click .seven": "showMessage"
	},

	showMessage: function() {
		alert("This isn't the number six!");
	}
});
```

Default values & Inheritence:

```javascript
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
I am walking with my girlfriend Amy
really FAST! 
*/
```

Singletons:

```javascript
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
```

Variable Bindings:

```javascript
var person = timber({
	
	defaults: {
		location: 'California'
	},

	init: function() {
		this.on('change:location', function(loc) {
			console.log('now located in ' + loc);
		});
	}

});

var Sam = new person();
Sam.location = 'Nebraska';

/*
now located in Nebraska
*/
```


Developing Timber
--------------------------------------

1. install [NodeJS](http://nodejs.org/)
2. cd into master and run `npm install`
3. run `grunt watch` and start deving
