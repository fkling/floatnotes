/*jshint browser:true, es5:true*/
/*global gBrowser,XULDocument*/
//!#include "header.js"
/*global Cu, LOG, Util, FloatNotesShared, when*/
Cu['import']('resource://floatnotes/URLHandler.js');
Cu['import']('resource://floatnotes/preferences.js');
Cu['import']('resource://floatnotes/Mediator.js');
Cu['import']('resource://floatnotes/LocationListBuilder.js');
Cu['import']('resource://floatnotes/CompatibilityTester.js');
/*global URLHandler, FloatNotesPreferences, FloatNotesMediator,
 FloatNotesLocationListBuilder, FloatNotesCompatibilityTester*/

function MainUI(note_manager, note_container) {
  "use strict";
  LOG('Create main UI');
  // Note container creates the DOM node and event handlers on each page
  this._noteContainer = note_container;
  this._noteContainer.setMainUI(this);
  // Note manager loads and saves notes from and to the DB
  this._notesManager = note_manager;
  this._status = {};
  this._notSupportedURLs = {};

  this._locationListBuilder = new FloatNotesLocationListBuilder(
    document.getElementById('floatnotes-edit-location-list')
  );

  // Broadcast elements for UI state
  this._broadcastElements = {
    toggleNote: document.getElementById('floatnotes-toggle-brdc'),
    editNote: document.getElementById('floatnotes-edit-brdc')
  };

  this._menuEntryElements = {
    menu: document.getElementById('floatnotes-menu'),
    newNote: document.getElementById('floatnotes-new-note'),
    deleteNote: document.getElementById('floatnotes-delete-note'),
    hideNotes: document.getElementById('floatnotes-hide-note')
  };

  this._toolbarButtonElement =
    document.getElementById('floatnotes-toolbar-button');
  this._popupElement = document.getElementById('floatnotes-edit-popup');

  this.onPreferenceChange('showMenu', FloatNotesPreferences.showMenu);

  this._isLocationListGenerated = false;
  FloatNotesMediator.setCurrentMainUI(this);
  this._registerEventHandlers();
  this._registerObserver();
}

MainUI.GLOBAL_NAME = 'gFloatNotesView';

MainUI.prototype._noteContainer = null;
MainUI.prototype._notesManager = null;
MainUI.prototype._status = null;
MainUI.prototype._menuEntryElements = null;
MainUI.prototype._broadcastElements = null;
MainUI.prototype._popupElement = null;
MainUI.prototype._toolbarButtonElement = null;
MainUI.prototype._locationListBuilder = null;

MainUI.prototype.getCurrentDocument = function() {
  "use strict";
  return gBrowser.contentDocument;
};

MainUI.prototype.getNoteContainer = function() {
  "use strict";
  return this._noteContainer;
};

MainUI.prototype.setContextNote = function(note_data) {
  "use strict";
  LOG('Context note set');
  this._contextNote = note_data;
};

MainUI.prototype._registerEventHandlers = function() {
  "use strict";
  LOG('Register event handlers');

  // attach load handler
  var event_handlers = [
    Util.Js.addEventListener(
      window,
      'activate',
      this._onWindowActivated.bind(this),
      true
    ),
    Util.Js.addEventListener(
      gBrowser,
      'pageshow',
      this._onPageLoad.bind(this),
      true
    ),
    Util.Js.addEventListener(
      gBrowser.tabContainer,
      'TabSelect',
      this._onTabSelect.bind(this),
      false
    ),
    Util.Js.addEventListener(
      gBrowser,
      'hashchange',
      this._onHashChange.bind(this),
      true
    ),
    Util.Js.addEventListener(
      window,
      'contextmenu',
      this._updateContext.bind(this),
      true
    ),
    Util.Js.addEventListener(
      window,
      'contextmenu',
      this._updateContextMenu.bind(this),
      false
    )
  ];

  // Bind logic to remove event handlers when the window closes
  window.addEventListener('unload', function handler() {
    event_handlers.forEach(function(remove) { remove(); });
    window.removeEventListener('unload', handler, false);
  }, false);
};

MainUI.prototype._registerObserver = function() {
  "use strict";
  LOG('Register observers');

  Util.Mozilla.registerObserver(this, 'floatnotes-note-edit');
  var self = this;
  // Unregister observer when window closes.
  window.addEventListener('unload', function remove(e){
    if (e.target instanceof XULDocument) {
      LOG('Observer removed.');
      window.removeEventListener('unload', remove, true);
      Util.Mozilla.removeObserver(self, 'floatnotes-note-edit');
    }
  }, true);

  FloatNotesPreferences.addObserver(this, 'showMenu', 'fontSize');
};

MainUI.prototype.observe = function(subject, topic, value) {
  "use strict";
  // value is either true (editing) or false (not editing)
  if (topic === 'floatnotes-note-edit') {
    var element = this._broadcastElements.editNote;
    element.setAttribute('disabled', value === 'true');
    element.setAttribute('hidden', value === 'true');
  }
};

MainUI.prototype.onPreferenceChange = function(pref, value) {
  "use strict";
  LOG('View: Preference ' + pref + ' changed: ' + value);
  if(pref === 'showMenu') {
    this._menuEntryElements.menu.hidden = !value;
  }
};

MainUI.prototype._onPageLoad = function(event) {
  "use strict";
  LOG('Page load detected');
  this._isLocationListGenerated = false;
  var page_window = event.originalTarget.defaultView;
  // Test whether the document that triggered the "load" event
  // is currently visible
  if (page_window.document === this.getCurrentDocument()) {
    this.loadNotes();
  }
};

MainUI.prototype._onTabSelect = function() {
  "use strict";
  var current_document = this.getCurrentDocument();
  if (current_document && current_document.readyState === 'complete') {
    LOG('Tab select deteted');
    this.loadNotes();
  }
};

MainUI.prototype._onWindowActivated = function() {
  "use strict";
  FloatNotesMediator.setCurrentMainUI(this);
  var currentDocument = this.getCurrentDocument();
  if (currentDocument && currentDocument.readyState === 'complete') {
    LOG('Activated window detected');
    this.loadNotes();
  }
};

MainUI.prototype._onHashChange = function() {
  "use strict";
  if (FloatNotesPreferences.updateOnHashChange) {
    this.reload();
  }
};

MainUI.prototype.reloadNotes = function(event) {
  "use strict";
  if (event) {
    event.stopPropagation();
  }
  this.loadNotes();
};

/**
 * Load and attach the notes
*/
MainUI.prototype.loadNotes = function() {
  "use strict";
  LOG('Note load requested...');
  this._isLocationListGenerated = false;
  var current_document = this.getCurrentDocument();
  FloatNotesCompatibilityTester.isCompatibleWith(current_document)
    .then(function() {
      LOG('Document is compatible... load notes');
      this._documentIncompatible = false;
      var URL = current_document.location;
      this._notesManager.getNotesFor(current_document.location).then(
        function(notes) {
          LOG(notes.length + ' notes retrieved');
          var notes_data = {};
          // TODO: Maybe the DB should return an object from the start?
          notes.forEach(function(note) {
            notes_data[note.guid] = note;
          });
          this._noteContainer.setNotes(notes_data);
          this._updateVisibility(URL);
          this._updateBroadcaster();
          if (FloatNotesShared.focusNote) {
            this._noteContainer.focusNote(FloatNotesShared.focusNote);
            FloatNotesShared.focusNote = null;
          }
        }.bind(this)
      );
    }.bind(this),
    function(msg) {
      LOG('Document not compatible: ' + msg);
      this._documentIncompatible = true;
      var location = current_document.location;
      var URL = location.protocol + '//' + location.host + location.pathname;
      if (
        current_document.location.href === 'about:newtab' ||
        URL in this._notSupportedURLs
      ) {
        return;
      }
      this._notSupportedURLs[URL] = true;
      this._showNotification(msg);
    }.bind(this)
   );
};

MainUI.prototype._showNotification = function(msg) {
  "use strict";
  if (FloatNotesPreferences.showSiteNotSupported === true) {
    Util.Dialog.showNotSupportedNotification(msg);
  }
};

MainUI.prototype._updateBroadcaster = function() {
  "use strict";
  this._broadcastElements.editNote.setAttribute('hidden', false);
  var text,
  toggleBroadcastElement = this._broadcastElements.toggleNote;

  if (this._notesHiddenFor(this.getCurrentDocument().location)) {
    text = Util.Locale.get(
      'showNotesString',
      [this._noteContainer.getLength()]
    );
    toggleBroadcastElement.setAttribute('label', text);
    toggleBroadcastElement.setAttribute('tooltiptext', text);
    toggleBroadcastElement.setAttribute('disabled', true);
    toggleBroadcastElement.setAttribute('hidden', true);
    toggleBroadcastElement.setAttribute(
      'image',
      'chrome://floatnotes/skin/note_dis_16.png'
    );
    toggleBroadcastElement.setAttribute('class', 'hidden');

    if (this._toolbarButtonElement) {
      Util.Css.addClass(this._toolbarButtonElement, 'hidden');
    }
  }
  else {
    text = Util.Locale.get('hideNotesString');
    toggleBroadcastElement.setAttribute('label', text);
    toggleBroadcastElement.setAttribute('tooltiptext', text);
    toggleBroadcastElement.setAttribute('disabled', false);
    toggleBroadcastElement.setAttribute('hidden', false);
    toggleBroadcastElement.setAttribute(
      'image',
      'chrome://floatnotes/skin/note_16.png'
    );
    toggleBroadcastElement.setAttribute('class', '');

    if (this._toolbarButtonElement) {
      Util.Css.removeClass(this._toolbarButtonElement, 'hidden');
    }
  }
};

MainUI.prototype.addNote = function() {
  "use strict";
  var note = this._notesManager.createNote(
    this.getCurrentDocument().location,
    this._X,
    this._Y
  );
  this._noteContainer.addNewNote(note);
};

MainUI.prototype.saveNote = function(noteData) {
  "use strict";
  FloatNotesMediator.observe(false);

  return this._notesManager.saveNote(noteData).then(function(result) {
    LOG('Main UI: Note saved');
    FloatNotesMediator.observe(true);
    return result;
  }.bind(this));
};

MainUI.prototype.deleteNote = function(guid) {
  "use strict";
  if (!guid && this._contextNote) {
    this._contextNote.del();
  }
  else if (guid) {
    var del = true;
    if (FloatNotesPreferences.confirmDelete) {
      del = Util.Dialog.confirmDeletion();
    }

    if (del) {
      FloatNotesMediator.observe(false);
      return this._notesManager.deleteNote(guid, function() {
        FloatNotesMediator.observe(true);
        if (this._contextNote) {
          this._contextNote = null;
        }
      }.bind(this));
    }
  }
  return when.defer().promise;
};

/* show or hide the notes for the current location */
MainUI.prototype.toggleNotes = function() {
  "use strict";
  var domain = this.getCurrentDocument().location;
  if (this._notesHiddenFor(domain)) {
    this._noteContainer.showNotes(); LOG('Nodes shown.');
  }
  else {
    this._noteContainer.hideNotes(); LOG('Nodes hidden.');
  }
  this._setNotesVisibilityForTo(domain, this._notesHiddenFor(domain));
  this._updateBroadcaster();
};

MainUI.prototype._updateVisibility = function(location) {
  "use strict";
  if (this._notesHiddenFor(location)) {
    this._noteContainer.hideNotes();
  }
  else {
    this._noteContainer.showNotes();
  }
};

MainUI.prototype._notesHiddenFor = function(location) {
  "use strict";
  return this._status[location] && !this._status[location].visible;
};

MainUI.prototype._setNotesVisibilityForTo = function(location, visible) {
  "use strict";
  if (!this._status[location]) {
    this._status[location] = {};
  }
  this._status[location].visible = visible;
};

MainUI.prototype._updateContext = function(event) {
  "use strict";
  LOG('Reset context');
  this._contextNote = null;
  this._X = event.pageX;
  this._Y = event.pageY;
};

MainUI.prototype._updateContextMenu = function() {
  "use strict";
  LOG('Context note is: ' + this._contextNote);
  var editNoteBroadcaster = this._broadcastElements.editNote;
  this._menuEntryElements.deleteNote.hidden =
    !this._contextNote ||
    editNoteBroadcaster.hidden ||
    !FloatNotesPreferences.showContextDelete;
  this._menuEntryElements.newNote.hidden =
    this._contextNote ||
    editNoteBroadcaster.hidden ||
    this._broadcastElements.toggleNote.hidden ||
    this._documentIncompatible;
  this._menuEntryElements.hideNotes.hidden =
    editNoteBroadcaster.hidden ||
    this._noteContainer.getLength() === 0 ||
    !FloatNotesPreferences.showContextHide;
};

MainUI.prototype.openEditPopup = function(note, anchor, cb) {
  "use strict";
  this._generateLocationList(note);
  document.getElementById('floatnotes-edit-color').color = note.getColor();
  this.saveChanges = function() {
    if (this._popupElement.state === 'closed') {
      LOG('Edit popup hidden');
      var item =
        document.getElementById('floatnotes-edit-location-list').selectedItem;
      var url = item ? item.value : '';
      cb(document.getElementById('floatnotes-edit-color').color, url);
    }
  };
  this._popupElement.openPopup(anchor, 'end_before', 0, 0, false, false);
};

MainUI.prototype._generateLocationList = function(note) {
  "use strict";
  if (this._isLocationListGenerated) {
    this._locationListBuilder.selectLocation(note.getUrl());
  }
  else {
    this._locationListBuilder.buildLocationList(
      this.getCurrentDocument().location, note.getUrl()
    );
    this._isLocationListGenerated = true;
  }
};

MainUI.prototype.openNotesManager = function(event) {
  "use strict";
  if (event) {
    event.stopPropagation();
  }
  if (!('notemanager' in FloatNotesShared) || FloatNotesShared.notemanager.closed) {
    FloatNotesShared.notemanager = window.open(
      'chrome://floatnotes/content/notelist.xul',
      'FloatNotes',
      'chrome,resizable,centerscreen'
    );
  }
  else {
    FloatNotesShared.notemanager.focus();
  }
};

MainUI.prototype.openPreferences = function(event) {
  "use strict";
  if (event) {
    event.stopPropagation();
  }
  if (!('preferences' in FloatNotesShared) || FloatNotesShared.preferences.closed) {
    FloatNotesShared.preferences = window.openDialog(
      'chrome://floatnotes/content/preferences.xul',
      'FloatNotes Preferences'
    );
  }
  else {
    FloatNotesShared.preferences.focus();
  }
};
