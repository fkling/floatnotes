//!#ifndef __INCLUDE_HEADER__
//!#define __INCLUDE_HEADER__
var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;
//!#if DEBUG
var logger = {
    log: function(msg) {
        this._consoleService = Cc["@mozilla.org/consoleservice;1"] .getService(Ci.nsIConsoleService);
        this.log = function(msg) {
            this._consoleService.logStringMessage("FloatNotes: " + msg);
        }
        this.log(msg);
    }
};
//!#define LOG(msg) logger.log((msg))
//!#else
//!#define LOG(msg)
//!#endif
var Util = (function() {
    var modules = ['Dom', 'Js', 'Locale', 'Css'];
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
//!#endif
