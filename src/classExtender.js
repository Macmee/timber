var generateSuper = function() {

	// this object will be populated with methods of the superclass bound to the child this scope
	var simulatedSuperInstance = {};

	// pointer to super
	var atInvokeSuper = this._super;

	// bind methods of the super to this object
	for(var prop in atInvokeSuper)
		if(typeof atInvokeSuper[prop] == 'function' && prop != 'constructor')
			simulatedSuperInstance[prop] = bind_for_super_propagation(atInvokeSuper[prop], this, atInvokeSuper._super);
	// manually pull the constructor from the superclass, it seems that for the top of inheritence doesnt get listed when looping props
	simulatedSuperInstance['constructor'] = bind_for_super_propagation(atInvokeSuper['constructor'], this, atInvokeSuper._super);

	// return the simulated super
	return simulatedSuperInstance;

}

// works the same as regular js bind, except it propagates the _super attribute once

var bind_for_super_propagation = function(fn, scope, tempParentProto) {
	return function() {
		'.super'; // we need further children to proxy this method too
		scope = scope ? scope : this;
		var atInvokeSuper = scope._super;
		scope._super = tempParentProto;
		var ret = fn.apply(scope, arguments);
		scope._super = atInvokeSuper;
		return ret;
	}
}

// allow inheritence

var classExtender = function(newClass, parent) {

	 // inherit from prototype
     newClass.prototype = Object.create(parent.prototype);

     // the child's prototype must know where its superclass protoype is so that the super method knows where to look for methods
     newClass.prototype._super = parent.prototype;

     // the child prototype needs the super method to access methods of the super class
     Object.defineProperty(newClass.prototype, 'super', {
		enumerable: false,
		configurable: true,
		set: function(data) {},
		get: generateSuper,
	 });

     // when the subclass inherits a method from the superclass where the method uses the super method, super in this case must point to the superclass's superclass, we fix this by defining these methods directly on the subclass to essensially proxy call super so that the value of ._super propagates correctly
     var needsProxy = /\.super/;
     for(var prop in parent.prototype)
     	if( typeof parent.prototype[prop] == 'function' && needsProxy.test(parent.prototype[prop].toString()) )
     		newClass.prototype[prop] = bind_for_super_propagation(parent.prototype[prop], undefined, parent.prototype._super);

     // fix wrong constructor
     newClass.prototype.constructor = newClass;
     
}