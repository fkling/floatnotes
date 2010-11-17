//!#ifndef __INCLUDE_MANAGER_
//!#define __INCLUDE_MANAGER_

//!#include "../util.js"

Components.utils.import("resource://floatnotes/URLHandler.jsm");

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
        var domains = URLHandler.getSearchUrls(location);
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
        if(domainsToFetch.length > 0) {
            this._db.getNotesForURLs(domainsToFetch, function(notesdata) {
                LOG('Manager loaded from DB: ' + notesdata.length + ' notes');
                var notesByUrl = that.notesByUrl;

                for (var i = 0, length = notesdata.length; i < length;i++) {
                    var data = notesdata[i];

                    if(typeof notesByUrl[data.url] == "undefined") {
                        notesByUrl[data.url] = [];
                    }
                    notesByUrl[data.url].push(data);
                    that.notes[data.guid] = data;
                }

                cb(notesToReturn.concat(notesdata));
            });
        }
        else {
            LOG('Everything cached');
            cb(notesToReturn);
        }

    },

    saveNote: function(data, cb) {
        // new or update ?
        var ID = data.id;

        if(typeof ID == "undefined") {
            this.addNote(data, cb);
        }
        else {
            this.updateNote(data, cb);
        }		
    },

    addNote: function(data, cb) {
        var that = this;
        this._db.createNoteAndGetId(data, function(id, guid) {
            var domain = data.url;
            if(typeof that.notesByUrl[domain] == "undefined") {
                that.notesByUrl[domain] = [];
            }
            that.notesByUrl[domain].push(data);       
            that.notes[guid] = data;
            data.guid = guid
            data.id = id;
            that._observer_service.notifyObservers(null, 'floatnotes-note-add', guid);
            if(typeof cb == 'function') {
                cb(id, guid);
            }
        });
    },

    updateNote: function(data, cb) {
        var that = this;
        var note = data;
        var ID = data.guid;
        if(this.notes[ID]) {
            note = this.notes[ID];
            if(note != data) {
                util.updateObject(note, data);
            }
        }
        this._db.updateNote(note, function() {
            if(data._prevURL) {
                that.updateCacheForNewURL(note, data._prevURL, data.url);
                that._observer_service.notifyObservers(null, 'floatnotes-note-urlchange', note.guid);
            }
            that._observer_service.notifyObservers(null, 'floatnotes-note-update', note.guid);
            if(typeof cb == 'function') {
                cb(-1, note.guid);
            }
        });
    },

    updateCacheForNewURL: function(note, oldURL, newURL) {
        if(!this.notesByUrl[newURL]) {
            this.notesByUrl[newURL] = [];
        }
        this.notesByUrl[newURL].push(note);
        util.removeObjectFromArray(note, this.notesByUrl[oldURL]);
    },

    createNote: function(document) {
        var domain = URLHandler.getDefaultUrl(document.location);
        var data = {
            w: util.getPreferencesService().getIntPref('width'),
            h: util.getPreferencesService().getIntPref('height'),
            content: "",
            url: domain,
            color: util.getPreferencesService().getCharPref('color'),
            status: 0};

        return data;
    },

    deleteNote: function(data, cb) {
        var that = this;
        var note = data;
        var ID = data.guid;
        var cached = false;

        if(typeof cb != 'function') {
            cb = function(){};
        }


        if(typeof ID  != 'undefined' && this.notes[ID]) {
            note = this.notes[ID];
            cached = true;
        }

        this._db.deleteNote(ID, function() {
            that._observer_service.notifyObservers(null, 'floatnotes-note-delete', note.guid);
            if(cached) {
                util.removeObjectFromArray(note, that.notesByUrl[note.url]);
                delete that.notes[note.url];
            }
            cb();
        });
    },

    siteHasNotes: function(location) {
        var domains = URLHandler.getSearchUrls(location);
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
