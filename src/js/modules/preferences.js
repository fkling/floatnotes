//!#include "../util.js"


var EXPORTED_SYMBOLS = ['getPreferences'];

var init = false;

var Preferences = {

    /* -- preferences -- */
    get width() {
        if(!this._width) {
            this._width = this._branch.getIntPref('width');
        }
        return this._width;
    },

    get height() {
        if(!this._height) {
            this._width = this._branch.getIntPref('height');
        }
        return this._width;
    },

    get color() {
        if(!this._color) {
            this._color = this._branch.getCharPref('color');
        }
        return this._color;
    },

    get location() {
        if(!this._location) {
            this._location = this._branch.getIntPref('location');
        }
        return this._location;
    },

    get showIndicator() {
        if(!this._showIndicator) {
            this._showIndicator = this._branch.getBoolPref('showIndicator');
        }
        return this._showIndicator;
    },

    get fadeOutTime() {
        if(!this._fadeOutAfter) {
            this._fadeOutAfter = this._branch.getIntPref('fadeOutAfter');
        }
        return this._fadeOutAfter;
    },

    get scrollTime() {
        if(!this._scrolltimer) {
            this._scrolltimer = this._branch.getIntPref('scrolltimer');
        }
        return this._scrolltimer;
    },

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
        if (!this._branch) return;  
        this._branch.removeObserver("", this);  
    },  

    observe: function(aSubject, aTopic, aData) {  
        if(aTopic != "nsPref:changed") return;  
        if(this['_' + aData]) {
            LOG('Preference changed: ' + aData);
            this['_' + aData] = null;
        }
    }
}

function getPreferences() {
    if(!init) {
        init = true;
        Preferences.register();
    }
    return Preferences;
}
