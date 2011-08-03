//!#include "../header.js"

var EXPORTED_SYMBOLS = ['DatabaseConnector'];

var DatabaseConnector = (function() {
    
    var connections = {};
    
    return function(database_file) {
    
		var default_file;

		if (Preferences.dropbox) {
			default_file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			default_file.initWithPath(Preferences.dropbox);
		} else {
			default_file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
			default_file.append("floatnotes.sqlite");
        }

        this.database_file = database_file || default_file;
        if(this.database_file in connections) {
            return connections[this.database_file];
        }

        connections[this.database_file] = this;

        var storageService = Cc["@mozilla.org/storage/service;1"] .getService(Ci.mozIStorageService);
        this._db = storageService.openDatabase(this.database_file);
    };
}());

DatabaseConnector.prototype = {

    createTables: function() {
        this._db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, protocol TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, status INTEGER, guid TEXT, creation_date DATETME, modification_date DATETIME)');
        this._db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
        this._db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS guid ON floatnotes (guid)');
    },

    clearTables: function() {
        this._db.executeSimpleSQL('DROP TABLE IF EXISTS floatnotes');
        this.createTables();
    },

    getURLs: function(runWhenFinished) {
        var statement = this._db.createStatement("SELECT DISTINCT url FROM floatnotes ORDER BY url DESC");
        var urls = [];
        statement.executeAsync({
            handleResult: function(aResultSet) {
                for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    urls.push(row.getResultByName('url'));
                }
            },
            handleCompletion: function() {
                runWhenFinished(urls);
            }
        });
    },

    getAllNotes: function(runWhenFinished) {
        var statement = this._db.createStatement("SELECT * FROM floatnotes ORDER BY content DESC");
        var notes = [];
        var that = this;
        statement.executeAsync({
            handleResult: function(aResultSet) {
                for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    notes.push(that._createNoteFromRow(row));
                }
            },
            handleCompletion: function() {
                runWhenFinished(notes);
            }
        });

    },

    getNotesContaining: function(wordList, runWhenFinished) {
        var that = this;
        var ands = [];
        for(var i = wordList.length; i--; ) {
            ands.push('uc LIKE :w' + i + " ESCAPE '~'");
        }

        var statement = this._db.createStatement("SELECT *, url || content AS uc FROM floatnotes WHERE " + ands.join(' AND ') + " ORDER BY content");
        for (var i = wordList.length; i--;) {
            statement.params['w' + i] =  '%' + statement.escapeStringForLIKE(wordList[i], "~") + '%';
            LOG('Include word: ' + statement.escapeStringForLIKE(wordList[i], "~"));
        }

        var notes = [];
        statement.executeAsync({
            handleResult: function(aResultSet) {
                for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    notes.push(that._createNoteFromRow(row));
                }
            },
            handleCompletion: function() {
                runWhenFinished(notes);
            }
        });

    },


    getNotesForURLs: function(urls, runOnFinished) {
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
                    var data = that._createNoteFromRow(row);
                    notes.push(data);
                }
            },
            handleCompletion: function() {
                runOnFinished(notes);
            }
        });
    },

    createNoteAndGetId: function(note, runWhenFinished) {
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

                    runWhenFinished(id, guid);
                }
            });
        }
        finally {
            statement.reset();
        }
    },

    updateNote: function(note, runWhenFinished) {
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
                    runWhenFinished();
                }
            });
        }
        finally {
            statement.reset();
        }
    },

    deleteNote: function(note_guid, runWhenFinished) {
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
                    runWhenFinished();
                }
            });
        }
        finally {
            statement.reset();
        }
    },

    executeSimpleSQL: function(statement) {
        return this._db.executeSimpleSQL(statement);
    },

    noteExistsWithId: function(runOnFinished, note_guid) {
        var statement = this._db.createStatement("SELECT COUNT(*) as counter FROM floatnotes WHERE guid = :guid");
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
                runOnFinished(count > 0);
            }
        });     
    },

    getNote: function(runOnFinished, note_guid) {
        LOG('Get note with GUID ' + note_guid)
        var statement = this._db.createStatement("SELECT * FROM floatnotes WHERE guid = :guid"),
            note,
            that = this;
        statement.params.guid = note_guid;
        statement.executeAsync({
            handleResult: function(aResultSet) {
                for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    note = that._createNoteFromRow(row);
                }
            },
            handleCompletion: function() {
                runOnFinished(note);
            }
        }); 
    },

    getAllIds: function(runOnFinished) {
        var statement = this._db.createStatement("SELECT guid FROM floatnotes"),
            ids = [],
            that = this;
        LOG('Get all IDs')
        statement.executeAsync({
            handleResult: function(aResultSet) {
                for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    ids.push(row.getResultByName('guid')); 
                }
            },
            handleCompletion: function() {
                runOnFinished(ids);
            }
        }); 
    },

    _createNoteFromRow: function(row) {
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
    },

    backup: function() {
        var new_name = this.database_file.leafName + '.' + (new Date()).getTime() + '.bak';
        this.database_file.copyTo(null, new_name);
    }
};
