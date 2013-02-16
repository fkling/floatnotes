//!#include "../header.js"
/*global Cu,Cc,Ci,Util,LOG,when*/
"use strict";

Cu['import']("resource://floatnotes/URLHandler.js");
Cu['import']("resource://floatnotes/SQLiteDatabase.js");
Cu['import']("resource://floatnotes/preferences.js");
/*global FloatNotesURLHandler, FloatNotesSQLiteDatabase, FloatNotesPreferences*/

var EXPORTED_SYMBOLS = ['FloatNotesManager'];

function FloatNotesManager(database) {
  this._db = database || FloatNotesSQLiteDatabase.getInstance();
  this._observerService = Cc["@mozilla.org/observer-service;1"]
    .getService(Ci.nsIObserverService);
}

// We only want one instance of this "class" at any time
Util.Js.addSingletonGetter(FloatNotesManager);

FloatNotesManager.prototype.getNote = function(guid) {
  return this._db.getNote(guid);
};


/**
 * Get all notes that are visible at this location.
 *
 * @param {string} location The URL to get the notes for.
 *
 * @return {when.Promise} A promise object to keep track of the process.
*/
FloatNotesManager.prototype.getNotesFor =  function(location) {
  LOG('Get notes for ' + location);
  return  this._db.getNotesForURLs(
    FloatNotesURLHandler.getSearchUrls(location)
  );
};


/**
 * Save the note.
 *
 * @param {Object} note_data Note data
 *
 * @return {when.Promise}
*/
FloatNotesManager.prototype.saveNote = function(note_data) {
  var method = typeof note_data.id === 'undefined' ? 'addNote' : 'updateNote';
  return this[method](note_data);
};


/**
 * Adds a new note to the DB
 *
 * @param {Object} note_data
 *
 * @return {when.Promise}
*/
FloatNotesManager.prototype.addNote = function(note_data) {
  LOG('Save note for the first time.');
  return this._db.createNoteAndGetId(note_data).then(function(ids) {
    LOG('Manager save note');
    note_data.guid = ids.guid;
    note_data.id = ids.id;
    this._observerService.notifyObservers(
      null,
      'floatnotes-note-add',
      ids.guid
    );

    return {'new': true, noteData: note_data};
  }.bind(this));
};


/**
 * Updates an existing note in the DB.
 *
 * @param {Object} note_data
 *
 * @return {when.Promise}
*/
FloatNotesManager.prototype.updateNote = function(note_data) {
  note_data.modification_date = new Date();
  
  return this._db.updateNote(note_data).then(function() {
    LOG('Update note in Manger');
    this._observerService.notifyObservers(
      null,
      'floatnotes-note-update',
      note_data.guid
    );

    return {'new': false, noteData: note_data};
  }.bind(this));
};


/**
 * Creates a new note with default values.
 *
 * @param {string} location URL of the document that creates the new note
 * @param {number} x position
 * @param {number} y position
 *
 * @return {Object}
*/
FloatNotesManager.prototype.createNote = function(location, x, y) {
  var domain = FloatNotesURLHandler.getDefaultUrl(location);
  var note = {
    x: x,
    y: y,
    w: FloatNotesPreferences.width,
    h: FloatNotesPreferences.height,
    content: "",
    url: domain,
    protocol: FloatNotesURLHandler.getProtocol(location),
    color: FloatNotesPreferences.color,
    status: 0
  };
  note.creation_date = note.modification_date = new Date();
  return note;
};

/**
 * Deletes the note with the given guid.
 *
 * @param {string} guid
 *
 * @return {when.Promise}
*/
FloatNotesManager.prototype.deleteNote = function(guid) {
  return this._db.deleteNote(guid).then(function() {
    this._observerService.notifyObservers(
      null,
      'floatnotes-note-delete',
      guid
    );
  }.bind(this));
};
