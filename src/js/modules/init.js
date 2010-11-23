//!#ifndef __INCLUDE_UPDATE__
//!#define __INCLUDE_UPDATE__

//!#include "../util.js"

Components.utils.import("resource://floatnotes/preferences.jsm");

var EXPORTED_SYMBOLS = ['Init'];

var Init = {
    init: function(cb) {
        this.loadCSS();
        var that = this;
        util.getCurrentVersion(function(newVersion) {
            that.init = function(cb) {cb();};
            var lastVersion = Preferences.version;
            var firstrun = Preferences.firstrun;
            if (firstrun){
                LOG('First run, version ' + newVersion);
                that.runOnFirstRun();
            }
            else {
                that.upgrade(lastVersion, newVersion);
            }
            cb();
        });
    },

    loadCSS: function() {
        var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
        .getService(Components.interfaces.nsIStyleSheetService);
        var ios = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
        var uri = ios.newURI("chrome://floatnotes/skin/notes.css", null, null);

        if(!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
            sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
        }
        LOG('CSS loaded');
    },

    runOnFirstRun: function() {
        var preferences = util.getPreferencesService(); 

        this.getDatabase().createTables();
        Preferences.firstrun = false;
        util.getCurrentVersion(function(version) {
            Preferences.version = version;
        });
    },
    getDatabase: function() {
        if(!this._db) {
            Components.utils.import("resource://floatnotes/database.jsm");
            this._db = getDatabase(this.DB_FILE);
        }
        return this._db;
    },

    upgrade: function(from, to) {
        LOG("Update: " + from + " to " + to);
        Preferences.version = to;
        var db = this.getDatabase();

        var versionChecker = CC["@mozilla.org/xpcom/version-comparator;1"]
        .getService(CI.nsIVersionComparator);

        if(versionChecker.compare(from, "0.6") < 0) {
            // Insert code if version is different here => upgrade
            db.executeSimpleSQL('UPDATE floatnotes SET color="#FCFACF"');
        }
        // TODO: merge into one!
        if(versionChecker.compare(from, "0.6.3") < 0) {
            // Change column collapse to status
            db.executeSimpleSQL('ALTER TABLE floatnotes ADD COLUMN status INTEGER');
            db.executeSimpleSQL('UPDATE floatnotes SET status=32 WHERE collapse=1');
        }
        if(versionChecker.compare(from, "0.6.4") < 0) {
            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN guid');
            db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS guid ON floatnotes (guid)');
            db.executeSimpleSQL('UPDATE floatnotes SET guid=hex(randomblob(16))');
        }
    }
}

//!#endif
