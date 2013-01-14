//!#include "../header.js"
/*global LOG, Util, Cu*/
"use strict";

Cu['import']("resource://floatnotes/NotesContainer.js");
Cu['import']("resource://floatnotes/InPageNoteUI.js");
Cu['import']("resource://floatnotes/InPageIndicator.js");


/*global FloatNotesNotesContainer,
 FloatNotesInPageNoteUI, FloatNotesInPageIndicator */

var EXPORTED_SYMBOLS = ["FloatNotesInPageNotesContainer"];

// Some helper functions
var getRefFrom = function getNoteFrom(element) {
    var note_node = element;
    while (note_node && !note_node.classList.contains('floatnotes-note')) {
      note_node = note_node.parentNode;
      if (!note_node.classList) LOG(note_node.toString());
    }
    return note_node.getAttribute('data-ref');
};

var isIndicator = function isIndicator(element) {
  return Util.Css.isOrIsContained(element, 'floatnotes-indicator');
};

var isFixButton = function isFixButton(element) {
  return element.classList.contains('floatnotes-togglefix');
};

var isDeleteButton = function isDeleteButton(element) {
  return element.classList.contains('floatnotes-delete');
};

var isEditButton = function isEditButton(element) {
  return element.classList.contains('floatnotes-edit');
};

var isNote = function isNote(element) {
  return element.classList.contains('floatnotes-note');
};

var isContent = function isContent(element) {
  return Util.Css.isOrIsContained(element, 'floatnotes-content');
};

var isDragHandler = function isDragHandler(element) {
  return element.classList.contains('floatnotes-drag-handler') ||
    element.classList.contains('floatnotes-drag');
};

var isResizeHandler = function isResizeHandler(element) {
    return element.classList.contains('floatnotes-resize');
};


// Class
function InPageNotesContainer() {
  FloatNotesNotesContainer.call(this, FloatNotesInPageNoteUI);
  this._indicator = new FloatNotesInPageIndicator();
}

var FloatNotesInPageNotesContainer = InPageNotesContainer;

Util.Js.inherits(InPageNotesContainer, FloatNotesNotesContainer);

InPageNotesContainer.prototype._containerID = 'floatnotes-container';
InPageNotesContainer.prototype._indicator = null;


InPageNotesContainer.prototype._getContainer = function() {
  var document = this._mainUI.getCurrentDocument(),
  container = document.getElementById(this._containerID);

  if (!container) {
    container = this._createContainer(document);
    container.id = this._containerID;
    document.body.parentNode.appendChild(container);
  }
  return container;
};

InPageNotesContainer.prototype._createContainer = function(document) {
  var container = document.createElement('div');
  var self = this;
  var moving = false;
  var resizing = false;
  var options_open = false;

  // Handle the click event on each note
  container.addEventListener('click', function(event) {
    LOG('click');
    var target = event.target;
    if (!isIndicator(target)) {
      // must be a note then
      var ref = getRefFrom(target);
      var note = self._notes[ref] || self._newNote;
      if (isFixButton(target)) {
        event.stopPropagation();
        event.preventDefault();
        note.toggleFix(event);
      }
      else if (isDeleteButton(target)) {
        note.del();
      }
      else if (isEditButton(target)) {
        self._mainUI.openEditPopup(note, target, function(color, url) {
          note.setUrl(url || note.getUrl());
          note.setColor(color || note.getColor());
          note.save();
          note.update();
          options_open = false;
          note.mouseleave();
        });
        options_open = true;
      }
      else if (isNote(target) || isContent(target)) {
        note.unminimizeAndSave();
      }
    }
  }, true);

  container.addEventListener('dblclick', function(event) {
    var note;
    var target = event.target;
    if (isDragHandler(target)) {
      event.stopPropagation();
      note = self._notes[getRefFrom(target)] || self._newNote;
      note.minimizeAndSave();
    }
    else if (isContent(target) || target.nodeName !== 'A') {
      event.stopPropagation();
      note = self._notes[getRefFrom(target)] || self._newNote;
      if (!note.isValid()) {
        Util.Dialog.showTamperDetectionAlert();
        return;
      }
      note.startEdit();
    }
  }, true);

  container.addEventListener('mouseover', function(event) {
    if (!(moving || resizing || options_open)) {
      event.stopPropagation();
      var note = self._notes[getRefFrom(event.target)] || self._newNote;
      note.mouseenter();
    }
  }, false);

  container.addEventListener('mouseout', function(event) {
    if (!(moving || resizing || options_open)) {
      event.stopPropagation();
      var note = self._notes[getRefFrom(event.target)] || self._newNote;
      note.mouseleave();
    }
  }, false);

  container.addEventListener('mousedown', function(event) {
    LOG('mousedown');
    var target = event.target;
    if (!isIndicator(target)) {
      var note = self._notes[getRefFrom(target)] || self._newNote;
      note.raiseToTop();
      if (isDragHandler(target) || isResizeHandler(target)) {
        Util.Css.addClass(container, 'overlay');
        Util.Css.addClass(container, 'moving');
        Util.Css.css(container, {
          width: document.body.clientWidth + "px",
          height: document.body.clientHeight + "px"
        });
        if (isResizeHandler(target)) {
          resizing = true;
          LOG('Resize');
          note.startResize(event);
        }
        else {
          moving = true;
          note.startMove(event);
        }
      }
    }
  }, true);

  container.addEventListener('mouseup', function() {
    LOG('mouseup');
    moving = resizing = false;
    Util.Css.removeClass(container, 'moving');
    Util.Css.removeClass(container, 'overlay');
    Util.Css.css(container, {
      width: 0,
      height: 0
    });
  }, true);

  container.addEventListener('contextmenu', function(event) {
    var note = self._notes[getRefFrom(event.target)] || self._newNote;
    if (note) {
      self._mainUI.setContextNote(note);
    }
  }, true);

  return container;
};

InPageNotesContainer.prototype._getNotesForDocument = function(document) {
  var container = document.getElementById(this._containerID);
  var notes = {};
  if (!container) {
    return notes;
  }

  var note_elements = container.querySelectorAll('.floatnotes-note');

  if (note_elements.length === 0) {
    return notes;
  }

  for (var i = 0, l = note_elements.length; i < l; i++) {
    var ref = note_elements[i].getAttribute('data-ref');
    var note = this._notes[ref];
    notes[note.getGuid()] = note;
  }
  return notes;
};
   
InPageNotesContainer.prototype._getRefFor = function(guid) {
  for (var i = 0, l = this._currentNotes.length; i < l; i++) {
    if (this._currentNotes[i].getGuid() === guid) {
      return this._currentNotes[i].getRef();
    }
  }

  var notes_on_page = 
    this._getNotesForDocument(this._mainUI.getCurrentDocument());
  if (guid in notes_on_page) {
    return notes_on_page[guid].getRef();
  }
};

InPageNotesContainer.prototype.setNotes = function(notes) {
  this.__super__.prototype.setNotes.call(this, notes);
  this._indicator.setView(this);
  this._indicator.attachTo(
    this._mainUI.getCurrentDocument(),
    this._getContainer()
  );
};

InPageNotesContainer.prototype.showNotes = function() {
    Util.Css.css(this._getContainer(), 'display', '');
};

InPageNotesContainer.prototype.hideNotes = function() {
    Util.Css.css(this._getContainer(), 'display', 'none');
};

InPageNotesContainer.prototype.update = function(){
    LOG('UI updates');
    this._indicator.redraw();
    this._indicator.updateAndShow(
      this._mainUI.getCurrentDocument(),
      this._currentNotes
    );
};

InPageNotesContainer.prototype.focusNote = function(noteId) {
    var note = this._notes[noteId];
    if (note) {
        note.getElementNode().scrollIntoView(true);
    }
};
