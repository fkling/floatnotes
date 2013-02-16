"use strict";
//!#include "../header.js"
/*global Cc, Ci, window*/

var EXPORTED_SYMBOLS = ['Mozilla'];

var Mozilla = {

    /*
     * Opens a new tab for the given URL or reuses the an existing tab.
     */
    openAndReuseOneTabPerURL: function(url) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                    .getService(Components.interfaces.nsIWindowMediator);
        var browserEnumerator = wm.getEnumerator("navigator:browser");

        // Check each browser instance for our URL
        var found = false;
        while (!found && browserEnumerator.hasMoreElements()) {
            var browserWin = browserEnumerator.getNext();
            var tabbrowser = browserWin.gBrowser;

            // Check each tab of this browser instance
            var numTabs = tabbrowser.browsers.length;
            for (var index = 0; index < numTabs; index++) {
                var currentBrowser = tabbrowser.getBrowserAtIndex(index);
                var currentURL = currentBrowser.currentURI.spec;
                if (url == currentURL) {

                    // The URL is already opened. Select this tab.
                    tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];
                    // Focus *this* browser-window
                    browserWin.focus();

                    found = true;
                    break;
                }
            }
        }

        // Our URL isn't open. Open it now.
        if (!found) {
            var recentWindow = wm.getMostRecentWindow("navigator:browser");
            if (recentWindow) {
                // Use an existing browser window
                recentWindow.delayedOpenTab(url, null, null, null, null);
            }
            else {
                // No browser windows are open, so open a new one.
                var win = window.open(url);
            }
        }
    },

    registerObserver: function(observer) {
        var events = Array.prototype.slice.call(arguments, 1);
        if(!this._observerService) {
             this._observerService =  Cc["@mozilla.org/observer-service;1"]
              .getService(Ci.nsIObserverService);
        }
        for(var i = events.length; i--; ) {
            this._observerService.addObserver(observer, events[i], false);
        }
    },

    notifyObserver: function(event, data) {
        if(!this._observerService) {
             this._observerService = Cc["@mozilla.org/observer-service;1"]
               .getService(Ci.nsIObserverService);
        }
        this._observerService.notifyObservers(null, event, data);
    },

    removeObserver: function(observer) {
        var events = Array.prototype.slice.call(arguments, 1);
        if(!this._observerService) {
             this._observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        }
        for(var i = events.length; i--; ) {
            this._observerService.removeObserver(observer, events[i]);
        }
    },

    getRecentWindow: function() {
        if(!this._wm) {
            this._wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                    .getService(Ci.nsIWindowMediator);
        }
        return this._wm.getMostRecentWindow("navigator:browser");
    },

    getTimer: function() {
        return Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    }

};
