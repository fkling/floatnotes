//!#include "header.js"
//!#include "MainUI.js"

/*global MainUI:true */

/*jshint browser:true*/

var Loader = {

    listenToApplicationLoad: function() {
        "use strict";
        LOG('Application loaded');
        var that = this;
        var runWhenLoaded = function(event) {
            window.removeEventListener('load', runWhenLoaded, false);
            LOG('Window loaded');
            var timer = Util.Mozilla.getTimer();
            var ob = {
                notify: function() {
                    LOG('Floatnotes is loading...');
                    Cu['import']('resource://floatnotes/init.js'); /*global Init:true*/
                    Init.init(function(firstrun) {
                        that.createFloatNotesView(firstrun);
                    });
                }
            };
            LOG('Window loaded');
            timer.initWithCallback(ob, 100, timer.TYPE_ONE_SHOT);
        };

        try {
            LOG('Import sync...');
            Cu['import']('resource://floatnotes/sync.js');
            LOG('Import sync successful');
        }
        catch (e) {
            Cu.reportError(e);
        }
        window.addEventListener('load', runWhenLoaded, false);
    },

    createFloatNotesView: function(firstrun) {
        "use strict";
        Cu['import']('resource://floatnotes/manager.js');
        Cu['import']('resource://floatnotes/SQLiteDatabase.js');
        Cu['import']('resource://floatnotes/InPageNotesContainer.js');
        /*global FloatNotesManager:true, FloatNotesSQLiteDatabase:true, FloatNotesInPageNotesContainer: true*/

        window[MainUI.GLOBAL_NAME] = new MainUI(new FloatNotesManager(FloatNotesSQLiteDatabase.getInstance()), new FloatNotesInPageNotesContainer());
        LOG('View created');
        // add toolbar button
        if (firstrun) {
            this.installButton('nav-bar', 'floatnotes-toolbar-button', 'search-container');
        }
    },

    installButton: function(toolbarId, id, afterId) {
        "use strict";
        if (!document.getElementById(id)) {
            var toolbar = document.getElementById(toolbarId);

            var before = toolbar.firstChild;
            if (afterId) {
                var elem = document.getElementById(afterId);
                before = elem;
                if (elem && elem.parentNode == toolbar) {
                    before = elem.nextElementSibling;
                }
            }

            toolbar.insertItem(id, before);
            toolbar.setAttribute('currentset', toolbar.currentSet);
            document.persist(toolbar.id, 'currentset');
        }
    }
};
//
//!#if !TESTRUN
Loader.listenToApplicationLoad();
//!#endif
