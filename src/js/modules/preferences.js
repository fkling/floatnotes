//!#include "../header.js"

var EXPORTED_SYMBOLS = ['Preferences'],
    PREFS = {'width': 0, 
            'height': 0, 
            'location': 0, 
            'fadeOutAfter': 0, 
            'scrolltimer': 0,
            'color': 1, 
            'transparency': 1, 
            'draggingTransparency': 1, 
            'version': 1,
            'showIndicator': 2, 
            'confirmDelete': 2, 
            'showUriNotSupported': 2, 
            'updateOnHashChange': 2, 
            'includePageForHashURLs': 2, 
            'ignoreProtocol': 2, 
            'firstrun': 2,
            'showToolbarButton': 2,
            'showMenu': 2,
            'showContextHide': 2,
            'showContextDelete': 2,
            'showContextLocations': 2 },
    MAP = ['IntPref', 'CharPref', 'BoolPref'];


var Preferences = {
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

    register: function() {  
        var prefService = Components.classes["@mozilla.org/preferences-service;1"]  
        .getService(Components.interfaces.nsIPrefService);  
        this._branch = prefService.getBranch("extensions.floatnotes.");  

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

    addObserver: function(preference, observer) {
        if(!(preference in this._observers)) {
            this._observers[preference] = [];
        }
        this._observers[preference].push(observer); LOG('Add observer for ' + preference)
    },

    removeObserver: function(observer, preference) {
        if(preference in this._observers) {
            var obs = this._observers[preference];
            Util.Js.removeObjectFromArray(observer, obs);
            if(obs.length === 0) {
                delete this._observers[preference];
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

function getGetter(pref) {
    var ipref = '_' + pref;
    var ifunc = 'get' + MAP[PREFS[pref]];
    return function() {
        if(!this[ipref]) {
            this[ipref] = this._branch[ifunc](pref);
        }
        return this[ipref];
    };
}

function getSetter(pref) {
    var ipref = '_' + pref;
    var ifunc = 'set' + MAP[PREFS[pref]];
    return function(value) {
        this._do_observe = false;
        this[ipref] = value;
        this._branch[ifunc](pref, value);
        this._do_observe = true;
    };
}

for(var pref in PREFS) {
    Preferences.__defineGetter__(pref, getGetter(pref));
    Preferences.__defineSetter__(pref, getSetter(pref));
}

Preferences.register();
