function DatabaseConnector(database_file) {
	this.initWithFile(database_file);
}

DatabaseConnector.prototype = {
	initWithFile: function(database_file) {
		var storageService = Components.classes["@mozilla.org/storage/service;1"]
	 				                       .getService(Components.interfaces.mozIStorageService);
	 	this._db = storageService.openDatabase(database_file);
	},
	
	createTables: function() {
		this._db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, collapse INTEGER)');
        this._db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
	},
	
	getNotesForURLs: function(urls, runOnFinished) {
		var statement = this._db.createStatement("SELECT * FROM floatnotes WHERE url = :url ORDER BY x ASC"),
        	params = statement.newBindingParamsArray(),
        	notes = [];
        for (var i in urls) {
      	  var bp = params.newBindingParams();
      	  bp.bindByName('url', urls[i]);

      	  params.addParams(bp);
        }
        statement.bindParameters(params);
        statement.executeAsync({
      	  handleResult: function(aResultSet) {  			    
      	  for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
      		  
      		  var data = {
      				  x: row.getResultByName("x"),
      				  y: row.getResultByName("y"),
      				  id: row.getResultByName("id"),
      				  url: row.getResultByName("url"),
      				  content: row.getResultByName("content"),
      				  w: row.getResultByName("w"),
      				  h: row.getResultByName("h"),
      				  collapse: row.getResultByName("collapse"),
      				  color: row.getResultByName("color")
      		  };
      		  notes.push(data);
      	  }
        },
        handleCompletion: function() {
        	runOnFinished(notes);
        }
        });
	},
	
	createNoteAndGetId: function(note, runWhenFinished) {
		var statement = this._db.createStatement("INSERT INTO floatnotes  (url, content, h, w, x, y, collapse, color) VALUES ( :url, :content, :h, :w, :x, :y, :collapse, :color)");
		
		try {
			for (var param in statement.params) {
				statement.params[param] = note[param];				
			}
			var that = this;
			statement.executeAsync({
				handleCompletion: function(aReason) {
			    	if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
			    		return
			    	runWhenFinished(that._db.lastInsertRowID);
				}
			});
		}
		finally {
			statement.reset();
		}
	},
	
	updateNote: function(note, runWhenFinished) {
		var statement = this._db.createStatement("UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, y=:y, collapse=:collapse, color=:color, url=:url WHERE id = :id");
		
		try {
			for (var param in statement.params) {
				statement.params[param] = note[param];
			}
			var that = this;
			statement.executeAsync({
				handleCompletion: function(aReason) {
			    	if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
			    		return
			    	runWhenFinished();
				}
			});
		}
		finally {
			statement.reset();
		}
	}
};