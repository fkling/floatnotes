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
        
        util.getCurrentVersion(function(newVersion) {
            var lastVersion = "0.0", firstrun = true;
            var preferences = util.getPreferencesService();
            var that = this;
            try{
                firstrun = preferences.getBoolPref("firstrun");
                lastVersion = preferences.getCharPref("version");                   
            }
            catch(e){}
            finally{
                if (firstrun){
                    that.runOnFirstRun();
                }
                else {
                    update.upgrade(lastVersion, newVersion);
                }
            }   
            cb();
        });
    },
    
    runOnFirstRun: function() {
        var preferences = util.getPreferencesService(); 
        
        this.getDatabase().createTables();
        preferences.setBoolPref("firstrun",false);
        util.getCurrentVersion(function(version) {
            preferences.setCharPref("version", version);
        });
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
