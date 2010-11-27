//!#include "view.js"


var Loader = {  

    listenToApplicationLoad: function() {
        var that = this;
        var runWhenLoaded = function(event){
            window.removeEventListener('load', runWhenLoaded, false);           

            LOG("Window loaded");
            var runAfter = function() {
                try {
                    //Components.utils.import("resource://floatnotes/sync.jsm");
                    //initSync();
                }
                catch(e){};
                Components.utils.import("resource://floatnotes/init.jsm");
                Init.init(function() {
                    that.createFloatNotesView();
                });
            }
            var timer = Components.classes["@mozilla.org/timer;1"]
                        .createInstance(Components.interfaces.nsITimer);
            timer.initWithCallback({notify: runAfter}, 500, timer.ONE_SHOT);
        }
        window.addEventListener('load', runWhenLoaded, false);           
    },

    createFloatNotesView: function() {
        Components.utils.import("resource://floatnotes/manager.jsm");
        window[FloatNotesView.GLOBAL_NAME] = new FloatNotesView(getManager(this.getDatabase()));
        LOG("View created");
    },

    getDatabase: function() {
        if(!this._db) {
            Components.utils.import("resource://floatnotes/database.jsm");
                this._db = getDatabase(this.DB_FILE);
        }
        return this._db;
    }
};
//
//!#if !TESTRUN
Loader.listenToApplicationLoad();
//!#endif
