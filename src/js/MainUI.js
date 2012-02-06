//!#include "header.js"
/*jshint browser:true, es5:true*/
Cu['import']('resource://floatnotes/URLHandler.js');
Cu['import']('resource://floatnotes/preferences.js');
Cu['import']('resource://floatnotes/Mediator.js');
Cu['import']('resource://floatnotes/LocationListBuilder.js');
/*global URLHandler:true, Preferences:true, Mediator:true, FloatNotesLocationListBuilder:true*/

function MainUI(noteManager, noteContainer) {
    "use strict";
    this.noteContainer_ = noteContainer;
    this.noteContainer_.setMainUI(this);
    this.notesManager_ = noteManager;
    this.status_ = {};
    this.notes_ = {};
    this.currentNotes_ = [];

    this.scrollTimer_ = Util.Mozilla.getTimer();
    this.locationListBuilder_ = new FloatNotesLocationListBuilder(document.getElementById('floatnotes-edit-location-list'));

    // get references to UI items
    this.broadcastElements_ = {
        toggleNote: document.getElementById('floatnotes-toggle-brdc'),
        editNote: document.getElementById('floatnotes-edit-brdc')
    };

    this.menuEntryElements_ = {
        menu: document.getElementById('floatnotes-menu'),
        newNote:  document.getElementById('floatnotes-new-note'),
        deleteNote:  document.getElementById('floatnotes-delete-note'),
        hideNotes:  document.getElementById('floatnotes-hide-note')
    };

    this.toolbarButtonElement_ = document.getElementById('floatnotes-toolbar-button');
    this.popupElement_ = document.getElementById('floatnotes-edit-popup');

    this.onPreferenceChange('showMenu', Preferences.showMenu);

    this.isLocationListGenerated_ = false;
    Mediator.setCurrentWindow(this);
    this.registerEventHandlers_();
    this.registerObserver_();
}

MainUI.GLOBAL_NAME = 'gFloatNotesView';

MainUI.prototype.noteContainer_ = null;
MainUI.prototype.notesManager_ = null;
MainUI.prototype.status_ = null;
MainUI.prototype.notes_ = null;
MainUI.prototype.curentNotes_ = null;
MainUI.prototype.scrollTimer_ = null;
MainUI.prototype.menuEntryElements_ = null;
MainUI.prototype.broadcastElements_ = null;
MainUI.prototype.popupElement_ = null;
MainUI.prototype.toolbarButtonElement_ = null;
MainUI.prototype.locationListBuilder_ = null;

MainUI.prototype.getCurrentDocument = function() {
    "use strict";
    return gBrowser.contentDocument;
};

MainUI.prototype.getNoteContainer = function() {
    "use strict";
    return this.noteContainer_;
};

MainUI.prototype.setContextNote_ = function(noteData) {
    "use strict";
    this.contextNote_ = noteData;
};

MainUI.prototype.registerEventHandlers_ = function() {
    "use strict";
    // attach load handler
    var bind = Util.Js.bind;

    window.addEventListener('activate', bind(this.onWindowActivated_, this), true);
    gBrowser.addEventListener('pageshow', bind(this.onPageLoad_, this), true);
    gBrowser.tabContainer.addEventListener('TabSelect', bind(this.onTabSelect_, this), false);
    gBrowser.addEventListener('hashchange', bind(this.onHashChange_, this), true);
    window.addEventListener('contextmenu', bind(this.updateContext_, this), true);
    window.addEventListener('contextmenu', bind(this.updateContextMenu_, this), false);
};

MainUI.prototype.registerObserver_ = function() {
    "use strict";
    Util.Mozilla.registerObserver(this, 'floatnotes-note-edit');
    var self = this;
    function remove(e) {
        if (e.target instanceof XULDocument) {
            LOG('Observer removed.');
            window.removeEventListener('unload', remove, true);
            self.removeObserver();
        }
    }
    window.addEventListener('unload', remove, true);

    Preferences.addObserver(this, 'showMenu', 'fontSize');
};

MainUI.prototype.removeObserver = function() {
    "use strict";
    Util.Mozilla.removeObserver(this, 'floatnotes-note-edit');
};

MainUI.prototype.observe = function(subject, topic, value) {
    "use strict";
    if (topic === 'floatnotes-note-edit') {  // value is either true (editing) or false (not editing)
        var element = this.broadcastElements_.editNote;
        element.setAttribute('disabled', value === 'true');
        element.setAttribute('hidden', value === 'true');
    }
};

MainUI.prototype.onPreferenceChange = function(pref, value) { 
    "use strict";
    LOG('View: Preference ' + pref + ' changed: ' + value);
    if(pref === 'showMenu') {
        this.menuEntryElements_.menu.hidden = !value;
    }
};

MainUI.prototype.onPageLoad_ = function(event) {
    "use strict";
    this._isLocationListGenerated = false;
    var win = event.originalTarget.defaultView;
    var doc = win.document; // doc is document that triggered the "load" event
    var isFocusedDocument = (doc === this.getCurrentDocument());
    if (isFocusedDocument) {
        this.loadNotes();
    }
};

MainUI.prototype.onTabSelect_ = function(e) {
    "use strict";
    var currentDocument = this.getCurrentDocument();
    if (currentDocument && currentDocument.readyState === 'complete') {
        this.loadNotes();
    }
};

MainUI.prototype.onWindowActivated_ = function(e) {
    "use strict";
    Mediator.setCurrentWindow(this);
    var currentDocument = this.getCurrentDocument();
    if (currentDocument && currentDocument.readyState === 'complete') {
        this.loadNotes();
    }
};

MainUI.prototype.onHashChange_ = function(e) {
    "use strict";
    if (Preferences.updateOnHashChange) {
        this.reload();
    }
};

MainUI.prototype.reload = function(event) {
    "use strict";
    if (event) {
        event.stopPropagation();
    }
    this.loadNotes();
};

/**
       * Load and attach the notes
*/
MainUI.prototype.loadNotes = function(force) {
    "use strict";
    this.isLocationListGenerated_ = false;
    var doc = this.getCurrentDocument();
    var domain = doc.location;
    if (doc && doc.body) {
        // FloatNotes does not support pages with frames yet
        if (doc.querySelector('frameset')) {
            this.broadcastElements_.editNote.setAttribute('hidden', true);
            this.showNotification_(Util.Locale.get('location.frames_not_supported'));
            return false;
        }

        if (URLHandler.supports(domain)) {
            this.notesManager_.getNotesFor(domain, Util.Js.bind(function(notes) {
                this.noteContainer_.setNotes(notes);
                this.updateVisibility_(domain);
                this.updateBroadcaster_();
                if (Shared.focusNote) {
                    this.noteContainer_.focusNote(Shared.focusNote);
                    Shared.focusNote = null;
                }
                this.attachScrollHandlerTo_(doc);
                this.noteContainer_.redraw();
            }, this));
        }
        else {
            this.broadcastElements_.editNote.setAttribute('hidden', true);
            if (!URLHandler.isInternal(location)) {
                this.showNotification_(Util.Locale.get('location.protocol_not_supported', [domain.protocol]));
            }

        }
    }
};

MainUI.prototype.showNotification_ = function(msg) {
    "use strict";
    if (Preferences.showSiteNotSupported === true) {
        Util.Dialog.showNotSupportedNotification(msg);
    }
};

MainUI.prototype.updateBroadcaster_ = function() {
    "use strict";
    this.broadcastElements_.editNote.setAttribute('hidden', false);
    var text, 
        toggleBroadcastElement = this.broadcastElements_.toggleNote;

    if (this.notesHiddenFor_(this.getCurrentDocument().location)) {
        text = Util.Locale.get('showNotesString', [this.noteContainer_.getLength()]);
        toggleBroadcastElement.setAttribute('label', text);
        toggleBroadcastElement.setAttribute('tooltiptext', text);
        toggleBroadcastElement.setAttribute('disabled', true);
        toggleBroadcastElement.setAttribute('hidden', true);
        toggleBroadcastElement.setAttribute('image', 'chrome://floatnotes/skin/note_dis_16.png');
        toggleBroadcastElement.setAttribute('class', 'hidden');

        if (this.toolbarButtonElement_) {
            Util.Css.addClass(this.toolbarButtonElement_, 'hidden');
        }
    }
    else {
        text = Util.Locale.get('hideNotesString');
        toggleBroadcastElement.setAttribute('label', text);
        toggleBroadcastElement.setAttribute('tooltiptext', text);
        toggleBroadcastElement.setAttribute('disabled', false);
        toggleBroadcastElement.setAttribute('hidden', false);
        toggleBroadcastElement.setAttribute('image', 'chrome://floatnotes/skin/note_16.png');
        toggleBroadcastElement.setAttribute('class', '');

        if (this.toolbarButtonElement_) {
            Util.Css.removeClass(this.toolbarButtonElement_, 'hidden');
        }
    }

};

MainUI.prototype.attachScrollHandlerTo_ = function(doc) {
    "use strict";
    this.removeScrollHandler_(doc);

    var handler = Util.Js.bind(function() {
        this.startScrollTimeout_();
    }, this);

    doc.addEventListener('scroll', handler, false);

    this.removeScrollHandler_ = function() {
        doc.removeEventListener('scroll', handler, false);
        this.removeScrollHandler_ = Util.Js.empty;
    };
};

MainUI.prototype.removeScrollHandler_ = Util.Js.empty;

MainUI.prototype.startScrollTimeout_ = function() {
    "use strict";
    this.scrollTimer_.initWithCallback({
        notify: Util.Js.bind(this.noteContainer_.redraw, this.noteContainer_)
    }, Preferences.scrolltimer, this.scrollTimer_.TYPE_ONE_SHOT);
};

MainUI.prototype.addNote = function() {
    "use strict";
    var note = this.notesManager_.createNote(this.getCurrentDocument(), this.X_, this.Y_);
    this.noteContainer_.createNote(note);
};

MainUI.prototype.saveNote = function(noteData, cb) {
    "use strict";
    Mediator.observe(false);
    noteData.protocol = URLHandler.getProtocol(this.getCurrentDocument().location);
    this.notesManager_.saveNote(noteData, Util.Js.bind(function(id, guid) {
        if (id > -1) {
            this.noteContainer_.persistNewNote(guid);
        }
        Mediator.observe(true);
        cb(id, guid);
    }, this));
};

MainUI.prototype.deleteNote = function(noteData) {
    "use strict";
    noteData = noteData || this.contextNote_;
    if (noteData) {
        var del = true;
        if (Preferences.confirmDelete) {
            del = Util.Dialog.confirmDeletion();
        }

        if (del) {
            Mediator.observe(false);
            this.notesManager_.deleteNote(noteData, Util.Js.bind(function() {
                this.noteContainer_.removeNote(noteData.guid);
                this.contextNote_ = null;
                Mediator.observe(true);
            }, this));
        }
    }
};

/* show or hide the notes for the current location */
MainUI.prototype.toggleNotes = function(element) {
    "use strict";
    var domain = this.getCurrentDocument().location;
    if (this.notesHiddenFor_(domain)) {
        this.noteContainer_.showNotes(); LOG('Nodes shown.');
        this.noteContainer_.redraw();
    }
    else {
        this.noteContainer_.hideNotes(); LOG('Nodes hidden.');
    }
    this.setNotesVisibilityForTo_(domain, this.notesHiddenFor_(domain));
    this.updateBroadcaster_();
};

MainUI.prototype.updateVisibility_ = function(location) {
    "use strict";
    if (this.notesHiddenFor_(location)) {
        this.noteContainer_.hideNotes();
    }
    else {
        this.noteContainer_.showNotes();
    }
};

MainUI.prototype.notesHiddenFor_ = function(location) {
    "use strict";
    return this.status_[location] && !this.status_[location].visible;
};

MainUI.prototype.setNotesVisibilityForTo_ = function(location, visible) {
    "use strict";
    if (!this.status_[location]) {
        this.status_[location] = {};
    }
    this.status_[location].visible = visible;
};

MainUI.prototype.updateContext_ = function(event) {
    "use strict";
    this.contextNote_ = null;
    this.X_ = event.pageX;
    this.Y_ = event.pageY;
};

MainUI.prototype.updateContextMenu_ = function(event) {
    "use strict";
    LOG('Context note is: ' + this.contextNote_);
    var editNoteBroadcaster = this.broadcastElements_.editNote;
    this.menuEntryElements_.deleteNote.hidden = !this.contextNote_ || editNoteBroadcaster.hidden || !Preferences.showContextDelete;
    this.menuEntryElements_.newNote.hidden = this.contextNote_ || editNoteBroadcaster.hidden || this.broadcastElements_.toggleNote.hidden;
    this.menuEntryElements_.hideNotes.hidden = editNoteBroadcaster.hidden || this.noteContainer_.getLength() === 0 || !Preferences.showContextHide;
};

MainUI.prototype.openEditPopup = function(note, anchor, cb) {
    "use strict";
    this.generateLocationList_(note);
    document.getElementById('floatnotes-edit-color').color = note.getColor();
    this.saveChanges = function() {
        if (this.popupElement_.state == 'closed') {
            LOG('Edit popup hidden');
            var item = document.getElementById('floatnotes-edit-location-list').selectedItem;
            var url = item ? item.value : '';
            cb(document.getElementById('floatnotes-edit-color').color, url);
        }
    };
    this.popupElement_.openPopup(anchor, 'end_before', 0, 0, false, false);
};

MainUI.prototype.generateLocationList_ = function(note) {
    "use strict";
    if (this.isLocationListGenerated_) {
        this.locationListBuilder_.updateSelectedElement(note.getUrl());
    }
    else {
        this.locationListBuilder_.buildLocationList(this.getCurrentDocument().location, note.getUrl());
        this.isLocationListGenerated_ = true;
    }
};

MainUI.prototype.openNotesManager = function(event) {
    "use strict";
    if (event) {
        event.stopPropagation();
    }
    if (!('notemanager' in Shared) || Shared.notemanager.closed) {
        Shared.notemanager = window.open('chrome://floatnotes/content/notelist.xul', 'FloatNotes', 'chrome,resizable,centerscreen');
    }
    else {
        Shared.notemanager.focus();
    }
};

MainUI.prototype.openPreferences = function(event) {
    "use strict";
    if (event) {
        event.stopPropagation();
    }
    if (!('preferences' in Shared) || Shared.preferences.closed) {
        Shared.preferences = window.openDialog('chrome://floatnotes/content/preferences.xul', 'FloatNotes Preferences');
    }
    else {
        Shared.preferences.focus();
    }
};
