//!#include "../header.js"
/*jshint es5:true*/
"use strict";
LOG('Sync loading...');
var EXPORTED_SYMBOLS = [];
try {

    Cu['import']("resource://services-sync/main.js");
    Cu['import']("resource://services-sync/engines.js");
    Cu['import']("resource://services-sync/record.js");
    Cu['import']("resource://services-sync/util.js");

    Cu['import']("resource://floatnotes/SQLiteDatabase.js");
    Cu['import']("resource://floatnotes/manager.js");
    /*global FloatNotesSQLiteDatabase:true, FloatNotesManager:true, Utils:true, CryptoWrapper:true, Store:true, Tracker:true, Weave:true*/
    
    // These methods moved to `async.js`
    if(Utils.makeSyncCallback) {
        var Async = Utils;
    }
    else {
        Cu['import']("resource://services-sync/async.js");
    }
    

    var _db = FloatNotesSQLiteDatabase.getInstance();
    var _manager = FloatNotesManager.getInstance();

    EXPORTED_SYMBOLS = ['initSync'];
    var registered = false;
    var observe = true;

    var fields = ['guid', 'x', 'y', 'w', 'h', 'url', 'protocol', 'content', 'color', 'status', 'modification_date', 'creation_date'];

    function NoteRecord(URI, data) {
        CryptoWrapper.call(this, URI);
        if(typeof data != "undefined") {
            for(var property in data) {
                if(data.hasOwnProperty(property)) {
                    this[property] = data[property];
                }
            }
            LOG('Create record with id ' + data.guid);
            this.id = data.guid;
        }
    }

    NoteRecord.prototype = {
        __proto__: CryptoWrapper.prototype,
        _logName: "Record.FloatNotes",
        get note_data() {
            var obj = {};
            for(var i = fields.length; i--; ) {
                obj[fields[i]] = this[fields[i]];
            }
            obj.id = null;
            return obj;
        }
    };

    fields.forEach(function(prop) {
        if(prop == 'modification_date' || prop == 'creation_date') {
            NoteRecord.prototype.__defineGetter__(prop, function() { return new Date(this.cleartext[prop]);});
        }
        else {
            NoteRecord.prototype.__defineGetter__(prop, function() { return this.cleartext[prop];});
        }
        NoteRecord.prototype.__defineSetter__(prop, function(value) { this.cleartext[prop] = value;});
    });


    function FloatNotesStore(name) {
        Store.call(this, name);
    }

    FloatNotesStore.prototype = {
        __proto__: Store.prototype,

        itemExists: (function() {
            var scb = Async.makeSyncCallback();
            return function(id) {
                _db.noteExistsWithId(scb, id);
                return Async.waitForSyncCallback(scb);
            };
        }()),

        createRecord: (function() {
            var scb = Async.makeSyncCallback();
            return function(id, uri) {
                LOG('Create record for: ' + id);
                _db.getNote(scb, id);
                var data = Async.waitForSyncCallback(scb);
                var record = new NoteRecord(uri, data);
                LOG('This is what we get: ' + data);
                if(typeof data == 'undefined') {
                    record.deleted = true;
                }
                return record;
            };
        }()),

        changeItemID: function(oid, nid) {},

        getAllIDs: (function() {
            var scb = Async.makeSyncCallback();
            return function() {
                _db.getAllIds(scb);
                var IDs = Async.waitForSyncCallback(scb);
                LOG('Number of notes ' + IDs.length);
                var obj = {};
                IDs.forEach(function(id) {
                    obj[id] = 1;
                });
                return obj;
            };
        }()),

        create: function(record) {
            LOG('Sync: New note ' + record.id);
            observe = false;
            _manager.addNote(record.note_data, function() {
                observe = true;               
            });
        },

        update: function(record) {
            LOG('Sync: Update note ' + record.id);
            observe = false;
            _manager.updateNote(record.note_data, function() {
                observe = true;               
            });
        },

        remove: function(record) {
            LOG('Sync: Delete note ' + record.id);
            observe = false;
            _manager.deleteNote({guid: record.id}, function() {
                observe = true;               
            });
        },

        wipe: function() {
            _db.clearTables();
        }
    };

    function FloatNotesTracker(name) {
        Tracker.call(this, name);
        var obsService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        obsService.addObserver(this, "weave:engine:start-tracking", false);
        obsService.addObserver(this, "weave:engine:stop-tracking", false);
    }

    FloatNotesTracker.prototype = {
        __proto__: Tracker.prototype,

        _enabled: false,
        observe: function(subject, topic, data) {
            var score = 15, obsService;
            switch (topic) {
                case "weave:engine:start-tracking":
                    if (!this._enabled) {
                        LOG('sync about to register');
                        obsService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
                        obsService.addObserver(this, "floatnotes-note-add", false);
                        obsService.addObserver(this, "floatnotes-note-update", false);
                        obsService.addObserver(this, "floatnotes-note-delete", false);
                        this._enabled = true;
                    }
                break;
                case "weave:engine:stop-tracking":
                    if (this._enabled) {
                        obsService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
                        obsService.removeObserver(this, "floatnotes-note-add");
                        obsService.removeObserver(this, "floatnotes-note-update");
                        obsService.removeObserver(this, "floatnotes-note-delete");
                        this._enabled = false;
                    }
                break;
                case "floatnotes-note-add":
                    score = 100;
                case "floatnotes-note-update":
                    score = 25;
                case "floatnotes-note-delete":
                    score = 100;
                    this.onChange(data, score);
                break;
            }
        },

        onChange: function(guid, score) {
            score = score || 15;
            if(observe) {
                LOG('Sync sees changes: ' + guid);
                this.addChangedID(guid);
                this.score += score;
            }
        }
    };

    function FloatNotesEngine() {
        Weave.SyncEngine.call(this, "FloatNotes");
    }

    FloatNotesEngine.prototype = {
        __proto__: Weave.SyncEngine.prototype,
        _recordObj: NoteRecord,
        _storeObj: FloatNotesStore,
        _trackerObj: FloatNotesTracker
    };


    if(!registered) {
        Weave.FloatNotesEngine = FloatNotesEngine;
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);  
        var branch = prefService.getBranch("services.sync.");
        var engines = branch.getCharPref('registerEngines');
        if(engines.indexOf('FloatNotes')  < 0) {
            engines = engines.split(',');
            engines.push('FloatNotes');
            branch.setCharPref('registerEngines',engines.join(','));
        }
        registered = true;
        LOG('Sync manager registered');
    }
}
catch(e) {
    LOG(e);
}
