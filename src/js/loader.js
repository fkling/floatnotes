function FloatNotesLoader(database_file) {
	this._db_file = database_file || "floatnotes.sqlite";
}

FloatNotesLoader.prototype = {
	createFloatNotesManager: function() {
		var floatNotesManager = new FloatNotes(this.getDatabase());
		window.gFloatNotesManager = floatNotesManager;
	},
	
	getDatabase: function() {		
		return new DatabaseConnector(this._db_file);
	},
	
	listenToApplicationLoad: function() {
		var that = this;
		var runWhenLoaded = function(event){
			that.createFloatNotesManager();
			window.removeEventListener('load', runWhenLoaded, false);
		};
		window.addEventListener("load", runWhenLoaded , false);
	}
};

//var floatnotes_loader = new FloatNotesLoader();

#ifdef DEBUG
//window.floatnotes_loader = floatnotes_loader;
#else
floatnotes_loader.listenToApplicationLoad();
//window.addEventListener("contextmenu", function(e) {gFloatNotes.updateContext(e);}, true);
//window.addEventListener("contextmenu", function(e) {gFloatNotes.updateMenuItems(e);}, false);
#endif