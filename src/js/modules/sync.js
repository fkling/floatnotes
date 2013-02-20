//!#include "../header.js"
/*global LOG, Cu*/
"use strict";
LOG('Sync loading...');
var EXPORTED_SYMBOLS = [];
try {

    Cu['import']("resource://services-sync/main.js");
    Cu['import']("resource://services-sync/service.js");
    Cu['import']("resource://services-sync/engines.js");
    Cu['import']("resource://services-sync/record.js");
    Cu['import']("resource://services-sync/util.js");

    Cu['import']("resource://floatnotes/SQLiteDatabase.js");
    Cu['import']("resource://floatnotes/Manager.js");
    /*global FloatNotesSQLiteDatabase, FloatNotesManager, Utils, CryptoWrapper,
             Store, Tracker, Weave, Service*/

    // Since FF19, Weave does not exist anymore
    var SyncEngine = SyncEngine || Weave.SyncEngine;
    var startTracking = false;

    // These methods moved to `async.js`
    if(Utils.makeSyncCallback) {
        var Async = Utils;
    }
    else {
        try {
          Cu['import']("resource://services-common/async.js");
        }
        catch(e) {
          // If not found, try old location
          Cu['import']("resource://services-sync/async.js");
        }
    }

    var _db = FloatNotesSQLiteDatabase.getInstance();
    var _manager = FloatNotesManager.getInstance();

    EXPORTED_SYMBOLS = ['initSync'];
    var registered = false;
    var observe = true;

    var fields = ['guid', 'x', 'y', 'w', 'h', 'url', 'protocol', 'content',
      'color', 'status', 'modification_date', 'creation_date'];

    function NoteRecord(URI, data) {
        CryptoWrapper.call(this, URI);
        if (typeof data !== "undefined") {
            for(var property in data) {
                if(data.hasOwnProperty(property)) {
                    this[property] = data[property];
                }
            }
            LOG('Create record with id ' + data.guid);
            this.id = data.guid;
        }
    }

    NoteRecord.prototype = Object.create(CryptoWrapper.prototype);
    NoteRecord.prototype._logName = "Record.FloatNotes";
    Object.defineProperty(NoteRecord.prototype, 'note_data', {
      enumerable: true,
      get: function() {
          var obj = {};
          for(var i = fields.length; i--; ) {
              obj[fields[i]] = this[fields[i]];
          }
          obj.id = null;
          return obj;
      }
    });

    fields.forEach(function(prop) {
        var getter;
        if(prop == 'modification_date' || prop == 'creation_date') {
            getter = function() { 
              return new Date(this.cleartext[prop]);
            };
        }
        else {
            getter = function() {
              return this.cleartext[prop];
            };
        }

        Object.defineProperty(NoteRecord.prototype, prop, {
          enumerable: true,
          get: getter,
          set: function(value) { 
            this.cleartext[prop] = value;
          }
        });
    });


    function FloatNotesStore() {
        Store.apply(this, arguments);
    }

    FloatNotesStore.prototype = Object.create(Store.prototype);
    FloatNotesStore.prototype.itemExists = (function() {
      var scb = Async.makeSyncCallback();
      return function(id) {
        _db.noteExistsWithId(id).then(scb);
        return Async.waitForSyncCallback(scb);
      };
    }());

    FloatNotesStore.prototype.createRecord = (function() {
      var scb = Async.makeSyncCallback();
      return function(id, uri) {
        LOG('Create record for: ' + id);
        _db.getNote(id).then(scb);
        var data = Async.waitForSyncCallback(scb);
        var record = new NoteRecord(uri, data);
        LOG('This is what we get: ' + data);
        if(typeof data == 'undefined') {
          record.deleted = true;
        }
        return record;
      };
    }());

    FloatNotesStore.prototype.changeItemID  = function(oid, nid) {};

    FloatNotesStore.prototype.getAllIDs = (function() {
      var scb = Async.makeSyncCallback();
      return function() {
        _db.getAllIds().then(scb);
        var IDs = Async.waitForSyncCallback(scb);
        LOG('Number of notes ' + IDs.length);
        var obj = {};
        IDs.forEach(function(id) {
          obj[id] = 1;
        });
        return obj;
      };
    }());

    FloatNotesStore.prototype.create = function(record) {
      LOG('Sync: New note ' + record.id);
      observe = false;
      _manager.addNote(record.note_data).then(function() {
        observe = true;
      });
    };

    FloatNotesStore.prototype.update = function(record) {
      LOG('Sync: Update note ' + record.id);
      observe = false;
      _manager.updateNote(record.note_data).then(function() {
        observe = true;
      });
    };

    FloatNotesStore.prototype.remove = function(record) {
      LOG('Sync: Delete note ' + record.id);
      observe = false;
      _manager.deleteNote(record.id).then(function() {
        observe = true;
      });
    };

    FloatNotesStore.prototype.wipe = function() {
      _db.clearTables();
    };

    function FloatNotesTracker() {
        Tracker.apply(this, arguments);
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
          .getService(Components.interfaces.nsIObserverService);
        obsService.addObserver(this, "floatnotes-note-add", false);
        obsService.addObserver(this, "floatnotes-note-update", false);
        obsService.addObserver(this, "floatnotes-note-delete", false);
        this._enabled = true;
    }

    FloatNotesTracker.prototype = Object.create(Tracker.prototype);

    FloatNotesTracker.prototype._enabled = false;

    FloatNotesTracker.prototype.observe = function(subject, topic, data) {
      var score = 15, obsService;
      switch (topic) {
        case "weave:engine:start-tracking":
          if (!this._enabled) {
            LOG('sync starts tracking');
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
        case "floatnotes-note-delete":
          score = 50;
        case "floatnotes-note-update":
          score = 25;
          this.onChange(data, score);
          break;
      }
    };

    FloatNotesTracker.prototype.onChange = function(guid, score) {
      score = score || 15;
      if(observe) {
        LOG('Sync sees changes: ' + guid);
        this.addChangedID(guid);
        this.score += score;
      }
    };

    function FloatNotesEngine(service) {
        SyncEngine.call(this, "FloatNotes", service);
    }

    FloatNotesEngine.prototype = Object.create(SyncEngine.prototype);
    FloatNotesEngine.prototype._recordObj = NoteRecord;
    FloatNotesEngine.prototype._storeObj = FloatNotesStore;
    FloatNotesEngine.prototype._trackerObj = FloatNotesTracker;


    // migrate away from preferences
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch("services.sync.");
    var engines = branch.getCharPref('registerEngines');
    if(engines.indexOf('FloatNotes')  > -1) {
      engines = engines.split(',');
      engines.splice(engines.indexOf('FloatNotes'), 1);
      branch.setCharPref('registerEngines',engines.join(','));
    }

    var registered = false;
    var obsService = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
    // Register observers
    var observer = {
      observe: function(subject, topic, data) {
        if (topic === 'weave:service:ready') {
          if (!registered) {
            registered = true;
            LOG('Sync manager registered');
            var manager = Service.engineManager || Weave.Engines;
            manager.register(FloatNotesEngine);
          }
        }
        else if(topic === 'weave:engine:start-tracking') {
          LOG('saw tracking call');
          startTracking = true;
        }
      }
    };

    LOG('Register Sync observers');
    obsService.addObserver(observer, 'weave:service:ready', false);
    obsService.addObserver(observer, 'weave:engine:start-tracking', false);
}
catch(e) {
  Cu.reportError(e);
}
