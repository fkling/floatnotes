//!#include "../header.js"
"use strict";
Cu['import']("resource://floatnotes/showdown/showdown.js");

/*global Showdown: true */

var EXPORTED_SYMBOLS = ["FloatNotesNoteUI"];

function NoteUI(noteData, view) {
    this.noteData_ = noteData;
    this.view_ = view;
}

var FloatNotesNoteUI = NoteUI; 

NoteUI.STATUS = {
    SAVED: 1,
    EDITING: 2,
    DRAGGING: 4,
    RESIZING: 8,
    NEEDS_SAVE: 16,
    MINIMIZED: 32,
    FIXED: 64
};


/**
 * @type object
 * @private
 */
NoteUI.prototype.noteData_ = null;

NoteUI.prototype.view_ = null;

NoteUI.prototype.markdownParser_ = new Showdown.converter();


NoteUI.prototype.getDocument_ = function() {
    return this.view_ && this.view_.currentDocument;
};

NoteUI.prototype.getWindow_ = function() {
    return this.view_.currentDocument.defaultView;
};

NoteUI.prototype.getGuid = function() {
    return this.noteData_.guid;
};


NoteUI.prototype.getUrl = function() {
    return this.noteData_.url;
};


NoteUI.prototype.setUrl = function(url) {
    if(this.saveIfChanged_('url', url)) {
        this.noteData_.prevUrl_ = this.noteData_.url;
    }
};


NoteUI.prototype.getColor = function() {
    return this.noteData_.color;
};


NoteUI.prototype.setColor = function(color) {
    this.saveIfChanged_('color', color);    
};


NoteUI.prototype.getText = function() {
    return this.noteData_.content;
};


NoteUI.prototype.setText = function(text) {
    this.saveIfChanged_('content', text);
};


NoteUI.prototype.getTitle = function() {
    // first line of text is the title
    var text = this.noteData_.content,
        index = text.indexOf('\n');

    return text.substring(0, index > -1 ? index : text.length);
};


NoteUI.prototype.isFixed = function() {
    return this.hasStatus(NoteUI.STATUS.FIXED);
};


NoteUI.prototype.saveIfChanged_ = function(property, value) {
    if(this.noteData_[property] !== value) {
        this.noteData_[property] = value;
        this.setStatus(NoteUI.STATUS.NEEDS_SAVE);
        return true;
    }
    return false;
};


NoteUI.prototype.attachTo = function(document, container) {
    this.attachTo_(document, container);
    this.redraw();
};


NoteUI.prototype.detach = function() {
    this.detach_();
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


NoteUI.prototype.redraw = function() {
    this.redraw_();
    this.updateStatus();
    this.setText(this.noteData_.content);
};


NoteUI.prototype.minimize = Util.Js.empty;


NoteUI.prototype.unminimize = Util.Js.empty;


NoteUI.prototype.minimizeAndSave = function() {
    if(!this.hasStatus(NoteUI.STATUS.MINIMIZED) && !this.hasStatus(NoteUI.STATUS.EDITING)) {
        this.setStatus(NoteUI.STATUS.MINIMIZED);
        this.minimize();
        this.setSaveNeededAndSave_();
    }
};


NoteUI.prototype.unminimizeAndSave = function() {
    if(this.hasStatus(NoteUI.STATUS.MINIMIZED)) {
        this.unsetStatus(NoteUI.STATUS.MINIMIZED);
        this.unminimize();
        this.setSaveNeededAndSave_();
    }
};


NoteUI.prototype.fix = Util.Js.empty;


NoteUI.prototype.unfix = Util.Js.empty;


NoteUI.prototype.fixAndSave = function() {
    this.setStatus(NoteUI.STATUS.FIXED);
    if(this.setNewPosition_(this.calculateNewPosition_())) {
        this.fix();
        this.setSaveNeededAndSave_();
    }
};


NoteUI.prototype.unfixAndSave = function(e) {
    this.unsetStatus(NoteUI.STATUS.FIXED);
    if(this.setNewPosition_(this.calculateNewPosition_())) {
        this.unfix();
        this.setSaveNeededAndSave_();
    }
};


NoteUI.prototype.toggleFix = function() {
    if(this.hasStatus(NoteUI.STATUS.FIXED)) {
        this.unfixAndSave();
    }
    else {
        this.fixAndSave();
    }
    this.redraw();
};


NoteUI.prototype.updateLocation = function(location) {
    this.setUrl(location);
    this.setSaveNeededAndSave();
};


NoteUI.prototype.setNewPosition_ = function(pos) {
    this.noteData_.x = pos.x;
    this.noteData_.y = pos.y;
};


NoteUI.prototype.setStatus = function(status) {
    this.noteData_.status |= status;
};


NoteUI.prototype.unsetStatus = function(status) {
    this.noteData_.status &= ~status;
};


NoteUI.prototype.hasStatus = function(status) {
    return this.noteData_.status & status;
};


NoteUI.prototype.setSaveNeededAndSave_ = function() {
    this.setStatus(NoteUI.STATUS.NEEDS_SAVE);
    this.save(); 
};


NoteUI.prototype.save = function(){
    if(!this.hasStatus(NoteUI.STATUS.EDITING) && this.hasStatus(NoteUI.STATUS.NEEDS_SAVE)) {
        this.unsetStatus(NoteUI.STATUS.NEEDS_SAVE);
        this.view_.saveNote(this.noteData_, Util.Js.bind(this.onAfterSave_, this));
    }
};


NoteUI.prototype.edit = Util.Js.empty;


NoteUI.prototype.move = Util.Js.empty;


NoteUI.prototype.resize = Util.Js.empty;


NoteUI.prototype.mouseenter = Util.Js.empty;


NoteUI.prototype.mouseleave = Util.Js.empty;


NoteUI.prototype.raiseToTop = Util.Js.empty;


NoteUI.prototype.onAfterSave_ = Util.Js.empty;


NoteUI.prototype.calculateNewPosition_ = function() {
    return {x: 0, y: 0};
};
