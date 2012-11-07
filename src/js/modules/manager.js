//!#include "../header.js"
/*global Cu,Cc,Ci,Util,LOG,when*/
"use strict";

Cu['import']("resource://floatnotes/URLHandler.js");
Cu['import']("resource://floatnotes/SQLiteDatabase.js");
Cu['import']("resource://floatnotes/preferences.js");
Cu['import']("resource://floatnotes/Cache.js");
/*global URLHandler, FloatNotesSQLiteDatabase, Preferences, FloatNotesCache*/

var EXPORTED_SYMBOLS = ['FloatNotesManager'];

function FloatNotesManager(database) {
  this._db = database || FloatNotesSQLiteDatabase.getInstance();
  this._notesByURL = new FloatNotesCache();
  this._notes = new FloatNotesCache();
  this._observerService = Cc["@mozilla.org/observer-service;1"]
    .getService(Ci.nsIObserverService);
}

// We only want one instance of this "class" at any time
Util.Js.addSingletonGetter(FloatNotesManager);

FloatNotesManager.prototype.getNote = function(guid) {
  return this._notes.get(guid);
};

FloatNotesManager.prototype.retainNote = function(guid) {
  return this._notes.retain(guid);
};

FloatNotesManager.prototype.releaseNote = function(guid) {
  return this._notes.release(guid);
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

  var self = this;
  var domains = URLHandler.getSearchUrls(location);
  var domains_to_fetch = [];
  var notes_to_return = [];

  for (var i = domains.length; i--; ) {
    var domain = domains[i];
    if (!this._notesByURL.has(domain)) {
      LOG('New to fetch: ' + domain);
      domains_to_fetch.push(domain);
      // retain domains here, even if no notes exist for them
      this._notesByURL.retain(domain, []);
    }
    else {
      LOG('Chached for ' + domain + ': ' +
        notes.map(function(n){return n.guid;}).join(','));
      notes_to_return = notes_to_return.concat(
        this._notesByURL.get(domain).map(function(guid) {
          return this._notes.retain(guid);
        }, this)
      );
    }
  }
  if (domains_to_fetch.length > 0) {
    return this._db.getNotesForURLs(domains_to_fetch)
      .then(function(notes_data) {
      LOG('Manager loaded from DB: ' + notes_data.length + ' notes');
      var notes_by_url = self._notesByUrl;
      var notes = self._notes;

      for (var i = 0, l = notes_data.length; i < l; i++) {
        var data = notes_data[i];

        // we already retained earlier
        notes_by_url.get(data.url).push(data.guid);
        notes.retain(data.guid, data);
      }

      return notes_to_return.concat(notes_data);
    });
  }
  else {
    LOG('Everything cached');
    return when.resolve(notes_to_return);
  }
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
  var self = this;
  return this.db_.createNoteAndGetId(note_data).then(function(ids) {
    var domain = note_data.url;
    self._notesByUrl.retain(domain, []).push(ids.guid);
    self._notes.retain(ids.guid, note_data);
    note_data.guid = ids.guid;
    note_data.id = ids.id;
    self.observerService_.notifyObservers(
      null,
      'floatnotes-note-add',
      ids.guid
    );

    return {id: ids.id, guid: ids.guid, note_data: note_data};
  });
};


/**
 * Updates an existing note in the DB.
 *
 * @param {Object} note_data
 *
 * @return {when.Promise}
*/
FloatNotesManager.prototype.updateNote = function(note_data) {
  var self = this;
  var ID = note_data.guid;

  if (this._notes.has(ID)) { // checks whether the note is in the cache
    var cached_note_data = this._notes.get(ID);
    LOG('Note url: ' + cached_note_data.url + '| data url: ' + note_data.url);

    if (note_data.url !== cached_note_data.url) {
      cached_note_data._prevURL = cached_note_data.url;
    }

    if (cached_note_data !== note_data) { // update note in the cache
      Util.Js.updateObject(cached_note_data, note_data);
      note_data = cached_note_data;
    }
  }

  note_data.modification_date = new Date();

  return this.db_.updateNote(note_data).then(function() {
    if(note_data._prevURL) {
      self.updateCacheForNewURL(
        note_data,
        note_data._prevURL,
        note_data.url
      );
      self.observerService_.notifyObservers(
        null,
        'floatnotes-note-urlchange',
        note_data.guid
      );
      delete note_data._prevURL;
    }
    self.observerService_.notifyObservers(
      null,
      'floatnotes-note-update',
      note_data.guid
    );

    return {id: -1, guid: note_data.guid, note_data: note_data};
  });
};

/**
 * Updates the cache accordingly when the URL of a note changes (i.e. the guid)
 * is moved from one array to another). The cache count is unmodified since
 * note visibility can only be "downwards" (still visible on the same page)
 *
 * @param {string} guid
 * @param {string} old_url
 * @param {string} new_url
*/
FloatNotesManager.prototype.updateCacheForNewURL = function(
  guid,
  old_url,
  new_url
) {
  // Always add to cache but only retain if it did not exist before
  // (because then this page already retained it)
  var notes = this._notesByURL.get(new_url, null);
  if (notes === null) { // did not exist yet
    notes = this._notesByURL.retain(new_url, []);
  }
  notes.push(guid);
  Util.Js.removeObjectFromArray(guid, this._notesByURL.get(old_url));
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
  var domain = URLHandler.getDefaultUrl(location);
  var note = {
    x: x,
    y: y,
    w: Preferences.width,
    h: Preferences.height,
    content: "",
    url: domain,
    protocol: URLHandler.getProtocol(location),
    color: Preferences.color,
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
  var self = this;
  var cached = this._notes.has(guid);

  return this.db_.deleteNote(guid, function() {
    self._observerService.notifyObservers(
      null,
      'floatnotes-note-delete',
      guid
    );
    if(cached) {
      var note = self._notes.get(guid);
      Util.Js.removeObjectFromArray(
        guid,
        self._notesByURL[note.url]
      );
      self._notes.remove(guid);
    }
  });
};


/**
 * Tests whether there are any cached notes for a given location.
 *
 * @param {string} location
 *
 * @return {boolean}
 */
FloatNotesManager.prototype.hasCachedNotes = function(location) {
  var domains = URLHandler.getSearchUrls(location);
  return domains.some(function(domain) {
    return this._notesByUrl.get(domain, []).length > 0;
  }, this);
};
