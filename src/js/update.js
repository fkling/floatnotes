#ifndef __INCLUDE_UPDATE__
#define __INCLUDE_UPDATE__

#include "database.js"
#include "util.js"

var update = {
	upgrade: function(from, to) {
		util.getPreferencesService().setCharPref("version",to);
		var db = new DatabaseConnector();
		
		if (from < "0.6") { 
			// Insert code if version is different here => upgrade
			db.executeSimpleSQL('UPDATE floatnotes SET color="#FCFACF"');
		}
		if (from < "0.6.3") { 
			// Change column collapse to status
			db.executeSimpleSQL('ALTER TABLE floatnotes ADD COLUMN status INTEGER');
			db.executeSimpleSQL('UPDATE floatnotes SET status=32 WHERE collapse=1');
		}
	}
}

#endif