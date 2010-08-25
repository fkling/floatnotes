//!#include "util.js"
//!#include "update.js"
//!#include "manager.js"

function FloatNotesLoader(database_file) {
	this._db_file = database_file;
}

FloatNotesLoader.prototype = {	
	
	listenToApplicationLoad: function() {
		var that = this;
		var runWhenLoaded = function(event){
			that.runUpdate(function() {
				that.loadCSS();
				that.createFloatNotesManager();
				window.removeEventListener('load', runWhenLoaded, false);			
			});

		};
		window.addEventListener("load", runWhenLoaded , false);
	},
	
	runUpdate: function(cb) {
		var lastVersion = "0.0", firstrun = true;
		
		var newVersion = util.getCurrentVersion();
        var preferences = util.getPreferencesService();
        var that = this;
        
        if(newVersion == null) { // Firefox 4
        	var scope = {};
        	Components.utils.import("resource://gre/modules/AddonManager.jsm", scope);
        	scope.AddonManager.getAddonByID('floatnotes@felix-kling.de', function(addon) {
        		newVersion = addon.version;
        		upgrade();
        		cb();
        	});
        }
        else {
        	upgrade();
        	cb();
        }
  	  	
        function upgrade() {
			try{
				firstrun = preferences.getBoolPref("firstrun");
				lastVersion = preferences.getCharPref("version");					
			}
			catch(e){}
			finally{
				if (firstrun){
					that.runOnFirstRun();
				}
				if(!firstrun) {
					update.upgrade(lastVersion, newVersion);
				}
	
			}	
        }
	},
	
	runOnFirstRun: function() {
		var preferences = util.getPreferencesService();	
		
		this.getDatabase().createTables();
		preferences.setBoolPref("firstrun",false);
		preferences.setCharPref("version",util.getCurrentVersion());			
	},
	
	loadCSS: function() {
	     var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
	                .getService(Components.interfaces.nsIStyleSheetService);
	     var ios = Components.classes["@mozilla.org/network/io-service;1"]
	                .getService(Components.interfaces.nsIIOService);
	     var uri = ios.newURI("chrome://floatnotes/skin/notes.css", null, null);
	     
	     if(!sss.sheetRegistered(uri, sss.AGENT_SHEET))
	    	 sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
	},

	createFloatNotesManager: function() {
		var floatNotesManager = new FloatNotes(this.getDatabase());
		window.gFloatNotesManager = floatNotesManager;
	},
	
	getDatabase: function() {
		if(!this._db) {
			this._db = new DatabaseConnector(this._db_file);
		}
		return this._db;
	}
};

//!#if !DEBUG
var floatnotes_loader = new FloatNotesLoader();
floatnotes_loader.listenToApplicationLoad();
//!#endif