//!#include "../header.js"

var EXPORTED_SYMBOLS = ['FloatNotesPreferences'];

var FloatNotesPreferences = {
    _observers: {},
    _do_observe: true,

    /* -- preferences -- */

    get savedSearches() {
        if(!this._savedSearches) {
            this._savedSearches = this._branch.getComplexValue('savedSearches', Components.interfaces.nsISupportsString).data;
            this._savedSearches = (this._savedSearches) ? JSON.parse(this._savedSearches) : [];
        }
        return this._savedSearches;
    },

    set savedSearches(value) {
        this._savedSearches = value;
        var str = Components.classes["@mozilla.org/supports-string;1"]
                  .createInstance(Components.interfaces.nsISupportsString);
        str.data = JSON.stringify(value); 
        this._branch.setComplexValue("savedSearches", 
        Components.interfaces.nsISupportsString, str);
    },

    _init: function() {
        var b = this._branch,
            map = {},
            prefs = b.getChildList("",{});

        map[b.PREF_STRING] = 'CharPref';
        map[b.PREF_BOOL] = 'BoolPref';
        map[b.PREF_INT] = 'IntPref';

        for(var i = prefs.length; i--; ) {
            var pref = prefs[i],
                type = map[b.getPrefType(pref)];

            // don't override manually defined getter, setter
            if(!this.hasOwnProperty(pref)) {
                this.__defineGetter__(pref, getGetter(pref, type));
                this.__defineSetter__(pref, getSetter(pref, type));
            }
        }


    },

    register: function() {  
        var prefService = Components.classes["@mozilla.org/preferences-service;1"]  
        .getService(Components.interfaces.nsIPrefService);  
        this._branch = prefService.getBranch("extensions.floatnotes.");  
        
        this._init();

        this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);  
        this._branch.addObserver("", this, false);  
    },  

    unregister: function() {  
        if (!this._branch) {
            return; 
        }
        this._branch.removeObserver("", this);  
    },  

    observe: function(aSubject, aTopic, aData) {
        if(this._do_observe) {
            if(aTopic != "nsPref:changed") {
                return;
            }
            if(aData in this) {
                LOG('Preference changed: ' + aData);
                this['_' + aData] = null;
                this._notifyObservers(aData);
            }
        }
    },

    addObserver: function(observer) {   /* call: addObserver(instance, pref[, pref1, pref2,...]) */
        var preferences = Array.prototype.slice.call(arguments, 1); // first argument is oberserver
        for(var i = preferences.length; i--; ) {
            var preference= preferences[i];
            if(!(preference in this._observers)) {
                this._observers[preference] = [];
            }
            this._observers[preference].push(observer); LOG('Add observer for ' + preference)
        }
    },

    removeObserver: function(observer) { /* call: removeObserver(instance, pref[, pref1, pref2,...]) */
        var preferences = Array.prototype.slice.call(arguments); // first argument is oberserver
        for(var i = preferences.length; i--; ) {
            var preference= preferences[i];
            if(preference in this._observers) {
                var obs = this._observers[preference];
                Util.Js.removeObjectFromArray(observer, obs);
                if(obs.length === 0) {
                    delete this._observers[preference];
                }
            }
        }
    },

    _notifyObservers: function(preference) { LOG('Registerd observers for ' + preference + ': ' + (preference in this._observers))
        if(preference in this._observers) { LOG('Preference: Call observers');
            var obs = this._observers[preference];
            for(var i = 0, l = obs.length; i < l; i += 1) {
                var ob = obs[i];
                if(typeof ob === 'function') {
                    ob(preference, this[preference]);
                }
                else {
                    ob.onPreferenceChange(preference, this[preference]);
                }
            }
        }
    }
};

function getGetter(pref, type) {
    var ipref = '_' + pref,
        type = 'get' + type;
    return function() {
        if(!this[ipref]) {
            this[ipref] = this._branch[type](pref);
        }
        return this[ipref];
    };
}

function getSetter(pref, type) {
    var ipref = '_' + pref;
        type = 'set' + type;
    return function(value) {
        this._do_observe = false;
        this[ipref] = value;
        this._branch[type](pref, value);
        this._do_observe = true;
    };
}

FloatNotesPreferences.register();
