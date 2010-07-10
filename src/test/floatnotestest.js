var FNT = function(gFloatNotes) {
	this.gfn = gFloatNotes;
	
};

FNT.prototype = {
	/* Initial startup */
	init: function () {

		// --- Load and create database
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
		                              .getService(Components.interfaces.nsIProperties)
		                              .get("ProfD", Components.interfaces.nsIFile);
		file.append("floatnotes.sqlite");
	
		var storageService = Components.classes["@mozilla.org/storage/service;1"]
		                                        .getService(Components.interfaces.mozIStorageService);
		this.db = storageService.openDatabase(file);
	
		// Load  CSS to global stylessheets
		var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
		                             .getService(Components.interfaces.nsIStyleSheetService);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
		                             .getService(Components.interfaces.nsIIOService);
		var uri = ios.newURI("chrome://floatnotes/skin/notes.css", null, null);
		if(!sss.sheetRegistered(uri, sss.AGENT_SHEET))
			sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
	
		// get references to menu items
		this._deleteMenuItem = document.getElementById('floatnotes-delete-note');
		this._locationsMenu = document.getElementById('floatnotes-edit-note');
		this._editMenuItem = document.getElementById('floatnotes-edit-note');
		this._hideMenuItem = document.getElementById('floatnotes-hide-note');
		this._newMenuItem = document.getElementById('floatnotes-new-note');
	
		var that = this;
		
		var f = function(e){
			var doc = gBrowser.contentDocument;
	        if(doc.location.href == "resource://floatnotes/floatnotestest.html") {
	           doc.FNT = that;
	           doc.a = "test";
	           if(!doc.getElementById('FNT')) {
	        	   var s = doc.createElement('script');
	        	   s.id = 'FNT';
	        	   var t = doc.createTextNode('alert(document.a);FNT.run();');
	        	   s.appendChild(t);
	        	   doc.body.appendChild(s);
	        	   gBrowser.removeEventListener("load", f , false);
	           }
	        }
		};
		
		gBrowser.addEventListener("load", f , false);
		// attach load handler
		gBrowser.selectedTab = gBrowser.addTab("resource://floatnotes/floatnotestest.html");

	},
	
	run: function() {
	    for(var method in this) {
	    	if(method.substring(0,4) == 'test') {
	    		this[method]();
	    	}
	    }
	    
	}
};

/** Test functions **/

FNT.testTest = function() {
	fireunit.ok(true, "Test :)");
}