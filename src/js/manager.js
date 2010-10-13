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
            var notes = this.notes[domain];
            if(!notes) {
                domainsToFetch.push(domain);
            }
            else {
                notesToReturn = notesToReturn.concat(notes); 
            }
        }

        this._db.getNotesForURLs(domainsToFetch, function(notesdata) {
            LOG('Manager loaded from DB: ' + notesdata.length + ' notes');
            var notes = that.notes;

            for (var i = 0, length = notesdata.length; i < length;i++) {
                var data = notesdata[i];

                if(typeof notes[data.url] == "undefined") {
                    notes[data.url] = [];
                }  					
                notes[data.url].push(data);
            }

            cb(notesToReturn.concat(notesdata));
        });

    },

    saveNote: function(note, cb) {
        var that = this;
        // new or update ?
        this.lastChangedNote = note;

        if(note._prevURL) {
            this.updateCacheForNewURL(note, note._prevURL, note.url);
            this._observer_service.notifyObservers(null, 'floatnotes-note-urlchange', note.id);
        }

        if(typeof note.id == "undefined") {
            this._db.createNoteAndGetId(note, function(id) {
                cb(id);
                that._observer_service.notifyObservers(null, 'floatnotes-note-add', id);
            });
        }
        else {
            this._db.updateNote(note, function() {
                that._observer_service.notifyObservers(null, 'floatnotes-note-update', note.id);
                cb() 
            });
        }		
    },

    updateCacheForNewURL: function(note, oldURL, newURL) {
        if(!this.notes[newURL]) {
            this.notes[newURL] = [];
        }
        this.notes[newURL].push(note);
        util.removeObjectFromArray(note, this.notes[oldURL]);
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

            if(typeof this.notes[domain] == "undefined") {
                this.notes[domain] = [];
            }
            this.notes[domain].push(data);       
            return data;
    },

    deleteNote: function(data, cb) {
        var that = this;
        this._db.deleteNote(data.id, function() {
            that._observer_service.notifyObservers(null, 'floatnotes-note-delete', data.id);
            util.removeObjectFromArray(data, that.notes[data.url]);
            cb();
        });
    },

    siteHasNotes: function(location) {
        var domains = util.getLocations(location);
        for(var i = domains.length -1; i > -1; --i) {
            var domain = domains[i];
            if( this.notes[domain] && this.notes[domain].length) {
                return true;
            }  
        }
        return false;
    }
};
//!#endif
