//!#include "../header.js"

EXPORTED_SYMBOLS = ["ContainerUIAPI"];

var ContainerUIAPI = {
    _notes: {},
    get length() {
        return this._currentNotesLength;
    },
    setMainUI: function(mainUI){
        this._mainUI = mainUI;
    },    
    createNote: function(note) {
       this._newNote =  new this._noteUICls(note, this._mainUI);
       this._newNote.attachTo(this._mainUI.currentDocument, this._container);
       this._newNote.raiseToTop();
       this._newNote.edit();
    },
    addNote: function(note){
        var noteUI = this._notes[note.guid];
        if(typeof noteUI === "undefined") {
            this._notes[note.guid] = noteUI = new this._noteUICls(note, this._mainUI);
        }
        noteUI.attachTo(this._mainUI.currentDocument, this._container);
        if(!(note.guid in this._currentNotes)) {
            this._currentNotes[note.guid] = noteUI;
            this._currentNotesLength++;
        }
        return noteUI;
    },
    addNotes: function(notes){
        for(var i = notes.length; i--; ) {
            this.addNote(notes[i]);
        }
    },
    setNotes: function(notes){
        var ids = {};
        for(var i = notes.length; i--;) {
            ids[notes[i].guid] = true;
        }
        for(var i in this._currentNotes) {
            var note = this._currentNotes[i];
            if(this._currentNotes.hasOwnProperty(i) && !(this._currentNotes[i].guid in ids)) {
                delete this._currentNotes[i];
                this._currentNotesLength--;
            }
        }
        this.addNotes(notes);
    },

    updateNote: function(noteId){
        if(noteId in this._notes) {
            this._notes[noteId].updateUI();
        }

    },
    detachNote: function(noteId){
        var noteUI = this._currentNotes[noteId];
        if(typeof noteUI !== "undefined") {
            noteUI.detach();
            this._currentNotesLength--;
            delete this._currentNotes[noteId];
        }

    },
    detachNotes: function(notes){
        for(var i = notes.length; i--;) {
            this.detachNote(notes[i]);
        } 
    },
    removeNote: function(noteId){
        this.detachNote(noteId);
        var noteUI = this._notes[noteId];
        if(typeof noteUI !== "undefined") {
            noteUI.detach();
            delete this._notes[noteId];
        }

    },
    persistNewNote: function(guid) {
        AT(this._newNote && guid, "New note exists and has GUID");
        AT(this._newNote.guid === guid, "GUIDs match")
        this._notes[guid] = this._currentNotes[guid] = this._newNote;
        this._currentNotesLength++;
        this._newNote = undefined;
    },
    updateUI: function(){},
    showNotes: function() {},
    hideNotes: function() {},
    focusNote: function() {},
};
