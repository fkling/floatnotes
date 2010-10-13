//!#ifndef __INCLUDE_UPDATE__
//!#define __INCLUDE_UPDATE__

//!#include "util.js"

var update = {
    upgrade: function(from, to) {
        Components.utils.import("resource://floatnotes/database.jsm"); LOG("Update: " + from + " to " + to);
        util.getPreferencesService().setCharPref("version",to);
        var db = getDatabase();

        var versionChecker = CC["@mozilla.org/xpcom/version-comparator;1"]
        .getService(CI.nsIVersionComparator);

        if(versionChecker.compare(from, "0.6") < 0) {
            // Insert code if version is different here => upgrade
            db.executeSimpleSQL('UPDATE floatnotes SET color="#FCFACF"');
        }
        if(versionChecker.compare(from, "0.6.3") < 0) {
            // Change column collapse to status
            db.executeSimpleSQL('ALTER TABLE floatnotes ADD COLUMN status INTEGER');
            db.executeSimpleSQL('UPDATE floatnotes SET status=32 WHERE collapse=1');
        }
    }
}

//!#endif
