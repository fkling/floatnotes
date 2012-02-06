//!#include "../header.js"
"use strict";

var EXPORTED_SYMBOLS = ['FloatNotesSQliteDatabase'];

function SQLiteDatabase(file) {
    this.setDatabase(file);
}

var FloatNotesSQLiteDatabase = SQLiteDatabase;

Util.Js.addSingletonGetter(SQLiteDatabase);

SQLiteDatabase.prototype.file_ = null;
SQLiteDatabase.prototype.db_ = null;


SQLiteDatabase.prototype.setDatabase = function(file) {
    if(!file) {
        file =  Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
        file.append('floatnotes.sqlite');
    }
    this.file_ = file;
    this.db_ = Cc["@mozilla.org/storage/service;1"].getService(Ci.mozIStorageService).openDatabase(this.file_);
    LOG(file + ' loaded');
};


SQLiteDatabase.prototype.createTables = function() {
    this._db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, protocol TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, status INTEGER, guid TEXT, creation_date DATETME, modification_date DATETIME)');
    this._db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
    this._db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS guid ON floatnotes (guid)');
};


SQLiteDatabase.prototype.clearTables = function() {
    this._db.executeSimpleSQL('DROP TABLE IF EXISTS floatnotes');
    this.createTables();
};


SQLiteDatabase.prototype.getURLs = function(callback) {
    var statement = this._db.createStatement("SELECT DISTINCT url FROM floatnotes ORDER BY url DESC");
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
    var statement = this._db.createStatement("SELECT * FROM floatnotes ORDER BY content DESC");
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

    var statement = this._db.createStatement("SELECT *, url || content AS uc FROM floatnotes WHERE " + ands.join(' AND ') + " ORDER BY content");
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
    var statement = this._db.createStatement("SELECT * FROM floatnotes WHERE url = :url ORDER BY y ASC"),
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
    var statement = this._db.createStatement(sql);
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
                var id = that._db.lastInsertRowID;
                LOG('INSERTED ID: ' + id);
                if(!guid) {
                    var statement = that._db.createStatement("SELECT guid FROM floatnotes WHERE id = :id");
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
    var statement = this._db.createStatement("UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, y=:y, status=:status, color=:color, url=:url, protocol=:protocol, modification_date=:modification_date WHERE guid = :guid");
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
    var statement = this._db.createStatement("DELETE FROM floatnotes WHERE guid = :guid");
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
    return this._db.executeSimpleSQL(statement);
};

SQLiteDatabase.prototype.noteExistsWithId = function(callback, note_guid) {
    var statement = this._db.createStatement("SELECT COUNT(*) as counter FROM floatnotes WHERE guid = :guid"),
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
    var statement = this._db.createStatement("SELECT * FROM floatnotes WHERE guid = :guid"),
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
    var statement = this._db.createStatement("SELECT guid FROM floatnotes"),
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
