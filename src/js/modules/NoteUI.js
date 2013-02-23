//!#include "../header.js"
/*global Util, Cu, when, LOG*/
"use strict";
Cu['import']("resource://floatnotes/showdown/showdown.js");
/*global Showdown */

var EXPORTED_SYMBOLS = ["FloatNotesNoteUI"];

function NoteUI(note_data, container, document) {
  this._noteData = note_data;
  this._container = container;
  this._document = document;
  this._ref = NoteUI._ref++;
}

var FloatNotesNoteUI = NoteUI;

NoteUI.STATUS = {
  SAVED: 1,
  EDITING: 2,
  DRAGGING: 4,
  RESIZING: 8,
  NEEDS_SAVE: 16,
  MINIMIZED: 32,
  FIXED: 64,
  OVER: 128
};

NoteUI._ref = 1;

/**
 * @type object
 * @private
 */
NoteUI.prototype._noteData = null;
NoteUI.prototype._container = null;
NoteUI.prototype._markdownParser = new Showdown.converter();

NoteUI.prototype.getRef = function() {
  return this._ref;
};

NoteUI.prototype.getDocument = function() {
  return this._document;
};

NoteUI.prototype.getWindow = function() {
  return this._document.defaultView;
};

NoteUI.prototype.getGuid = function() {
  return this._noteData.guid;
};

NoteUI.prototype.setGuid = function(guid) {
  this._noteData.guid = guid;
};

NoteUI.prototype.getUrl = function() {
  return this._noteData.url;
};

NoteUI.prototype.setUrl = function(url) {
  var prev_url = this._noteData.url;
  if(this._saveIfChanged('url', url)) {
    this._noteData.prevUrl_ = prev_url;
  }
};

NoteUI.prototype.getColor = function() {
  return this._noteData.color;
};

NoteUI.prototype.setColor = function(color) {
  this._saveIfChanged('color', color);
};


NoteUI.prototype.getText = function() {
  return this._noteData.content;
};


NoteUI.prototype.setText = function(text) {
  this._saveIfChanged('content', text);
};


NoteUI.prototype.getTitle = function() {
  // first line of text is the title
  var text = this._noteData.content,
  index = text.indexOf('\n');

  return index > -1 ? text.substring(0, index) : text;
};

NoteUI.prototype.getNoteData = function() {
  return this._noteData;
};

NoteUI.prototype.isFixed = function() {
  return this.hasStatus(NoteUI.STATUS.FIXED);
};


NoteUI.prototype._saveIfChanged = function(property, value) {
  if(this._noteData[property] !== value) {
    this._noteData[property] = value;
    this.setStatus(NoteUI.STATUS.NEEDS_SAVE);
    return true;
  }
  return false;
};

NoteUI.prototype.attachTo = function(container) {
  this._attachTo(container);
  this.update();
};


NoteUI.prototype.detach = function(document) {
  this._detach(document);
};

NoteUI.prototype.updateStatus = function() {
  if(this.hasStatus(NoteUI.STATUS.MINIMIZED)) {
    this.minimize();
  }
  else {
    this.unminimize();
  }

  if(this.hasStatus(NoteUI.STATUS.FIXED)) {
    this.fix();
  }
  else {
    this.unfix();
  }

};

NoteUI.prototype.update = function(note_data) {
  // Don't make any changes if we are editing
  if (this.hasStatus(NoteUI.STATUS.EDITING)) {
    return;
  }
  if (note_data) {
    this._noteData = note_data;
  }
  this._update();
  this.updateStatus();
};


NoteUI.prototype.minimize = Util.Js.empty;
NoteUI.prototype.unminimize = Util.Js.empty;


NoteUI.prototype.minimizeAndSave = function() {
  if (!this.hasStatus(NoteUI.STATUS.MINIMIZED) &&
      !this.hasStatus(NoteUI.STATUS.EDITING)) {
    this.setStatus(NoteUI.STATUS.MINIMIZED);
    this.minimize();
    this.setSaveNeededAndSave_();
  }
};


NoteUI.prototype.unminimizeAndSave = function() {
  if (this.hasStatus(NoteUI.STATUS.MINIMIZED)) {
    this.unsetStatus(NoteUI.STATUS.MINIMIZED);
    this.unminimize();
    this.setSaveNeededAndSave_();
  }
};


NoteUI.prototype.fix = Util.Js.empty;


NoteUI.prototype.unfix = Util.Js.empty;


NoteUI.prototype.fixAndSave = function() {
  this.setStatus(NoteUI.STATUS.FIXED);
  this.setNewPosition_(this.calculateNewPosition_());
  this.fix();
  this.setSaveNeededAndSave_();
};


NoteUI.prototype.unfixAndSave = function() {
  this.unsetStatus(NoteUI.STATUS.FIXED);
  this.setNewPosition_(this.calculateNewPosition_());
  this.unfix();
  this.setSaveNeededAndSave_();
};


NoteUI.prototype.toggleFix = function() {
  if(this.hasStatus(NoteUI.STATUS.FIXED)) {
    this.unfixAndSave();
  }
  else {
    this.fixAndSave();
  }
};


NoteUI.prototype.updateLocation = function(location) {
  this.setUrl(location);
  this.setSaveNeededAndSave_();
};


NoteUI.prototype.setNewPosition_ = function(pos) {
  this._noteData.x = pos.x;
  this._noteData.y = pos.y;
};


NoteUI.prototype.setStatus = function(status) {
  if (!this.hasStatus(status)) {
    this._noteData.status |= status;
  }
};


NoteUI.prototype.unsetStatus = function(status) {
  if (this.hasStatus(status)) {
    this._noteData.status &= ~status;
  }
};


NoteUI.prototype.hasStatus = function(status) {
  return this._noteData.status & status;
};


NoteUI.prototype.setSaveNeededAndSave_ = function() {
  this.setStatus(NoteUI.STATUS.NEEDS_SAVE);
  this.save();
};

NoteUI.prototype.save = function() {
  if (!this.hasStatus(NoteUI.STATUS.EDITING) &&
      this.hasStatus(NoteUI.STATUS.NEEDS_SAVE)) {
    this.unsetStatus(NoteUI.STATUS.NEEDS_SAVE);
    var data = Util.Js.clone(this._noteData);
    // unset all status that should not be stored
    data.status &= ~(NoteUI.STATUS.RESIZING |
                     NoteUI.STATUS.DRAGGING |
                     NoteUI.STATUS.OVER |
                     NoteUI.STATUS.EDITING |
                     NoteUI.STATUS.SAVED
                    );
    return this._container.saveNote(data);
  }
  return when.defer().promise;
};

NoteUI.prototype.del = function() {
  return this._container.deleteNote(this.getGuid());
};

NoteUI.prototype.edit = Util.Js.empty;
NoteUI.prototype.move = Util.Js.empty;
NoteUI.prototype.resize = Util.Js.empty;
NoteUI.prototype.mouseenter = Util.Js.empty;
NoteUI.prototype.mouseleave = Util.Js.empty;
NoteUI.prototype.raiseToTop = Util.Js.empty;
NoteUI.prototype._onAfterSave = Util.Js.empty;


NoteUI.prototype.calculateNewPosition_ = function() {
  return {x: 0, y: 0};
}  ;
