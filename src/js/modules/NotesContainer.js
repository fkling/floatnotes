//!#include "../header.js"
/*global LOG, Util*/

"use strict";

var EXPORTED_SYMBOLS = ["FloatNotesNotesContainer"];

function NotesContainer(note_UI_factory) {
  this._noteUIFactory = note_UI_factory;
  this._notes = {};
  this._currentNotes = [];
}

NotesContainer.createInstance = function() {
  throw new Error('Implement this method');
};

var FloatNotesNotesContainer = NotesContainer;

NotesContainer.prototype._notes = null;
NotesContainer.prototype._currentNotes = [];
NotesContainer.prototype._newNote = null;

NotesContainer.prototype.setMainUI = function(mainUI) {
  this._mainUI = mainUI;
};

NotesContainer.prototype.getLength = function() {
  return this._currentNotes.length;
};

NotesContainer.prototype.getNotes = function() {
  return this._currentNotes;
};

NotesContainer.prototype.getCurrentDocument = function() {
  return this._mainUI.getCurrentDocument();
};

NotesContainer.prototype._createNoteInstance = function(note_data) {
  return this._noteUIFactory.createInstance(
    note_data,
    this,
    this.getCurrentDocument()
  );
};

/**
 * Creates a new note and attaches it to the document. The note is not insterted
 * into the DB yet.
 *
 * @param {Object} note_data Initial note data
 */
NotesContainer.prototype.addNewNote = function(note_data) {
  this._newNote = this._createNoteInstance(note_data);
  this._newNote.attachTo(
    this._getContainer()
  );
  this._newNote.raiseToTop();
  this._newNote.startEdit();
};


/**
 * Creates an UI for an existing note and adds it to the current document.
 *
 * @param {Object} note_data Note data
 */
NotesContainer.prototype.addNote = function(note_data) {
  LOG('Adding note' + JSON.stringify(note_data));
  var note = this._createNoteInstance(note_data);
  note.attachTo(this._getContainer());
  this._currentNotes.push(note);
  this._notes[note.getRef()] = note;
};


/**
 * Adds the given notes to the current document.
 *
 * @param {Object} notes_data Object of note data
 */
NotesContainer.prototype.addNotes = function(notes_data) {
  for (var guid in notes_data) {
    this.addNote(notes_data[guid]);
  }
};


/**
 * Sets the notes to be shown in the current document.
 *
 * If the document is not newely loaded (this method might be called on tab
 * activation, etc), it may be that the document already contains some notes.
 * In that case, existing notes can be reused (and get updated) and those
 * existing in the document but missing in the provided set must be removed.
 *
 * @param {Object} notes_data Object of note data
 */
NotesContainer.prototype.setNotes = function(notes_data) {
  var current_notes =
    this._getNotesForDocument(this.getCurrentDocument());
  var to_update = {};
  var to_add = {};
  this._currentNotes = [];

  // See which notes to update and which to add. The leftover notes must
  // be removed.
  for(var guid in notes_data) {
    var note = notes_data[guid];

    // Note exists, reuse note instance and update content, position, etc.
    if (guid in current_notes) {
      to_update[guid] = note;
      this._currentNotes.push(current_notes[guid]);
      // remove reference to only leave notes that should to be removed
      delete current_notes[guid];
    }
    else { // new note, add to document
      to_add[guid] = note;
    }
  }

  // Remaining notes must be removed
  var to_remove = current_notes;

  this.updateNotes(to_update);
  this.addNotes(to_add);
  this.detachNotes(to_remove);
};


/**
 * @param {Object} notes_data
 */
NotesContainer.prototype.updateNotes = function(notes_data){
  for (var i = 0, l = this._currentNotes.length; i < l; i++) {
    var note = this._currentNotes[i];
    var guid = note.getGuid();
    if (guid in notes_data) {
      note.update(notes_data[note.getGuid()]);
    }
  }
};


/**
 * @param {Object} notes_data Notes to be removed. If not provided, all current
 * notes are removed
 */
NotesContainer.prototype.detachNotes = function(notes_data){
  if (!notes_data) { // remove all notes of the current document
    for (var i = 0, l = this._currentNotes; i < l; i++) {
      var note = this._currentNotes[i];
      note.detach();
      delete this._notes[note.getRef()];
    }
    this._currentNotes.splice(0);
  }
  else {
    for (var guid in notes_data) {
      this.detachNote(guid);
    }
  }
};

/**
 * @param {string} guid Note to be removed
 */
NotesContainer.prototype.detachNote = function(guid) {
  var ref = this._getRefFor(guid);
  if (ref) {
    var note = this._notes[ref];
    note.detach();
    delete this._notes[ref];
    Util.Js.removeObjectFromArray(note, this._currentNotes);
  }
};

NotesContainer.prototype.persistNewNote = function(guid) {
  this._newNote.setGuid(guid);
  this._notes[this._newNote.getRef()] = this._newNote;
  this._currentNotes.push(this._newNote);
  this._newNote = null;
};

NotesContainer.prototype.saveNote = function(note_data) {
  return this._mainUI.saveNote(note_data).then(function(result) {
    if (result['new']) {
      this.persistNewNote(result.noteData.guid);
    }
    return result;
  }.bind(this));
};

NotesContainer.prototype.deleteNote = function(guid) {
  return this._mainUI.deleteNote(guid).then(function() {
    this.detachNote(guid);
  }.bind(this));
};

NotesContainer.prototype.showNotes = Util.Js.empty;
NotesContainer.prototype.hideNotes = Util.Js.empty;
NotesContainer.prototype.focusNote = Util.Js.empty;
NotesContainer.prototype.getNotesForDocument_ = Util.Js.empty;
