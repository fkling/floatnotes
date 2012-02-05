//!#include "../header.js"
"use strict";

var EXPORTED_SYMBOLS = ["FloatNotesNotesContainer"];

function NotesContainer() {
    this.notes_ = {};
    this.currentNotes_ = {};
}

var FloatNotesNotesContainer = NotesContainer;

NotesContainer.prototype.notes_ = null;
NotesContainer.prototype.currentNotes_ = null;
NotesContainer.prototype.currentNotesLength_ = 0;
NotesContainer.prototype.newNote_ = null;

NotesContainer.prototype.getLength = function() {
    return this.currentNotesLength_;
};

NotesContainer.prototype.setMainUI = function(main) {
    this.mainUI_ = main;
};

NotesContainer.prototype.createNote = function(noteData) {
    this.newNote_ = new this.noteUICls_(noteData, this.mainUI_);
    this.newNote_.attachTo(this.mainUI_.getCurrentDocument(), this.getContainer_());
    this.newNote_.raiseToTop();
    this.newNote_.startEdit();
};

NotesContainer.prototype.addNote = function(noteData) {
    var guid = noteData.guid,
        note = this.notes_[guid];
    if(!note) {
        this.notes_[guid] = note = new this.noteUICls_(noteData, this.mainUI_);
    }
    note.attachTo(this.mainUI_.getCurrentDocument(), this.getContainer_());
    if(!(guid in this.currentNotes_)) {
        this.currentNotes_[guid] = note;
        this.currentNotesLength_ += 1;
    }
};

NotesContainer.prototype.addNotes = function(noteDataArray) {
    for(var i = noteDataArray.length; i--; ) {
        this.addNote(noteDataArray[i]);
    }
};

NotesContainer.prototype.setNotes = function(noteDataArray) {
    LOG('notes to be added: ' + noteDataArray.map(function(n){ return n.guid; }).join(','));
    var gids = {};
    for(var i = noteDataArray.length; i--;) {
        gids[noteDataArray[i].guid] = true;
    }
    for(var id in this.currentNotes_) {
        var note = this.currentNotes_[id];
        if(this.currentNotes_.hasOwnProperty(id) && !(note.getGuid() in gids)) {
            this.detachNote(note.getNoteData());
        }
    }
    this.addNotes(noteDataArray);
};

NotesContainer.prototype.updateNote = function(guid){
    if(guid in this.currentNotes_) {
        this.currentNotes_[guid].redraw();
    }

};

NotesContainer.prototype.detachNote = function(guid){
    var note = this.currentNotes_[guid];
    if(note) {
        note.detach(this.mainUI_.getCurrentDocument());
        this.currentNotesLength_--;
        delete this.currentNotes_[guid];
    }

};

NotesContainer.prototype.detachNotes = function(noteDataArray){
    for(var i = noteDataArray.length; i--;) {
        this.detachNote(noteDataArray[i].guid);
    } 
};

NotesContainer.prototype.removeNote = function(guid){
    if(guid in this.notes_) {
        this.notes_[guid].detach();
        delete this.notes_[guid];

        if(guid in this.currentNotes_) {
            this.currentNotesLength_--;
            delete this.currentNotes_[guid];
        }
    }

};

NotesContainer.prototype.persistNewNote = function(guid) {
    AT(this.newNote_ && guid, "New note exists and has GUID");
    AT(this.newNote_.getGuid() === guid, "GUIDs match");
    this.notes_[guid] = this.currentNotes_[guid] = this.newNote_;
    this.currentNotesLength_++;
    this.newNote_ = null;
};

NotesContainer.prototype.updateUI = function() {};
NotesContainer.prototype.showNotes = function() {};
NotesContainer.prototype.hideNotes = function() {};
NotesContainer.prototype.focusNote = function() {};
