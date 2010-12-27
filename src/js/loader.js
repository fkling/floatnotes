//!#include "header.js"
//!#include "view.js"
var Loader = {  

    listenToApplicationLoad: function() {
        var that = this;
        var runWhenLoaded = function(event){
            window.removeEventListener('load', runWhenLoaded, false);           
            LOG("Window loaded");
            var runAfter = function() {
                Cu.import("resource://floatnotes/init.js");
                Init.init(function() {
                    that.createFloatNotesView();
                });
            }
            var timer = Components.classes["@mozilla.org/timer;1"]
                        .createInstance(Components.interfaces.nsITimer);
            timer.initWithCallback({notify: runAfter}, 500, timer.ONE_SHOT);
        }
        try {
            Cu.import("resource://floatnotes/sync.js");
        }
        catch(e) {
            LOG(e)
        }
        window.addEventListener('load', runWhenLoaded, false);           
    },

    createFloatNotesView: function() {
        Cu.import("resource://floatnotes/manager.js");
        Cu.import("resource://floatnotes/database.js");
        window[FloatNotesView.GLOBAL_NAME] = new FloatNotesView(new FloatNotesManager(new DatabaseConnector()));
        LOG("View created");
    }
};
//
//!#if !TESTRUN
Loader.listenToApplicationLoad();
//!#endif
