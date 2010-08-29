//!#ifndef __INCLUDE_UTIL__
//!#define __INCLUDE_UTIL__

//!#if DEBUG
//!#define LOG(msg) util.log((msg));
//!#else
//!#define LOG(msg)  
//!#endif

var util = {
    css: function(node, style) {
            if(node && node.style) {
                for (var key in style) {
                    node.style[key] = style[key];
                }
            }
    },
    show: function(node) {
        if(node && node.style) {
            node.style.display = "block";
        }
    },
    hide: function(node) {
        if(node && node.style) {
            node.style.display = "none";
        }
    },
    addClass: function(node, cls) {
        if(node) {
            if(!node.className) {
                node.className = cls;
            }
            else if(node.className.indexOf(cls) == -1) {
                node.className = node.className + " " + cls;
            }
        }
    },
    removeClass: function(node, cls) {
        if(node && node.className && node.className.indexOf(cls) >= 0) {
            var pattern = new RegExp('\\s*' + cls + '\\s*');
            node.className = node.className.replace(pattern, ' ');
        }
    },
    fireEvent: function(element,event) {
        // dispatch for firefox + others
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent(event, true, true ); // event type,bubbling,cancelable
        return !element.dispatchEvent(evt);
    },
    getPreferencesService: function() {
        if(!this._preferencesService) {
            this._preferencesService = Components.classes["@mozilla.org/preferences-service;1"]
                                      .getService(Components.interfaces.nsIPrefBranch)
                                      .getBranch("extensions.floatnotes.");
        }
        return this._preferencesService;
    },
    getCurrentVersion: function(cb) {
        if(!this._currentVersion) {

            if(Application.version < "4.0") {
                var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
                                                 .getService(Components.interfaces.nsIExtensionManager);
                this._currentVersion = extensionManager.getItemForID("floatnotes@felix-kling.de").version;
                cb(this._currentVersion);
            }
            else {
                var scope = {}, that = this;
                Components.utils.import("resource://gre/modules/AddonManager.jsm", scope);
                scope.AddonManager.getAddonByID('floatnotes@felix-kling.de', function(addon) {
                    that._currentVersion = addon.version;
                    cb(this._currentVersion);
                });

            }
        }
        else {
            cb(this._currentVersion);
        }
    },

    getString: function(string, params) {
        if(!this._stringBundle) {
            this._stringBundle = document.getElementById("floatnotes-stringbundle");
        }
        
        this.getString = function(string, params) {
            if(params) {
                return this._stringBundle.getFormattedString(string, params);
            }
            else {
                return this._stringBundle.getString(string);
            }
        };
        
        return this.getString(string, params);
    },
     /* compute the possible locations for the current URL */
    getLocations: function(doc) {
        var location = (doc) ? doc.location : window.content.document.location;
        var urls = Array();
        if(location.protocol == 'http:' || location.protocol == 'https:') {
            var url =  location.href.replace(location.hash, '').replace(location.protocol + '//', '');
            if(location.search) {
                var url_with_search = url;
                url = url_with_search.replace(location.search, '');
            }
            var parts = url.split('/');
            var path = '';
            if(parts[parts.length-1] == '') parts.pop();
            for (var i = 0, length = parts.length; i < length; ++i) {
                path += parts[i];
                urls.push( path + '*');
                path += '/';
            }
            var last = urls[urls.length-1];
            last = last.substring(0,last.length-1);
            if(last.charAt(last.length-1) == '/')
                last = last.substring(0,last.length-1);
            urls.push(last);
            if(location.search)
                urls.push(url_with_search);
        }
        else {
           urls.push(location.href.replace(location.hash,''));
        }
        return urls;
    },
    /* get the URL for a new note */ 
    getDefaultUrl: function() {
        var loc = this.getLocations();
        var default_loc = this.getPreferencesService().getIntPref('location');
        if(default_loc == 0) {
            return loc[0];
        }
        if(gBrowser.contentDocument.location.search) {
            return loc[loc.length + default_loc];
        }
        else {
            return loc[loc.length + default_loc +1];
        }
    },

    log: function(msg) {
        this._consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                       .getService(Components.interfaces.nsIConsoleService);
        this.log = function(msg) {
            this._consoleService.logStringMessage(msg);
        }
        this.log(msg);
    }
};
//!#endif
