[Timber](http://timber.io/) - Shiver me Objects
==================================================

This JavaScript library aims to bring powerful Object Oriented programming features to JavaScript. Parallel to this, the library serves to be incredibly light weight, with a small compact 10kb overhead.

This library's aim is to provide light weight class functionality to javascript which supports:
* Classes with private scope
* Multiple Inheritence
* Support for "super" to access parent class
* Built-in singleton support
* Listen for variable changes & trigger events
* Built-in module loader similar to ExpressJS
* Event management similar to Backbone

A compiled version of this library is `timber_compiled.js` and can be [downloaded here](https://raw.githubusercontent.com/Macmee/timber/master/releases/1/timber.js).

Table of Contents
--------------------------------------

#####Getting Timber
* [Downloading and Using Timber](#download)
* [Optimizing for Deployment](#compiler)

#####Built-in Module Loader
* [What Is It?](#moduleLoader)
* [Choosing Where Modules are Saved](#savingmodules)
* [Loading Remote Modules (Including jQuery, Underscore, etc)](#remotemodules)
* [Creating And Including Modules](#localmodules)
* [Including Handlebars Templates](#handlebars)

#####Example Uses
* [Private Scoping](#privatescoping)
* [Events](#events)
* [Default values & Inheritence](#inheritence)
* [Singletons](#singletons)
* [Listening for Variable Changes](#triggers)

#####Developing Timber
* [Installing NodeJS](#nodejs)
* [Development Instructions](#develop)

Getting Timber
--------------------------------------

####Downloading and Using Timber<a name='download'></a>

A compiled version of this library is `timber_compiled.js` and can be [downloaded here](https://raw.githubusercontent.com/Macmee/timber/master/releases/1/timber.js).

You can then include timber in your app and immediately start using it:

```html
<script src='timber_compiled.js'></script>
<script>

	var myClass = timber({
		init: function() {
			console.log('hello world!');
		}
	});
	
	new myClass;
	
</script>
```

####Optimizing for Deployment<a name='compiler'></a>

TODO (by April 26th)

Can be used like:

	$ timber src/ -o compiled.js
	
This optimizes and combines all dependancies (local & remote) and stores them all into compiled.js

Built-in Module Loader
--------------------------------------

####What Is It?<a name='moduleLoader'></a>

Timber comes with a simple module loader that is somewhat CommonJS compliant. You can use the Timber module loader supports the following features:
* Loading in modules remotely hosted on the Timber.io open source repository
* Loading in local modules that exist within the current project
* Loading in NodeJS modules

####Choosing Where Modules are Saved<a name='savingmodules'></a>

Modules can either be stored globally, or (more recommended) onto the class being defined:

```javascript
var myClass = timber({

	requires: [ ':jquery $', 
		        ':underscore', 
		        '../someOtherModule.js', // note: the .js is optional
		        '../modules/myModule this.walla' ],

	init: function() {
		console.log($, 'jQuery included from remote repo and assigned to $');
		console.log(underscore, 'underscore included from remote repo');
		console.log(someOtherModule, 'someOtherModule included locally');
		console.log(this.walla, 'myModule included and assigned to this.walla');
	}

});
```

####Loading Remote Modules (Including jQuery, Underscore, etc)<a name='remotemodules'></a>

Timber gives you the ability to load in remote modules with a single line of code. You can later use the (Timber Compiler)[#compiler] to build and optimize your application which will automatically store these remote modules locally for you.

Example of remote module loading:
```javascript
var myClass = timber({ 

	requires: ':jquery $', // you can also provide an array [':jquery $', ':underscore _']

	init: function() {
		console.log('jQuery has been included', $(document));
	}

});

var myObj = new myClass;

/*
jQuery has been included [document-element]
*/
```

The semicolon infront of module names indicates to timber that you wish for the library to load the module from the Timber repo at http://timber.io/repo.

####Creating And Including Modules<a name='localmodules'></a>

A Timber compliant module is just a single file, it may consist of the following:

```javascript
/* src/modules/myModule.js */

timber({ 

	init: function() {
		console.log('myModule init ran');
	}

});
```

Note how no assignments are required. By default, if you do not assign anything to `module` or `module.exports` then Timber uses the most recent class definition you created (this works in both browser and nodeJS). The above module just as easily could have been defined using:

```javascript
/* alternative src/modules/myModule.js */

module.exports = function() {
	console.log('myModule ran');
}
```

Regardless as to if you're running Timber on the web, or on NodeJS, either of the above 2 module definitions will suffice. This module can be included in your source code as follows:

```javascript
/* src/js/myApp.js */

var app = timber({ 

	requires: '../modules/myModule', // alternatively ['../modules/myModule1', '../modules/myModule2']

	init: function() {
		console.log('app has started');
		new myModule;
	}

});

/*
app has started
myModule init ran
*/
```

Alternatively you can also include this module using:

```javascript
var yourModule = getModule('../modules/myModule.js'); // note how getModule requires a file extension
```

####Including Handlebars Templates<a name='handlebars'></a>

You might have the following Handlebars template:

```handlebars
<div>{{name}}</div>
<span>{{status}}</span>
```

Timber lets you include this template directly in a class:

```javascript
var myClass = timber({

	className: 'people' // optional - gives this.el a class attribute

	requires: 'path/to/template.hbs this.myTemplate',
	
	init: function() {
		this.el.innerHTML = this.myTemplate({ name: 'bob', status: 'happy' });
	}
});

var myObject = new myClass;
document.body.appendChild(myObject.el); // using jQuery: $('body').append(myObject.el);

/*
	Contents of the webpage after running the above code:

	<html>
		<body>
			<div class='people'>
				<div> bob </div>
				<div> happy </div>
			</div>
		</body>
	</html>
*/
```

Notice how you never had to include Handlebars at any point in time. When Timber realizes you want to include a handlebars template, it automatically includes Handlebars for you.

Worried about speed once you've deployed? The (Timber Compiler)[#compiler] automatically compiles Handlebars templates and locally loads the Handlebars runtime for you.

Example Uses
--------------------------------------

####Private Scoping<a name='privatescoping'></a>

Timber classes support private scoping. Class functions have access to a special `this.private` object. If you attempt to access this object in any way other than `this.private`, then it returns undefined.

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

####Events<a name='events'></a>

Every timber class has a div attribute called `this.el` (`this.$el` works automatically if you use jQuery). You can bind functions to this div element in the following way:

```javascript
var myClass = timber({
	
	tagName: 'div', // OPTIONAL: change what kind of tag this.el is
	className: 'test', // OPTIONAL: change the class of this.el
	domless: false, // OPTIONAL: change this to true if you dont want your class to have this.el
	
	init: function() {
		this.el.innerHTML = 'I have a <div> inside </div> me.';
	},

	events: {
		"click div": "showMessage"
	},

	showMessage: function() {
		alert("You clicked the div!");
	}
});

var object = new myClass;
document.body.appendChild(object.el); // or $('body').append(object.el) for jQuery

```

####Default values & Inheritence<a name='inheritence'></a>

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

####Singletons<a name='singletons'></a>

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

####Listening for Variable Changes<a name='triggers'></a>

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

####Installing NodeJS

Node.js is a platform built on Chrome's JavaScript runtime for easily building fast, scalable network applications. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient, perfect for data-intensive real-time applications that run across distributed devices.

[Install NodeJS here](http://nodejs.org/download/).

####Developing Timber<a name='develop'></a>

1. install [NodeJS](http://nodejs.org/)
2. cd into master and run `npm install`
3. run `grunt watch` and start deving