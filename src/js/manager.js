//!#ifndef __INCLUDE_MANAGER_
//!#define __INCLUDE_MANAGER_

//!#include "util.js"

var EXPORTED_SYMBOLS = ['getManager'];

var manager = null;

function getManager(db) {
    if(manager === null) {
        manager = new FloatNotesManager(db);
    }
    return manager;
}


function FloatNotesManager(database) {
    this._db = database;
    this.notesByUrl = {};
    this.notes = {};
    this._observer_service = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
}

/**
 * FloatNotes global object prototype. Contains all the functions to load,
 * add, delete and save the notes.
 * 
*/
FloatNotesManager.prototype = {

    /**
      * Load and attach the notes
      */

    getNotesFor: function(location, cb) {
        LOG('Get notes for ' + location);
        // don't load stuff for about pages
        var ignoredURLs = {'about:': 1, 'chrome:': 1, 'resource:': 1};
        if(ignoredURLs[location.protocol]) {
            cb([]);
        }

        var that = this;
        var domains = util.getLocations(location);
        var domainsToFetch = [];
        var notesToReturn = [];

        for(var i = domains.length -1; i > -1; --i) {
            var domain = domains[i];
            LOG('Check ' + domain);
            var notes = this.notesByUrl[domain];
            if(!notes) {
                domainsToFetch.push(domain);
            }
            else {
                notesToReturn = notesToReturn.concat(notes); 
            }
        }

        this._db.getNotesForURLs(domainsToFetch, function(notesdata) {
            LOG('Manager loaded from DB: ' + notesdata.length + ' notes');
            var notesByUrl = that.notesByUrl;

            for (var i = 0, length = notesdata.length; i < length;i++) {
                var data = notesdata[i];

                if(typeof notesByUrl[data.url] == "undefined") {
                    notesByUrl[data.url] = [];
                }
                notesByUrl[data.url].push(data);
                that.notes[data.id] = data;
            }

            cb(notesToReturn.concat(notesdata));
        });

    },

    saveNote: function(data, cb) {
        var that = this;
        // new or update ?
        var note = data;
        var ID = data.id;

        if(typeof ID  != 'undefined' && this.notes[ID]) {
            note = this.notes[ID];
            if(note != data) {
                util.updateObject(note, data);
            }
        }

        this.lastChangedNote = note;

        if(data._prevURL) {
            this.updateCacheForNewURL(note, data._prevURL, data.url);
            this._observer_service.notifyObservers(null, 'floatnotes-note-urlchange', note.id);
        }

        if(typeof ID == "undefined") {
            this._db.createNoteAndGetId(note, function(id) {
                that.notes[id] = note;
                cb(id);
                that._observer_service.notifyObservers(null, 'floatnotes-note-add', id);
            });
        }
        else {
            this._db.updateNote(note, function() {
                that._observer_service.notifyObservers(null, 'floatnotes-note-update', note.id);
                cb(); 
            });
        }		
    },

    updateCacheForNewURL: function(note, oldURL, newURL) {
        if(!this.notesByUrl[newURL]) {
            this.notesByUrl[newURL] = [];
        }
        this.notesByUrl[newURL].push(note);
        util.removeObjectFromArray(note, this.notesByUrl[oldURL]);
    },

    createNote: function(document) {
        var domain = util.getDefaultUrl(document);
        var data = {
            w: util.getPreferencesService().getIntPref('width'),
            h: util.getPreferencesService().getIntPref('height'),
            content: "",
            url: domain,
            color: util.getPreferencesService().getCharPref('color'),
            status: 0};

        if(typeof this.notesByUrl[domain] == "undefined") {
            this.notesByUrl[domain] = [];
        }
        this.notesByUrl[domain].push(data);       
        return data;
    },

    deleteNote: function(data, cb) {
        var that = this;
        var note = data;
        var ID = data.id;
        var cached = false;

        if(typeof ID  != 'undefined' && this.notes[ID]) {
            note = this.notes[ID];
            cached = true;
        }

        this._db.deleteNote(note.id, function() {
            that._observer_service.notifyObservers(null, 'floatnotes-note-delete', note.id);
            if(cached) {
                util.removeObjectFromArray(note, that.notesByUrl[note.url]);
                delete that.notes[note.url];
            }
            cb();
        });
    },

    siteHasNotes: function(location) {
        var domains = util.getLocations(location);
        for(var i = domains.length -1; i > -1; --i) {
            var domain = domains[i];
            if( this.notesByUrl[domain] && this.notesByUrl[domain].length) {
                return true;
            }  
        }
        return false;
    }
};
//!#endif
