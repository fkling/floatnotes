//!#include "util.js"

Components.utils.import("resource://services-sync/engines.js");
Components.utils.import("resource://services-sync/base_records/crypto.js");
Components.utils.import("resource://services-sync/stores.js");
Components.utils.import("resource://services-sync/trackers.js");

var EXPORTED_SYMBOLS = ['initSync'];
var registered = false;

function NoteRecord(URI, data) {
    CryptoWrapper.call(this, URI);
    if(typeof data != "undefined") {
        for(var property in data) {
            if(data.hasOwnProperty(property)) {
                this[property] = data[property];
            }
        }
        this.id = data.guid;
    }
}

NoteRecord.prototype = {
    __proto__: CryptoWrapper.prototype,
    _logName: "Record.FloatNotes",

    get id() {
        return this.cleartext.id;
    },
    set id(value) {
        this.cleartext.id = value;
    },
    get x() {
        return this.cleartext.x;
    },
    set x(value) {
        this.cleartext.x = value;
    },
    get y() {
        return this.cleartext.y;
    },
    set y(value) {
        this.cleartext.y = value;
    },
    get url() {
        return this.cleartext.url;
    },
    set url(value) {
        this.cleartext.url = value;
    },
    get content() {
        return this.cleartext.content;
    },
    set content(value) {
        this.cleartext.content = value;
    },
    get w() {
        return this.cleartext.w;
    },
    set w(value) {
        this.cleartext.w = value;
    },
    get h() {
        return this.cleartext.h;
    },
    set h(value) {
        this.cleartext.h = value;
    },
    get color() {
        return this.cleartext.color;
    },
    set color(value) {
        this.cleartext.color = value;
    },
    get status() {
        return this.cleartext.status;
    },
    set status(value) {
        this.cleartext.status = value;
    },
    get data() {
        var data = {
            'guid': this.id,
            'x': this.x,
            'y': this.y,
            'w': this.w,
            'h': this.h,
            'url': this.url,
            'content': this.content,
            'color': this.color,
            'status': this.status
        };
        return data;
    }
}

function FloatNotesStore(name) {
    Store.call(this, name);
    Components.utils.import("resource://floatnotes/database.jsm");
    Components.utils.import("resource://floatnotes/manager.jsm");
    this._db = getDatabase();
    this._manager = getManager(this._db);
}

FloatNotesStore.prototype = {
    __proto__: Store.prototype,

    itemExists: function(id) {
        return this._db.noteExistsWithId(id);
    },

    createRecord: function(id, uri) {
        return new NoteRecord(uri, this._db.getNoteSync(id));
    },
    
    changeItemID: function(oid, nid) {},

    getAllIDs: function() {
        return this._db.getAllIdsSync();
    },

    create: function(record) {
        this._manager.addNote(record.data);
    },

    update: function(record) {
        this._manager.updateNote(record.data);
    },

    delete: function(record) {
        this._manager.deleteNote(record.data);
    },

    wipe: function() {
        this._db.clearTables();
    }
}

function FloatNotesTracker(name) {
  Tracker.call(this, name);

  // Register yourself as event listener or observer for whatever
  // you want to track. Note that this may unnecessarily slow down
  // things for users who don't use Sync. It's a bit smarter to have
  // yourself notified when to start and stop tracking therefore:

  var obsService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);
        obsService.addObserver(this, "weave:engine:start-tracking", false);
        obsService.addObserver(this, "weave:engine:stop-tracking", false);


 }
 FloatNotesTracker.prototype = {
   __proto__: Tracker.prototype,

  _enabled: false,
  observe: function(subject, topic, data) {
    switch (topic) {
      case "weave:engine:start-tracking":
        if (!this._enabled) {
          var obsService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
            obsService.addObserver(this, "floatnotes-note-add", false);
            obsService.addObserver(this, "floatnotes-note-update", false);
            obsService.addObserver(this, "floatnotes-note-delete", false);

          this._enabled = true;
        }
        break;
      case "weave:engine:stop-tracking":
        if (this._enabled) {
          var obsService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
            obsService.removeObserver(this, "floatnotes-note-add");
            obsService.removeObserver(this, "floatnotes-note-update");
            obsService.removeObserver(this, "floatnotes-note-delete");
          this._enabled = false;
        }
        break;
        case "floatnotes-note-add":
        case "floatnotes-note-update":
        case "floatnotes-note-delete":
            this.onChange(data);
            break;
    }
   },

   onChange: function(guid) {
     this.addChangedID(guid);

     // Update the score as you see fit:
     this.score += 10;
   }
 };

function FloatNotesEngine() {
    SyncEngine.call(this, "FloatNotes");
    LOG('Sync: ' + this.name);
}
FloatNotesEngine.prototype = {
  __proto__: SyncEngine.prototype,
  _recordObj: NoteRecord,
  _storeObj: FloatNotesStore,
  _trackerObj: FloatNotesTracker
};
 

function initSync() {
    if(!registered) {
        Engines.register(FloatNotesEngine);
        //var prefService = Components.classes["@mozilla.org/preferences-service;1"]  
            //.getService(Components.interfaces.nsIPrefService);  
         //var branch = prefService.getBranch("services.sync.");
        //var engines = branch.getCharPref('registerEngines');
         //if(!(engines.indexOf('FloatNotes') >= 0)) {
            //branch.setCharPref('registerEngine',engines + ',FloatNotes');
         //}
         //registered = true;
    }
}
