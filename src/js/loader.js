//!#include "header.js"
//!#include "MainUI.js"
var Loader = {  

    listenToApplicationLoad: function() {
        var that = this;
        var runWhenLoaded = function(event){
            window.removeEventListener('load', runWhenLoaded, false);           
            LOG("Window loaded");
            var runAfter = function() {
                Cu.import("resource://floatnotes/init.js");
                Init.init(function(firstrun) {
                    that.createFloatNotesView(firstrun);
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

    createFloatNotesView: function(firstrun) {
        Cu.import("resource://floatnotes/manager.js");
        Cu.import("resource://floatnotes/database.js");
        Cu.import("resource://floatnotes/InPageNotesUI.js");
        window[MainUI.GLOBAL_NAME] = new MainUI(new FloatNotesManager(new DatabaseConnector()), new InPageNotesUI());
        LOG("View created");
        // add toolbar button
        if (firstrun) {
            this.installButton("nav-bar", "floatnotes-toolbar-button", "search-container");
        }
    },
    
    installButton: function(toolbarId, id, afterId) {
        if (!document.getElementById(id)) {
            var toolbar = document.getElementById(toolbarId);

            var before = toolbar.firstChild;
            if (afterId) {
                let elem = before = document.getElementById(afterId);
                if (elem && elem.parentNode == toolbar)
                    before = elem.nextElementSibling;
            }

            toolbar.insertItem(id, before);
            toolbar.setAttribute("currentset", toolbar.currentSet);
            document.persist(toolbar.id, "currentset");
        }
    }
};
//
//!#if !TESTRUN
Loader.listenToApplicationLoad();
//!#endif
