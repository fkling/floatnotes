//!#include "../header.js"

var EXPORTED_SYMBOLS = ['getDatabase'];

var connections = {};

function getDatabase(file) {
    if(connections[file]) {
        return connections[file];
    }

    var default_file = Components.classes["@mozilla.org/file/directory_service;1"]  
    .getService(Components.interfaces.nsIProperties)  
    .get("ProfD", Components.interfaces.nsIFile);  
    default_file.append("floatnotes.sqlite");

    file = file || default_file;
    var connection = new DatabaseConnector(file);
    connections[file] = connection;
    return connection;
}



function DatabaseConnector(database_file) {
    var storageService = Components.classes["@mozilla.org/storage/service;1"]
    .getService(Components.interfaces.mozIStorageService);
    this._db = storageService.openDatabase(database_file);
}

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
        var sql = "INSERT INTO floatnotes (url,protocol,content,h,w,x,y,status,color,guid, modification_date, creation_date) VALUES (:url,:protocol,:content,:h,:w,:x,:y,:status,:color,:guid, :creation_date, :creation_date)";
        LOG('Note as guid:' + note.guid);
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

    noteExistsWithId: function(guid) {
        var statement = this._db.createStatement("SELECT COUNT(*) FROM floatnotes WHERE guid = :guid");
        statement.params.guid = guid;
        statement.executeStep();
        return !!parseInt(statement.row);
    },

    getNoteSync: function(guid) {
        var statement = this._db.createStatement("SELECT * FROM floatnotes WHERE guid = :guid");
        statement.params.guid = guid;
        statement.executeStep();
        return this._createNoteFromRow(statement.row); 
    },

    getAllIdsSync: function() {
        var statement = this._db.createStatement("SELECT guid FROM floatnotes");
        var ids = [];
        while(statement.executeStep()) {
            ids.push(statement.row.guid);
        }
        return ids;
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
    }
};
