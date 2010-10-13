//!#include "util.js"
//!#include "view.js"

var Loader = {  

    listenToApplicationLoad: function() {
        var that = this;
        var runWhenLoaded = function(event){
            LOG("Window loaded");
            Components.utils.import("resource://floatnotes/init.jsm");
                Init.init(function() {
                that.createFloatNotesView();
            });
            window.removeEventListener('load', runWhenLoaded, false);           
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
