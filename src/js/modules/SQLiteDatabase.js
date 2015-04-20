//!#include "../header.js"
/*global LOG, Cu, Cc, Ci, Util, when, sprintf*/
"use strict";

Cu['import']("resource://floatnotes/preferences.js");
/*global FloatNotesPreferences:true*/

var EXPORTED_SYMBOLS = ['FloatNotesSQLiteDatabase'];

// Columns
var COLUMNS = {
  id: true,
  guid: true,
  url: true,
  protocol: true,
  content: true,
  h: true,
  w: true,
  x: true,
  y: true,
  status: true,
  color: true,
  modification_date: true,
  creation_date: true,
};

// SQL statements
var SELECT_NOTE = 'SELECT * FROM floatnotes WHERE guid = :guid';
var SELECT_URLS = 'SELECT DISTINCT url FROM floatnotes ORDER BY url DESC';
var SELECT_ALL = 'SELECT * FROM floatnotes ORDER BY content DESC';
var SELECT_CONTAINS =
    'SELECT *, url || content AS uc FROM floatnotes WHERE %s ORDER BY content';
var SELECT_FOR_URLS =
    "SELECT * FROM floatnotes WHERE url = :url ORDER BY y ASC";
var INSERT = 'INSERT INTO floatnotes (url,protocol,content,h,w,x,y,status,' +
             'color,guid, modification_date, creation_date) VALUES ' +
             '(:url,:protocol,:content,:h,:w,:x,:y,:status,:color,%s,' +
             ':modification_date,:creation_date)';
var UPDATE = 'UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, ' +
             'y=:y, status=:status, color=:color, url=:url, ' +
             'protocol=:protocol, modification_date=:modification_date ' +
             'WHERE guid = :guid';
var DELETE = 'DELETE FROM floatnotes WHERE guid = :guid';
var EXISTS = 'SELECT COUNT(*) as counter FROM floatnotes WHERE guid = :guid';

// Statment constants
var OK = 0;
var ERROR = 1;
var CANCELED = 2;


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
        if(FloatNotesPreferences.dbLocation === 0 || !FloatNotesPreferences.dbDir) {
            file = this.getDefaultStorageFile();
        }
        else {
            file = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
            file.initWithPath(FloatNotesPreferences.dbDir);
        }
    }
    LOG(file.path);
    this.file_ = file;
    this.db_ = Cc["@mozilla.org/storage/service;1"]
        .getService(Ci.mozIStorageService).openDatabase(this.file_);
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
SQLiteDatabase.prototype.merge = function(/*file*/) {

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
    var file =  Cc["@mozilla.org/file/directory_service;1"]
        .getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    file.append('floatnotes.sqlite');
    return file;
};


/**
 * Triggers the routines to create base database tables and indexes.
 */
SQLiteDatabase.prototype.createTables = function() {
    this.db_.executeSimpleSQL(
        'CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, ' +
        'url TEXT, protocol TEXT, content TEXT, x INTEGER, y INTEGER, ' +
        'w INTEGER, h INTEGER, color TEXT, status INTEGER, guid TEXT, ' +
        'creation_date DATETIME, modification_date DATETIME)');
    this.db_.executeSimpleSQL(
        'CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)'
    );
    this.db_.executeSimpleSQL(
        'CREATE INDEX IF NOT EXISTS guid ON floatnotes (guid)'
    );
};


/**
 * Discards existing tables and recreates them, effectivly deleting all exsting
 * notes.
 */
SQLiteDatabase.prototype.clearTables = function() {
    this.db_.executeSimpleSQL('DROP TABLE IF EXISTS floatnotes');
    this.createTables();
};


/**
 * Retrieves a list of all URLs in the DB.
 *
 * @return {when.Promise}
 */
SQLiteDatabase.prototype.getURLs = function() {
    var statement = this.createStatement_(SELECT_URLS);
    var urls = [];
    var deferred = when.defer();

    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow();
                 row;
                 row = aResultSet.getNextRow()) {
                urls.push(row.getResultByName('url'));
            }
        },
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve(urls);
            }
            else {
                deferred.reject(new Error('URLs could not be fetched'));
            }
        }
    });

    return deferred.promise;
};


/**
 * Get all notes in the database.
 *
 * @return {when.Promise}
 */
SQLiteDatabase.prototype.getAllNotes = function() {
    var statement = this.createStatement_(SELECT_ALL);
    var notes = [];
    var self = this;
    var deferred = when.defer();

    statement.executeAsync({
        handleResult: function(aResultSet) {
            for (var row = aResultSet.getNextRow();
                 row;
                 row = aResultSet.getNextRow()) {
                notes.push(self.createNoteFromRow_(row));
            }
        },
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve(notes);
            }
            else {
                deferred.reject(new Error('Could not retrieve notes'));
            }
        }
    });

    return deferred.promise;
};


/**
 * Gets all notes containing a words in `wordList`, either in the text or
 * in the URL.
 *
 * @param {Array.<string>} word_list A list of words to search for
 *
 * @return {when.promise}
 */
SQLiteDatabase.prototype.getNotesContaining = function(word_list) {
    var self = this;
    var ands = [];
    for (var i = word_list.length; i--; ) {
        ands.push('uc LIKE :w' + i + " ESCAPE '~'");
    }

    var statement = this.createStatement_(
        sprintf(SELECT_CONTAINS, ands.join(' AND '))
    );

    for (i = word_list.length; i--;) {
        statement.params['w' + i] =
            '%' + statement.escapeStringForLIKE(word_list[i], "~") + '%';
        LOG(
            sprintf(
                'Include word: %s',
                statement.escapeStringForLIKE(word_list[i], "~")
            )
        );
    }

    var notes = [];
    var deferred = when.defer();

    statement.executeAsync({
        handleResult: function(result_set) {
            for (var row = result_set.getNextRow();
                 row;
                 row = result_set.getNextRow()) {
                notes.push(self.createNoteFromRow_(row));
            }
        },
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve(notes);
            }
            else {
                deferred.reject(new Error('Could not load notes.'));
            }
        }
    });

    return deferred.promise;
};



/**
 * Retrieve all nodes for the list of URLs
 *
 * @param {Array.<string>} urls A list of URLs
 *
 * @return {when.Promise}
 */
SQLiteDatabase.prototype.getNotesForURLs = function(urls) {
    LOG('DB: load notes for urls ' + urls);
    var statement = this.createStatement_(SELECT_FOR_URLS);
    var params = statement.newBindingParamsArray();
    var notes = [];
    var self = this;

    for (var i in urls) {
        var bp = params.newBindingParams();
        bp.bindByName('url', urls[i]);
        params.addParams(bp);
    }
    statement.bindParameters(params);

    var deferred = when.defer();
    statement.executeAsync({
        handleResult: function(result_set) {
            for (var row = result_set.getNextRow();
                 row;
                 row = result_set.getNextRow()) {
                notes.push(self.createNoteFromRow_(row));
            }
        },
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve(notes);
            }
            else {
                deferred.reject(new Error('Could not load notes for URLs'));
            }
        }
    });

    return deferred.promise;
};


/**
 * Inserts either a newly created note or an existing, synchronized note.
 *
 * @param {Object} note Note data
 *
 * @return {when.Promise}
 */
SQLiteDatabase.prototype.createNoteAndGetId = function(note) {
    LOG('Note has guid:' + note.guid);
    var sql = sprintf(
        INSERT,
        note.guid ? ':guid' :  'hex(randomblob(16))'
    );
    LOG('Generated statment: ' + sql);
    var statement = this.createStatement_(sql, note);
    var self = this;
    var deferred = when.defer();
    statement.executeAsync({
        handleCompletion: function(reason) {
            if (reason === OK) {
                var guid = note.guid;
                var id = self.db_.lastInsertRowID;
                LOG('INSERTED ID: ' + id);
                // if this is a new note, we have to fetch the auto-
                // generated guid
                if(!guid) {
                    var statement = self.createStatement_(
                        "SELECT guid FROM floatnotes WHERE id = :id",
                        {id: id}
                    );
                    statement.executeStep();
                    guid = statement.row.guid;
                }
                deferred.resolve({id: id, guid: guid});
            }
            else {
                deferred.reject('Could not insert note');
            }
        }
    });

    return deferred.promise;
};


/**
 * Updates an exsting note in the DB
 *
 * @param {Object} note Note data
 *
 * @return {when.Promise}
 */
SQLiteDatabase.prototype.updateNote = function(note) {
    LOG('Update note ' + note.guid);
    var statement = this.createStatement_(UPDATE, note);
    var deferred = when.defer();
    statement.executeAsync({
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve();
            }
            else {
                deferred.reject('Could not upate note');
            }
        }
    });

    return deferred.promise;
};

/**
 * Deletes the note with the given ID.
 *
 * @param {string} guid
 *
 * @return {when.Promise}
 */
SQLiteDatabase.prototype.deleteNote = function(guid) {
    LOG('DB:DELETE note with GUID:' + guid);
    var statement = this.createStatement_(DELETE, {guid: guid});

    var deferred = when.defer();
    statement.executeAsync({
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve();
            }
            else {
                deferred.reject('Could not delete note.');
            }
        }
    });

    return deferred.promise;
};


/**
 * Convenience function to execute a simple SQL statemnt.
 *
 * @param {string} statement A string containing an SQL statement
 */
SQLiteDatabase.prototype.executeSimpleSQL = function(statement) {
    this.db_.executeSimpleSQL(statement);
};


/**
 * Tests whether a note with the provided ID exists.
 *
 * @param {string} guid
 *
 * @return {when.Promise}
 */
SQLiteDatabase.prototype.noteExistsWithId = function(guid) {
    var statement = this.createStatement_(EXISTS, {guid: guid}),
        count = 0,
        deferred = when.defer();

    statement.executeAsync({
        handleResult: function(result_set) {
            for (var row = result_set.getNextRow();
                 row;
                 row = result_set.getNextRow()) {
                count = row.getResultByName('counter');
                break;
            }
        },
        handleCompletion: function(result) {
            if (result === OK) {
                deferred.resolve(count > 0);
            }
            else {
                deferred.reject('Could not test existence.');
            }
        }
    });

    return deferred.promise;
};


/**
 * Gets the note with the given guid.
 *
 * @param {string} guid
 *
 * @return {when.Deferred}
 */
SQLiteDatabase.prototype.getNote = function(guid) {
    LOG('Get note with GUID ' + guid);
    var statement = this.createStatement_(SELECT_NOTE, {guid: guid});
    var note;
    var self = this;
    var deferred = when.defer();

    statement.executeAsync({
        handleResult: function(results) {
            for (var row = results.getNextRow();
                 row;
                 row = results.getNextRow()) {
                note = self.createNoteFromRow_(row);
            }
        },
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve(note);
            }
            else {
                deferred.reject('Could not load note.');
            }
        }
    });

    return deferred.promise;
};


/**
 * Gets the IDs of all notes in the DB
 *
 * @return {when.Deferred}
 */
SQLiteDatabase.prototype.getAllIds = function() {
    LOG('Get all IDs');
    var statement = this.createStatement_("SELECT guid FROM floatnotes");
    var ids = [];
    var deferred = when.defer();

    statement.executeAsync({
        handleResult: function(results) {
            for (var row = results.getNextRow();
                 row;
                 row = results.getNextRow()) {
                ids.push(row.getResultByName('guid'));
            }
        },
        handleCompletion: function(reason) {
            if (reason === OK) {
                deferred.resolve(ids);
            }
            else {
                deferred.reject('Could not load IDs.');
            }
        }
    });

    return deferred.promise;
};

/**
 * Creates a statement and optionally setting parameters.
 *
 * @param {string} sql
 * @param {Object} parameters
 * @return {Statement}
 */
SQLiteDatabase.prototype.createStatement_ = function(sql, parameters) {
  var statement = this.db_.createStatement(sql);
  if (parameters) {
    var params = statement.params;
    for (var param in params) {
      if (COLUMNS[param]) {
        // .valueOf solves a NS_UNEXPECTED_ERROR for Date values
        params[param] = parameters[param].valueOf();
      }
    }
  }
  return statement;
}


/**
 * Creates a note object from the row.
 *
 * @param {Object} row
 *
 * @return {Object}
 */
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
    modification_date: new Date(+row.getResultByName('modification_date')),
    creation_date: new Date(+row.getResultByName('creation_date'))
  };

  return data;
};


/**
 * Creates a backup of the DB by copying the DB file.
 */
SQLiteDatabase.prototype.backup = function(version) {
    var time = new Date();
    var new_name = sprintf(
        '%s_%s_%s_%s_%s.bak',
        this.file_.leafName,
        version,
        time.getFullYear(),
        time.getMonth() + 1,
        time.getDate()
    );
    this.file_.copyTo(null, new_name);
};
