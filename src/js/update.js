#ifndef __INCLUDE_UPDATE__
#define __INCLUDE_UPDATE__

#include "database.js"
#include "util.js"

var upgrade = {
	upgrade: function(from, to) {
		util.getPreferencesService().setCharPref("version",to);
		var db = new DatabaseConnector();
		
		if (from < "0.6") { 
			// Insert code if version is different here => upgrade
			db.executeSimpleSQL('UPDATE floatnotes SET color="#FCFACF"');
		}
	}
}

#endif