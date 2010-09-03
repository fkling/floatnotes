var db_file;
var priority = "never";

function warmUp() {
	utils.include("lib/database.js");
}

function setUp() {
	db_file = utils.makeTempFile();
}

function tearDown() {
	utils.cleanUpTempFiles();
}

function testCanCreateDatabase() {
	var db = new DatabaseConnector();

	assert.isDefined(db, "Database connector is defined");
}

function testIsConnectedToDatabase() {
	var db = new DatabaseConnector(db_file);

	assert.isDefined(db._db, "Database is connected to database file.")
}

function testCreateTables() {
	var db = utils.openDatabase(db_file);

	var dbc = new DatabaseConnector(db_file);
	dbc.createTables();
	
	assert.isTrue(db.tableExists('floatnotes'), "The database tables got created")
}

function testCanReadNotesForURLs() {
	var db = utils.openDatabase(db_file);
	var dbc = new DatabaseConnector(db_file);
	dbc.createTables();
    createNotes(db);
	
	var loaded = {
		value : false
	};
	var notes;

	dbc.getNotesForURLs( [ "test.de", "test2.de"], function(returnedNotes) {
		notes = returnedNotes;
		loaded.value = true;
	});
	utils.wait(loaded);
	
	assert.equals(2, notes.length, "Notes are retreived");
}

function testCanSaveNote() {
	var db = getDatabase(db_file);
	var dbc = new DatabaseConnector(db_file);
	var loaded = {
		value : false
	};

	dbc.createNoteAndGetId( {url : "test.de",h : 100,w : 100,y : 50,x : 50,collapse : 0,color : "#AAA",content:"test"}, function(id) {
		loaded.value = true;
	});
	utils.wait(loaded);
	
	
	loaded.value = false;
	var result_url;
	var statement = db.createStatement("SELECT * FROM floatnotes WHERE url = :url ORDER BY x ASC");
	statement.params['url'] = 'test.de';
	statement.executeAsync({
		handleResult: function(aResultSet) {
			for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
	      		result_url = row.getResultByName("url");
	      	}
	   },
	   handleCompletion: function(aReason) {
		   loaded.value = true;
	   }
	});
	
	utils.wait(loaded);
	assert.equals("test.de", result_url, "Note gets saved");
}

function testCanUpdateNote() {
	var db = getDatabase(db_file);
	createNotes(db);
	var dbc = new DatabaseConnector(db_file);
	var loaded = {
		value : false
	};

	dbc.updateNote( {id: db.lastInsertRowID, url : "test.de",h : 42,w : 100,y : 50,x : 50,collapse : 0,color : "#AAA",content:"test"}, function() {
		loaded.value = true;
	});
	utils.wait(loaded);
	
	
	loaded.value = false;
	var result_h;
	var statement = db.createStatement("SELECT * FROM floatnotes WHERE id = :id");
	statement.params['id'] = db.lastInsertRowID;
	statement.executeAsync({
		handleResult: function(aResultSet) {
			for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
	      		result_h = row.getResultByName("h");
	      	}
	   },
	   handleCompletion: function(aReason) {
		   loaded.value = true;
	   }
	});
	
	utils.wait(loaded);
	assert.equals("42", result_h, "Note gets updated");
}



function createNotes(db) {
	var notes = [ {
		url : "test.de",
		h : 100,
		w : 100,
		y : 50,
		x : 50,
		status : 0,
		color : "#AAA",
		content:"test"
	}, {
		url : "test2.de",
		h : 100,
		w : 100,
		y : 50,
		x : 50,
		status : 0,
		color : "#AAA",
		content:"test"
	} ];
	var statement = db.createStatement("INSERT INTO floatnotes  (url, content, h, w, x, y, status, color) VALUES ( :url, :content, :h, :w, :x, :y, :status, :color)");
	var params = statement.newBindingParamsArray();
	var loaded = {
		value : false
	};
	
	for ( var i = notes.length; i; --i) {
		var bp = params.newBindingParams();
		for ( var p in notes[i-1]) {
			bp.bindByName(p, notes[i-1][p]);
		}
		params.addParams(bp);
	}
	statement.bindParameters(params);
	statement.executeAsync( {
		handleResult : function(aResultSet) {
		},
		handleCompletion : function() {
			loaded.value = true;
		}
	});
	utils.wait(loaded);
}

function getDatabase(db_file) {
	var db = utils.openDatabase(db_file);
	cleanDatabase(db);
	db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, collapse INTEGER)');
	db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
	return db;
}

function cleanDatabase(db) {
	db.executeSimpleSQL('DROP INDEX IF EXISTS urls');
	db.executeSimpleSQL('DROP TABLE IF EXISTS floatnotes');
}