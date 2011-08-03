//!#ifndef __INCLUDE_HEADER__
//!#define __INCLUDE_HEADER__
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;
//!#if DEBUG
var logger = {
    log: function(msg) {
        this._consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
        this.log = function(msg) {
            this._consoleService.logStringMessage("FloatNotes: " + msg);
        }
        this.log(msg);
    }
};

var Asserter = (function() {
    function AssertionError(msg) {
        this.message = msg;
    }

    AssertionError.prototype = {
        name: 'FloatNotes AssertionError',
        toString: function() {
            return this.name + ': ' + this.message;
        }
    };

    function assert(expr, msg) {
        if(!expr)
            throw new AssertionError(msg);
    }

    return {
        assert: assert,
        assertTrue: function(expr, msg) {
            assert.apply(null, arguments)
        },
        assertFalse: function(expr, msg) {
            assert(!expr, msg);
        }
    }
}());

//!#define LOG(msg) logger.log((msg))
//!#define AT(expr, msg) Asserter.assertTrue((expr), (msg))
//!#define AF(expr, msg) Asserter.assertFalse((expr), (msg))
//!#else
//!#define LOG(msg)
//!#define AT(expr, msg)
//!#define AF(expr, msg)
//!#endif
var Util = (function() {
    var modules = ['Dom', 'Js', 'Locale', 'Css', 'Mozilla', 'Platform', 'Dialog'];
    var t = {_modules:{}};
    for(var i  = modules.length; i--;) {
        var module = modules[i];
        t.__defineGetter__(module, (function(module) {
            return function() {
                Cu.import("resource://floatnotes/util-" + module + ".js", this._modules);
                this.__defineGetter__(module, function() {
                    return this._modules[module];
                });
                return this[module];
            };
        }(module)));
    }
    return t;
}());
Cu.import("resource://floatnotes/Shared.js");
Cu.import("resource://floatnotes/preferences.js");
//!#endif
