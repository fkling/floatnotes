//!#ifndef __INCLUDE_UTIL__
//!#define __INCLUDE_UTIL__

//!#if DEBUG
//!#define LOG(msg) util.log((msg))
//!#else
//!#define LOG(msg)
//!#endif

var CC = Components.classes;
var CI = Components.interfaces;

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
            this._preferencesService = CC["@mozilla.org/preferences-service;1"]
            .getService(CI.nsIPrefService)
            .getBranch("extensions.floatnotes.");
        }
        return this._preferencesService;
    },
    getCurrentVersion: function(cb) {
        if(!this._currentVersion) {
            var appInfo = CC["@mozilla.org/xre/app-info;1"]
            .getService(CI.nsIXULAppInfo);
            var versionChecker = CC["@mozilla.org/xpcom/version-comparator;1"]
            .getService(CI.nsIVersionComparator);
            LOG('Application version: ' + appInfo.version + '. Compared to 4.0alpha: ' + versionChecker.compare(appInfo.version, "4.0alpha"));
            if(versionChecker.compare(appInfo.version, "4.0alpha") < 0) {
                var extensionManager = CC["@mozilla.org/extensions/manager;1"]
                .getService(CI.nsIExtensionManager);
                this._currentVersion = extensionManager.getItemForID("floatnotes@felix-kling.de").version;
                LOG('Extension version: ' + this._currentVersion);
                cb(this._currentVersion);
            }
            else {
                var scope = {}, that = this;
                Components.utils.import("resource://gre/modules/AddonManager.jsm", scope);
                    scope.AddonManager.getAddonByID('floatnotes@felix-kling.de', function(addon) {
                    that._currentVersion = addon.version;
                    LOG('Extension version: ' + that._currentVersion);
                    cb(that._currentVersion);
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
    getLocations: function(location) {
        location = location || window.content.document.location;
        var urls = Array();
        if(location.protocol == 'http:' || location.protocol == 'https:') {
            var url =  location.href.replace(location.hash, '').replace(location.protocol + '//', '');
            var url_with_search = '';
            if(location.search) {
                url_with_search = url;
                url = url_with_search.replace(location.search, '');
            }
            var parts = url.split('/');
            var path = '';
            if(parts[parts.length-1] === '') {
                parts.pop();
            }
            for (var i = 0, length = parts.length; i < length; ++i) {
                path += parts[i];
                urls.push( path + '*');
                path += '/';
            }
            var last = urls[urls.length-1];
            last = last.substring(0,last.length-1);
            if(last.charAt(last.length-1) == '/') {
                last = last.substring(0,last.length-1);
            }
            urls.push(last);
            if(location.search) {
                urls.push(url_with_search);
            }
        }
        else {
            urls.push(location.href.replace(location.hash,''));
        }
        return urls;
    },
    /* get the URL for a new note */ 
    getDefaultUrl: function(document) {
        var loc = this.getLocations(document.location);
        var default_loc = this.getPreferencesService().getIntPref('location');
        if(default_loc === 0) {
            return loc[0];
        }
        if(document.location.search) {
            return loc[loc.length + default_loc];
        }
        else {
            return loc[loc.length + default_loc +1];
        }
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
            LOG('Setting ' + attr + ' to ' + value);
            if(object.hasOwnProperty(attr) && value) {
                object[attr] = value;
            }
        }
    },

    log: function(msg) {
        this._consoleService = Components.classes["@mozilla.org/consoleservice;1"]
        .getService(Components.interfaces.nsIConsoleService);
        this.log = function(msg) {
            this._consoleService.logStringMessage("FloatNotes: " + msg);
        }
        this.log(msg);
    }
};
//!#endif
