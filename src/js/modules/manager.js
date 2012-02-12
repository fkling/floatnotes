//!#include "../header.js"
"use strict";

Cu['import']("resource://floatnotes/URLHandler.js");
Cu['import']("resource://floatnotes/SQLiteDatabase.js");
Cu['import']("resource://floatnotes/preferences.js");
/*global URLHandler:true FloatNotesSQLiteDatabase:true, Preferences:true*/

var EXPORTED_SYMBOLS = ['FloatNotesManager'];

function FloatNotesManager(database) {
    this.db_ = database || FloatNotesSQLiteDatabase.getInstance();
    this.notesByUrl_ = {};
    this.notes_ = {};
    this.observerService_ =  Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
}

FloatNotesManager.prototype.db_ = null;
FloatNotesManager.prototype.notesByUrl_ = null;
FloatNotesManager.prototype.notes_ = null;
FloatNotesManager.prototype.observerService_ = null;

Util.Js.addSingletonGetter(FloatNotesManager);


FloatNotesManager.prototype.getNotes = function() {
    return this.notes_;
};

FloatNotesManager.prototype.getNotesFor =  function(location, cb) {
    LOG('Get notes for ' + location);

    var that = this;
    var domains = URLHandler.getSearchUrls(location);
    var domainsToFetch = [];
    var notesToReturn = [];

    for(var i = domains.length; i--; ) {
        var domain = domains[i];
        var notes = this.notesByUrl_[domain];
        if(!notes) {
            LOG('New to fetch: ' + domain);
            domainsToFetch.push(domain);
        }
        else {
            LOG('Chached for ' + domain + ': ' + notes.map(function(n){return n.guid;}).join(','));
            notesToReturn = notesToReturn.concat(notes); 
        }
    }
    if(domainsToFetch.length > 0) {
        this.db_.getNotesForURLs(domainsToFetch, function(notesdata) {
            LOG('Manager loaded from DB: ' + notesdata.length + ' notes');
            var notesByUrl = that.notesByUrl_;

            for (var i = 0, length = notesdata.length; i < length;i++) {
                var data = notesdata[i];

                if(typeof notesByUrl[data.url] == "undefined") {
                    notesByUrl[data.url] = [];
                }
                notesByUrl[data.url].push(data);
                that.notes_[data.guid] = data;
            }

            cb(notesToReturn.concat(notesdata));
        });
    }
    else {
        LOG('Everything cached');
        cb(notesToReturn);
    }

};

FloatNotesManager.prototype.saveNote = function(note, cb) {
    // new or update ?
    var ID = note.id;

    if(typeof ID == "undefined") {
        this.addNote(note, cb);
    }
    else {
        this.updateNote(note, cb);
    }		
};

FloatNotesManager.prototype.addNote = function(data, cb) {
    LOG('Save note for the first time.');
    var that = this;
    this.db_.createNoteAndGetId(data, function(id, guid) {
        var domain = data.url;
        if(typeof that.notesByUrl_[domain] == "undefined") {
            that.notesByUrl_[domain] = [];
        }
        that.notesByUrl_[domain].push(data);       
        that.notes_[guid] = data;
        data.guid = guid;
        data.id = id;
        that.observerService_.notifyObservers(null, 'floatnotes-note-add', guid);
        if(typeof cb == 'function') {
            cb(id, guid, data);
        }
    });
};

FloatNotesManager.prototype.updateNote = function(data, cb) {
    var that = this,
    note = data,
    ID = data.guid;

    if(this.notes_[ID]) { // checks whether the note is in the cache
        note = this.notes_[ID];
        LOG('Note url: ' + note.url + '| data url: ' + data.url);
        if(data.url !== note.url) {
            note._prevURL = note.url;
        }

        if(note != data) { // update note in the cache
            Util.Js.updateObject(note, data);
        }
    }

    note.modification_date = new Date();
    this.db_.updateNote(note, function() {
        if(note._prevURL) {
            that.updateCacheForNewURL(note, note._prevURL, note.url);
            that.observerService_.notifyObservers(null, 'floatnotes-note-urlchange', note.guid);
            note._prevURL = null;
        }
        that.observerService_.notifyObservers(null, 'floatnotes-note-update', note.guid);
        if(typeof cb == 'function') {
            cb(-1, note.guid, note);
        }
    });
};

FloatNotesManager.prototype.updateCacheForNewURL = function(note, oldURL, newURL) {
    if(!this.notesByUrl_[newURL]) {
        this.notesByUrl_[newURL] = [];
    }
    this.notesByUrl_[newURL].push(note);
    Util.Js.removeObjectFromArray(note, this.notesByUrl_[oldURL]);
    if(this.notesByUrl_[oldURL].length === 0) {
        delete this.notesByUrl_[oldURL];
    }
};

FloatNotesManager.prototype.createNote = function(document, x, y) {
    var domain = URLHandler.getDefaultUrl(document.location);
    var note = {
        x: x,
        y: y,
        w: Preferences.width,
        h: Preferences.height,
        content: "",
        url: domain,
        protocol: URLHandler.getProtocol(document.location),
        color: Preferences.color,
        status: 0};
        note.creation_date = note.modification_date = new Date();
        return note;
};

FloatNotesManager.prototype.deleteNote = function(data, cb) {
    var that = this;
    var note = data;
    var ID = data.guid;
    var cached = false;

    if(typeof cb != 'function') {
        cb = function(){};
    }


    if(typeof ID  != 'undefined' && this.notes_[ID]) {
        note = this.notes_[ID];
        cached = true;
    }

    this.db_.deleteNote(ID, function() {
        that.observerService_.notifyObservers(null, 'floatnotes-note-delete', note.guid);
        if(cached) {
            Util.Js.removeObjectFromArray(note, that.notesByUrl_[note.url]);
            delete that.notes_[note.url];
        }
        cb();
    });
};

FloatNotesManager.prototype.siteHasNotes = function(location) {
    var domains = URLHandler.getSearchUrls(location);
    for(var i = domains.length; i--; ) {
        var domain = domains[i];
        if( domain in this.notesByUrl_ && this.notesByUrl_[domain].length > 0) {
            return true;
        }  
    }
    return false;
};
