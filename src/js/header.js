//!#ifndef __INCLUDE_HEADER__
//!#define __INCLUDE_HEADER__
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;
//!#if DEBUG
var logger = {
    log: function(msg) {
        "use strict";
        this._consoleService = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
        this.log = function(msg) {
            if (typeof msg === 'object') {
                msg = JSON.stringify(msg);
            }
            this._consoleService.logStringMessage('FloatNotes: ' + msg);
        };
        this.log(msg);
    }
};

var Asserter = (function() {
    "use strict";
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
        if (!expr) {
            throw new AssertionError(msg);
        }
    }

    return {
        assert: assert,
        assertTrue: function(expr, msg) {
            assert.apply(null, arguments);
        },
        assertFalse: function(expr, msg) {
            assert(!expr, msg);
        }
    };
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
    "use strict";
    var modules = ['Dom', 'Js', 'Locale', 'Css', 'Mozilla', 'Platform', 'Dialog'];
    var t = {_modules: {}};
    for (var i = modules.length; i--;) {
        var module = modules[i];
        t.__defineGetter__(module, (function(module) {
            return function() {
                Cu['import']('resource://floatnotes/util-' + module + '.js', this._modules);
                this.__defineGetter__(module, function() {
                    return this._modules[module];
                });
                return this[module];
            };
        }(module)));
    }
    return t;
}());
Cu['import']('resource://floatnotes/Shared.js');
Cu['import']('resource://floatnotes/when.js'); /*global FloatNotesWhen*/
var when = FloatNotesWhen;

var sprintf = (function() {
    "use strict";
    var pattern = /%s/g;
    
    function sprintf(string) {
        var replacements = [].slice.call(arguments, 1);
        var counter = 0;
        return string.replace(pattern, function() {
            return replacements[counter++];
        });
    }
    return sprintf;
}());
    
//!#endif
