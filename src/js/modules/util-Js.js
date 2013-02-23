//!#include "../header.js"
/*global Util*/
"use strict";
var EXPORTED_SYMBOLS = ['Js'];

var Js = {

  addSingletonGetter: function(Constr) {
    Constr.getInstance = function() {
      if(Constr.__instance__) {
        return Constr.__instance__;
      }
      return Constr.__instance__ = (function(args) {
        function F() {
          return Constr.apply(this, args);
        }
        F.prototype = Constr.prototype;
        return new F();
      }(arguments));
    };
  },

  removeObjectFromArray: function(object, array) {
    var index = array.indexOf(object);
    if(index >= 0) {
      array.splice(index, 1);
    }
  },

  updateObject: function(object, values) {
    for(var attr in object) {
      var value = values[attr];
      if(object.hasOwnProperty(attr) && value) {
        object[attr] = value;
      }
    }
  },

  clone: function(obj) {
    var clone = {};
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        clone[prop] = obj[prop];
      }
    }
    return clone;
  },

  toArray: function(arrayOrObject) {
    if(Js.typeOf(arrayOrObject) === 'array') {
      return arrayOrObject;
    }
    var array = [];
    for(var prop in arrayOrObject) {
      if(arrayOrObject.hasOwnProperty(prop)) {
        array.push(arrayOrObject[prop]);
      }
    }
    return array;
  },

  // copied from Google Closure library
  /**
   * This is a "fixed" version of the typeof operator.  It differs from the typeof
   * operator in such a way that null returns 'null' and arrays return 'array'.
   * @param {*} value The value to get the type of.
   * @return {string} The name of the type.
   */
  typeOf:  function(value) {
    var s = typeof value;
    if (s == 'object') {
      if (value) {
        // Check these first, so we can avoid calling Object.prototype.toString if
        // possible.
        //
        // IE improperly marshals tyepof across execution contexts, but a
        // cross-context object will still return false for "instanceof Object".
        if (value instanceof Array) {
          return 'array';
        } else if (value instanceof Object) {
          return s;
        }

        // HACK: In order to use an Object prototype method on the arbitrary
        //   value, the compiler requires the value be cast to type Object,
        //   even though the ECMA spec explicitly allows it.
        var className = Object.prototype.toString.call(
          /** @type {Object} */ (value));
          // In Firefox 3.6, attempting to access iframe window objects' length
          // property throws an NS_ERROR_FAILURE, so we need to special-case it
          // here.
          if (className == '[object Window]') {
            return 'object';
          }

          // We cannot always use constructor == Array or instanceof Array because
          // different frames have different Array objects. In IE6, if the iframe
          // where the array was created is destroyed, the array loses its
          // prototype. Then dereferencing val.splice here throws an exception, so
          // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
          // so that will work. In this case, this function will return false and
          // most array functions will still work because the array is still
          // array-like (supports length and []) even though it has lost its
          // prototype.
          // Mark Miller noticed that Object.prototype.toString
          // allows access to the unforgeable [[Class]] property.
          //  15.2.4.2 Object.prototype.toString ( )
          //  When the toString method is called, the following steps are taken:
          //      1. Get the [[Class]] property of this object.
          //      2. Compute a string value by concatenating the three strings
          //         "[object ", Result(1), and "]".
          //      3. Return Result(2).
          // and this behavior survives the destruction of the execution context.
          if ((className == '[object Array]' ||
            // In IE all non value types are wrapped as objects across window
            // boundaries (not iframe though) so we have to do object detection
            // for this edge case
            typeof value.length == 'number' &&
            typeof value.splice != 'undefined' &&
            typeof value.propertyIsEnumerable != 'undefined' &&
            !value.propertyIsEnumerable('splice')
            )) {
              return 'array';
            }
            // HACK: There is still an array case that fails.
            //     function ArrayImpostor() {}
            //     ArrayImpostor.prototype = [];
            //     var impostor = new ArrayImpostor;
            // this can be fixed by getting rid of the fast path
            // (value instanceof Array) and solely relying on
            // (value && Object.prototype.toString.vall(value) === '[object Array]')
            // but that would require many more function calls and is not warranted
            // unless closure code is receiving objects from untrusted sources.

            // IE in cross-window calls does not correctly marshal the function type
            // (it appears just as an object) so we cannot use just typeof val ==
            // 'function'. However, if the object has a call property, it is a
            // function.
            if ((className == '[object Function]' ||
                 typeof value.call != 'undefined' &&
                 typeof value.propertyIsEnumerable != 'undefined' &&
                 !value.propertyIsEnumerable('call'))) {
              return 'function';
            }
      } else {
        return 'null';
      }

    } else if (s == 'function' && typeof value.call == 'undefined') {
      // In Safari typeof nodeList returns 'function', and on Firefox
      // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
      // and RegExps.  We would like to return object for those and we can
      // detect an invalid function by making sure that the function
      // object has a call method.
      return 'object';
    }
    return s;
  },

  bind: function(func, obj) {
    if(typeof Function.prototype.bind === "function") {
      return func.bind.apply(func, [].slice.call(arguments, 1));
    }
    else {
      var args = [].slice.call(arguments, 2);
      return function() {
        func.apply(obj, args.concat(arguments));
      };
    }
  },

  debounce: function(func, timeout) {
    var timer = Util.Mozilla.getTimer();
    return function() {
      var args = arguments;
      timer.initWithCallback({
        notify: function() {
          func.apply(null, args);
        }
      }, timeout, timer.TYPE_ONE_SHOT);
    };
  },

  empty: function(){},

  inherits: function(Child, Parent) {
    Child.prototype = Object.create(Parent.prototype);
    Child.prototype.constructor = Child;
    Child.prototype.__super__ = Parent;
  },

  /**
   * Pulls out a certain property for each object from an array of objects.
   */
   pull: function(array, prop) {
     var result = new Array(array.length);
     for (var i = 0, l = array.length; i < l; i++) {
       result[i] = array[i][prop];
     }
     return result;
   },

  addEventListener: function(element, event, handler, phase) {
    phase = phase === true || false;
    element.addEventListener(event, handler, phase);
    return function removeHandler() {
      element.removeEventListener(event, handler, phase);
      element = handler = null;
    };
  }
};
