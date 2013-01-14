//!#include "header.js"
/*global LOG, Cu, Util */
//!#include "MainUI.js"
/*global MainUI */

/*jshint browser:true*/

var Loader = {

  listenToApplicationLoad: function() {
    "use strict";
    LOG('Application loaded');
    var self = this;
    window.addEventListener('load', function handler() {
      window.removeEventListener('load', handler, false);
      LOG('Window loaded');
      var timer = Util.Mozilla.getTimer();
      var observer = {
        notify: function() {
          LOG('Floatnotes is loading...');
          Cu['import']('resource://floatnotes/init.js'); /*global Init:true*/
          Init.init(function(firstrun) {
            self.createFloatNotesView(firstrun);
          });
        }
      };
      timer.initWithCallback(observer, 100, timer.TYPE_ONE_SHOT);
    });

    try {
      LOG('Import sync...');
      Cu['import']('resource://floatnotes/sync.js');
      LOG('Import sync successful');
    }
    catch (e) {
      Cu.reportError(e);
    }
  },

  createFloatNotesView: function(firstrun) {
    "use strict";
    Cu['import']('resource://floatnotes/manager.js');
    Cu['import']('resource://floatnotes/SQLiteDatabase.js');
    Cu['import']('resource://floatnotes/InPageNotesContainer.js');
    /*global FloatNotesManager, FloatNotesSQLiteDatabase,
             FloatNotesInPageNotesContainer*/

    window[MainUI.GLOBAL_NAME] = new MainUI(
      FloatNotesManager.getInstance(FloatNotesSQLiteDatabase.getInstance()),
      new FloatNotesInPageNotesContainer()
    );
    LOG('View created');
    // add toolbar button
    if (firstrun) {
      this.installButton(
        'nav-bar',
        'floatnotes-toolbar-button',
        'search-container'
      );
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
        if (elem && elem.parentNode === toolbar) {
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
