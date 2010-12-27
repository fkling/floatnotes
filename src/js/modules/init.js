//!#include "../header.js"

Cu.import("resource://floatnotes/preferences.js");
Cu.import("resource://floatnotes/util-Mozilla.js");

var EXPORTED_SYMBOLS = ['Init'];

var Init = {
    init: function(cb) {
        this.loadCSS();
        var that = this;
        this.getCurrentVersion(function(newVersion) {
            var URL = 'http://www.floatnotes.org/thankyou';
            that.init = function(cb) {cb();};
            var lastVersion = Preferences.version;
            var firstrun = Preferences.firstrun;
            if (firstrun){
                LOG('First run, version ' + newVersion);
                that.runOnFirstRun();
                Mozilla.openAndReuseOneTabPerURL(URL);
            }
            else {
                var upgraded = that.upgrade(lastVersion, newVersion);
                if(upgraded) {
                    Mozilla.openAndReuseOneTabPerURL(URL);
                }
            }
            cb();
        });
    },

    loadCSS: function() {
        var sss = Cc["@mozilla.org/content/style-sheet-service;1"] .getService(Ci.nsIStyleSheetService);
        var ios = Cc["@mozilla.org/network/io-service;1"] .getService(Ci.nsIIOService);
        var uri = ios.newURI("chrome://floatnotes/skin/notes.css", null, null);

        if(!sss.sheetRegistered(uri, sss.USER_SHEET)) {
            sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
        }
        LOG('CSS loaded');
    },

     getCurrentVersion: function(cb) {
        if(!this._currentVersion) {
            var appInfo = Cc["@mozilla.org/xre/app-info;1"] .getService(Ci.nsIXULAppInfo),
                versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
            LOG('Application version: ' + appInfo.version + '. Compared to 4.0alpha: ' + versionChecker.compare(appInfo.version, "4.0alpha"));
            if(versionChecker.compare(appInfo.version, "4.0alpha") < 0) {
                var extensionManager = Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager);
                this._currentVersion = extensionManager.getItemForID("floatnotes@felix-kling.de").version;
                LOG('Extension version: ' + this._currentVersion);
                cb(this._currentVersion);
            }
            else {
                var scope = {}, that = this;
                Cu.import("resource://gre/modules/AddonManager.jsm", scope);
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

    runOnFirstRun: function() {
        this.getDatabase().createTables();
        Preferences.firstrun = false;
        this.getCurrentVersion(function(version) {
            Preferences.version = version;
        });
    },
    getDatabase: function() {
        if(!this._db) {
            Cu.import("resource://floatnotes/database.js");
            this._db = new DatabaseConnector(this.DB_FILE);
        }
        return this._db;
    },

    upgrade: function(from, to) {
        LOG("Update: " + from + " to " + to);
        Preferences.version = to;
        var db = this.getDatabase();

        var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Ci.nsIVersionComparator);


        if(versionChecker.compare(from, "0.7") >= 0) {
            return false;
        }

        /* Create a backup of the DB file, just in case */

        db.backup();

        if(versionChecker.compare(from, "0.6") < 0) {
            // Insert code if version is different here => upgrade
            db.executeSimpleSQL('UPDATE floatnotes SET color="#FCFACF"');
        }
        if(versionChecker.compare(from, "0.7") < 0) {
            // Change column collapse to status
            db.executeSimpleSQL('ALTER TABLE floatnotes ADD COLUMN status INTEGER');
            db.executeSimpleSQL('UPDATE floatnotes SET status=32 WHERE collapse=1');

            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN guid');
            db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS guid ON floatnotes (guid)');
            db.executeSimpleSQL('UPDATE floatnotes SET guid=hex(randomblob(16))');

            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN creation_date DATETIME');
            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN modification_date DATETIME');
            db.executeSimpleSQL("UPDATE floatnotes SET creation_date=(strftime('%s','now')*1000000), modification_date=(strftime('%s','now')*1000000)");

            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN protocol TEXT');
            db.executeSimpleSQL('UPDATE floatnotes SET protocol="http:"');
        }
        return true;
    }
}
