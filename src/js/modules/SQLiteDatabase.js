//!#include "../header.js"
"use strict";

Cu['import']("resource://floatnotes/preferences.js");
/*global Preferences:true*/

var EXPORTED_SYMBOLS = ['FloatNotesSQLiteDatabase'];

/**
 * Provides low level methods to retrieve and store notes to a SQLite database.
 *
 * This is a singlton class, don't call the constructor, but
 * `var db = SQLiteDatabase.getInstance();` to get a reference.
 * 
 * @param {?} file A file pointer to the SQLite database file
 * @constructor
 */
function SQLiteDatabase(file) {
    this.setDatabase(file);
}

var FloatNotesSQLiteDatabase = SQLiteDatabase;

// We only want one instance to exist
Util.Js.addSingletonGetter(SQLiteDatabase);

/**
 * File pointer
 * @type {?}
 * @private
 */
SQLiteDatabase.prototype.file_ = null;


/**
 * Database connection
 * @type {?}
 * @private
 */
SQLiteDatabase.prototype.db_ = null;


/**
 * Sets the database file to use and opens a connection to the database.
 *
 * @param {?} File pointer to database file
 */
SQLiteDatabase.prototype.setDatabase = function(file) {
    if(!file) {
        if(Preferences.dbLocation === 0 || !Preferences.dbDir) {
            file = this.getDefaultStorageFile();
        }
        else {
            file = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
            file.initWithPath(Preferences.dbDir);
        }
    }
    LOG(file.path);
    this.file_ = file;
    this.db_ = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService).openDatabase(this.file_);
    this.createTables();
    LOG(file + ' loaded');
};


/**
 * Moves the current database to a new location, indicated by file.
 *
 * @param {?} file The location to move the database file to
 */
SQLiteDatabase.prototype.moveTo = function(file) {
    if(!this.file_.equals(file)) {
        this.file_.moveTo(file.parent, file.leafName);
        this.setDatabase(this.file_);
    }
};


/**
 * Merges the current database with the data in the other file.
 *
 * @param {?} file The location to move the database file to
 */
SQLiteDatabase.prototype.merge = function(file) {

};


/**
 * Returns a reference to the file the current database is stored in.
 *
 * @return {?}
 */
SQLiteDatabase.prototype.getStorageFile = function() {
    return this.file_;
};


/**
 * Returns a file pointer to the default database location. This is a file with
 * the name 'floatnotes.sqlite' in the Firefox profile folder.
 *
 * @return {?}
 */
SQLiteDatabase.prototype.getDefaultStorageFile = function() {
    var file =  Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    file.append('floatnotes.sqlite');
    return file;
};


/**
 * Triggers the routines to create base database tables and indexes.
 */
SQLiteDatabase.prototype.createTables = function() {
    this.db_.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, protocol TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, status INTEGER, guid TEXT, creation_date DATETME, modification_date DATETIME)');
    this.db_.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
    this.db_.executeSimpleSQL('CREATE INDEX IF NOT EXISTS guid ON floatnotes (guid)');
};


/**
 * Discards existing tables and recreates them, effectivly deleting all exsting
 * notes.
 */
SQLiteDatabase.prototype.clearTables = function() {
    this.db_.executeSimpleSQL('DROP TABLE IF EXISTS floatnotes');
    this.createTables();
};


SQLiteDatabase.prototype.getURLs = function(callback) {
    var statement = this.db_.createStatement("SELECT DISTINCT url FROM floatnotes ORDER BY url DESC");
    var urls = [];
    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                urls.push(row.getResultByName('url'));
            }
        },
        handleCompletion: function() {
            callback(urls);
        }
    });
};

SQLiteDatabase.prototype.getAllNotes = function(callback) {
    var statement = this.db_.createStatement("SELECT * FROM floatnotes ORDER BY content DESC");
    var notes = [];
    var that = this;
    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                notes.push(that.createNoteFromRow_(row));
            }
        },
        handleCompletion: function() {
            callback(notes);
        }
    });
};


SQLiteDatabase.prototype.getNotesContaining = function(wordList, runWhenFinished) {
    var that = this;
    var ands = [];
    for(var i = wordList.length; i--; ) {
        ands.push('uc LIKE :w' + i + " ESCAPE '~'");
    }

    var statement = this.db_.createStatement("SELECT *, url || content AS uc FROM floatnotes WHERE " + ands.join(' AND ') + " ORDER BY content");
    for (i = wordList.length; i--;) {
        statement.params['w' + i] =  '%' + statement.escapeStringForLIKE(wordList[i], "~") + '%';
        LOG('Include word: ' + statement.escapeStringForLIKE(wordList[i], "~"));
    }

    var notes = [];
    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                notes.push(that.createNoteFromRow_(row));
            }
        },
        handleCompletion: function() {
            runWhenFinished(notes);
        }
    });
};



SQLiteDatabase.prototype.getNotesForURLs = function(urls, callback) {
    var statement = this.db_.createStatement("SELECT * FROM floatnotes WHERE url = :url ORDER BY y ASC"),
        params = statement.newBindingParamsArray(),
        notes = [];
    var that = this;
    for (var i in urls) {
        var bp = params.newBindingParams();
        bp.bindByName('url', urls[i]);

        params.addParams(bp);
    }
    statement.bindParameters(params);
    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                var data = that.createNoteFromRow_(row);
                notes.push(data);
            }
        },
        handleCompletion: function() {
            callback(notes);
        }
    });
};


SQLiteDatabase.prototype.createNoteAndGetId = function(note, callback) {
    var sql = "INSERT INTO floatnotes (url,protocol,content,h,w,x,y,status,color,guid, modification_date, creation_date) VALUES (:url,:protocol,:content,:h,:w,:x,:y,:status,:color,:guid, :modification_date, :creation_date)";
    LOG('Note has guid:' + note.guid);
    if(typeof note.guid == "undefined") {
        sql = sql.replace(':guid', 'hex(randomblob(16))');
    }
    LOG('Generated statment: ' + sql);
    var statement = this.db_.createStatement(sql);
    try {
        for (var param in statement.params) {
            statement.params[param] = note[param];				
        }
        var that = this;
        statement.executeAsync({
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    return null;
                }
                var guid = note.guid;
                var id = that.db_.lastInsertRowID;
                LOG('INSERTED ID: ' + id);
                if(!guid) {
                    var statement = that.db_.createStatement("SELECT guid FROM floatnotes WHERE id = :id");
                    statement.params.id = id;
                    statement.executeStep();
                    guid = statement.row.guid;
                }
                callback(id, guid);
            }
        });
    }
    finally {
        statement.reset();
    }
};

SQLiteDatabase.prototype.updateNote = function(note, callback) {
    var statement = this.db_.createStatement("UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, y=:y, status=:status, color=:color, url=:url, protocol=:protocol, modification_date=:modification_date WHERE guid = :guid");
    try {
        for (var param in statement.params) {
            statement.params[param] = note[param];
        }
        var that = this;
        statement.executeAsync({
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    return null;
                }
                callback();
            }
        });
    }
    finally {
        statement.reset();
    }
};

SQLiteDatabase.prototype.deleteNote = function(note_guid, callback) {
    LOG('DB:DELETE note with GUID:' + note_guid);
    var statement = this.db_.createStatement("DELETE FROM floatnotes WHERE guid = :guid");
    try {
        statement.params.guid = note_guid;
        var that = this;
        statement.executeAsync({
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    return null;
                }
                callback();
            }
        });
    }
    finally {
        statement.reset();
    }
};

SQLiteDatabase.prototype.executeSimpleSQL = function(statement) {
    return this.db_.executeSimpleSQL(statement);
};

SQLiteDatabase.prototype.noteExistsWithId = function(callback, note_guid) {
    var statement = this.db_.createStatement("SELECT COUNT(*) as counter FROM floatnotes WHERE guid = :guid"),
        count = 0,
        that = this;
    statement.params.guid = note_guid;
    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                count = row.getResultByName('counter');
            }
        },
        handleCompletion: function() {
            callback(count > 0);
        }
    });     
};

SQLiteDatabase.prototype.getNote = function(callback, note_guid) {
    LOG('Get note with GUID ' + note_guid);
    var statement = this.db_.createStatement("SELECT * FROM floatnotes WHERE guid = :guid"),
        note,
        that = this;
    statement.params.guid = note_guid;
    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                note = that.createNoteFromRow_(row);
            }
        },
        handleCompletion: function() {
            callback(note);
        }
    }); 
};

SQLiteDatabase.prototype.getAllIds = function(callback) {
    var statement = this.db_.createStatement("SELECT guid FROM floatnotes"),
        ids = [],
        that = this;
    LOG('Get all IDs');
    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                ids.push(row.getResultByName('guid')); 
            }
        },
        handleCompletion: function() {
            callback(ids);
        }
    }); 
};

SQLiteDatabase.prototype.createNoteFromRow_ = function(row) {
    var data = {
        x: row.getResultByName("x"),
        y: row.getResultByName("y"),
        id: row.getResultByName("id"),
        url: row.getResultByName("url"),
        protocol: row.getResultByName("protocol"),
        content: row.getResultByName("content"),
        w: row.getResultByName("w"),
        h: row.getResultByName("h"),
        status: row.getResultByName("status"),
        color: row.getResultByName("color"),
        guid: row.getResultByName('guid'),
        modification_date: new Date((+row.getResultByName('modification_date'))/1000),
        creation_date: new Date((+row.getResultByName('creation_date'))/1000)
    };

    return data;
};

SQLiteDatabase.prototype.backup = function() {
    var new_name = this.database_file.leafName + '.' + (new Date()).getTime() + '.bak';
    this.database_file.copyTo(null, new_name);
};
