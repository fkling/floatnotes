//!#ifndef __INCLUDE_DB__
//!#define __INCLUDE_DB__

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
        this._db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, status INTEGER)');
        this._db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
    },

    getNotesForURLs: function(urls, runOnFinished) {
        var statement = this._db.createStatement("SELECT * FROM floatnotes WHERE url = :url ORDER BY y ASC"),
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
                        status: row.getResultByName("status"),
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
        var statement = this._db.createStatement("INSERT INTO floatnotes  (url, content, h, w, x, y, status, color) VALUES ( :url, :content, :h, :w, :x, :y, :status, :color)");

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
                    runWhenFinished(that._db.lastInsertRowID);
                }
            });
        }
        finally {
            statement.reset();
        }
    },

    updateNote: function(note, runWhenFinished) {
        var statement = this._db.createStatement("UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, y=:y, status=:status, color=:color, url=:url WHERE id = :id");

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

    deleteNote: function(note_id, runWhenFinished) {
        var statement = this._db.createStatement("DELETE FROM floatnotes WHERE id = :id");
        try {
            statement.params.id = note_id;
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
    }
};

//!#endif
