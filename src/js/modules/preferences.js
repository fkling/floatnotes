//!#include "../util.js"


var EXPORTED_SYMBOLS = ['Preferences'];

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

    get transparency() {
        if(!this._transparency) {
            this._transparency = this._branch.getCharPref('transparency');
        }
        return this._transparency;
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

    get scrollTimer() {
        if(!this._scrolltimer) {
            this._scrolltimer = this._branch.getIntPref('scrolltimer');
        }
        return this._scrolltimer;
    },

    get confirmDelete() {
        if(!this._confirmDelete) {
            this._confirmDelete = this._branch.getBoolPref('confirmDelete');
        }
        return this._confirmDelete ;
    },

    set confirmDelete(value) {
        this._branch.setBoolPref('confirmDelete', !!value);
    },

    get showUriNotSupported() {
        if(!this._showUriNotSupported) {
            this._showUriNotSupported = this._branch.getBoolPref('showUriNotSupported');
        }
        return this._showUriNotSupported;
    },

    set showUriNotSupported(value) {
        this._branch.setBoolPref('showUriNotSupported', !!value);
    },

    get updateOnHashChange() {
        if(!this._updateOnHashChange) {
            this._updateOnHashChange= this._branch.getBoolPref('updateOnHashChange');
        }
        return this._updateOnHashChange;
    },

    get includePageForHashURLs() {
        if(!this._includePageForHashURLs) {
            this._includePageForHashURLs = this._branch.getBoolPref('includePageForHashURLs');
        }
        return this._includePageForHashURLs;
    },

    get ignoreProtocol() {
        if(!this._ignoreProtocol) {
            this._ignoreProtocol = this._branch.getBoolPref('ignoreProtocol');
        }
        return this._ignoreProtocol;
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

    get version() {
        if(!this._version) {
            this._version = this._branch.getCharPref('version');
        }
        return this._version;
    },

    set version(value) {
        this._branch.setCharPref('version', value);
    },

    get firstrun() {
        if(!this._firstrun) {
            this._firstrun = this._branch.getBoolPref('firstrun');
        }
        return this._firstrun;
    },

    set firstrun(value) {
        this._branch.setBoolPref('firstrun', !!value);
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
        if(('_' + aData) in this) {
            LOG('Preference changed: ' + aData);
            this['_' + aData] = null;
        }
    }
}

Preferences.register();
