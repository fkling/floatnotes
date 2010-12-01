//!#include "../header.js"

Cu.import("resource://floatnotes/preferences.js");

var EXPORTED_SYMBOLS = ['Init'];

var Init = {
    init: function(cb) {
        this.loadCSS();
        var that = this;
        this.getCurrentVersion(function(newVersion) {
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
        var sss = Cc["@mozilla.org/content/style-sheet-service;1"] .getService(Ci.nsIStyleSheetService);
        var ios = Cc["@mozilla.org/network/io-service;1"] .getService(Ci.nsIIOService);
        var uri = ios.newURI("chrome://floatnotes/skin/notes.css", null, null);

        if(!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {
            sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
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
                Cu.import("resource://gre/modules/AddonManager.js", scope);
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
            this._db = getDatabase(this.DB_FILE);
        }
        return this._db;
    },

    upgrade: function(from, to) {
        LOG("Update: " + from + " to " + to);
        Preferences.version = to;
        var db = this.getDatabase();

        var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Ci.nsIVersionComparator);

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
        if(versionChecker.compare(from, "0.6.5") < 0) {
            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN creation_date DATETIME');
            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN modification_date DATETIME');
        }
        if(versionChecker.compare(from, "0.6.6") < 0) {
            db.executeSimpleSQL('Alter TABLE floatnotes ADD COLUMN protocol TEXT');
            db.executeSimpleSQL('UPDATE floatnotes SET protocol="http:"');
        }
    }
}
