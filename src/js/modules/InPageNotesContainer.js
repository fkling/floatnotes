//!#include "../header.js"
"use strict";

Cu['import']("resource://floatnotes/NotesContainer.js");
Cu['import']("resource://floatnotes/InPageNoteUI.js");
Cu['import']("resource://floatnotes/InPageIndicator.js");

/*global FloatNotesNotesContainer:true, FloatNotesInPageNoteUI: true, FloatNotesInPageIndicator: true */

var EXPORTED_SYMBOLS = ["FloatNotesInPageNotesContainer"];


function InPageNotesContainer() {
    FloatNotesNotesContainer.apply(this, arguments);
    this.indicator_ = new FloatNotesInPageIndicator();
    //Util.Mozilla.registerObserver(this, 'floatnotes-note-edit');
}

var FloatNotesInPageNotesContainer = InPageNotesContainer;

Util.Js.inherits(InPageNotesContainer, FloatNotesNotesContainer);

InPageNotesContainer.prototype.noteUICls_ = FloatNotesInPageNoteUI;
InPageNotesContainer.prototype.containerId_ = 'floatnotes-container';
InPageNotesContainer.prototype.indicator_ = null;

InPageNotesContainer.prototype.getContainer_ = function() {
    var document = this.mainUI_.getCurrentDocument(),
        container = document.getElementById(this.containerId_);

    if(!container && document) {
        container = this.createContainer_(document);
        container.id = this.containerId_;
        //container.style.zIndex = Util.Css.findHighestZIndex(this.currentDocument, 'div');
        document.body.parentNode.appendChild(container);
    }
    return container;
};

InPageNotesContainer.prototype.createContainer_ = function(document) {
    var container = document.createElement('div'),
        hcl = Util.Css.hasClass,
        ha = Util.Css.hasAncestorWithClass,
        ic = Util.Css.isOrIsContained,
        self = this,
        moving = false,
        resizing = false,
        editing = false,
        options_open = false;

    function getNote(target) {
        var noteNode = target;
        while(!hcl(noteNode, 'floatnotes-note')) {
            noteNode = noteNode.parentNode;
        }
        var guid = noteNode.getAttribute('rel');
        return  self.notes_[guid] || self.newNote_;
    }

    container.addEventListener('click', function(e) {
        //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
        var target = e.target;
        if(!ic(target, 'floatnotes-indicator')) {
            var note = getNote(target);
            /*if(_noteEditing && _noteEditing !== "false") {
                e.stopPropagation();
            }
            else*/ if(hcl(target, 'floatnotes-togglefix')) {
                e.stopPropagation();
                e.preventDefault();
                note.toggleFix(e);
            }
            else if(hcl(target, 'floatnotes-delete')) {
                self.mainUI_.deleteNote(note.getNoteData());
            }
            else if(hcl(target, 'floatnotes-edit')) {
                self.mainUI_.openEditPopup(note, target, function(color, url) {
                    note.setUrl(url || note.getUrl());
                    note.setColor(color || note.getColor());
                    note.save();
                    note.redraw();
                    options_open = false;
                    note.mouseleave();
                });
                options_open = true;
            }
            else if(ic(target, 'floatnotes-content') || hcl(target, 'floatnotes-note')) {
                note.unminimizeAndSave();
            }
        }
    }, true);

    container.addEventListener('dblclick', function(e) {
        var note;
        LOG('Container received ' + e.type  + ' for element: ' + e.target.className);
        var target = e.target;
        if(hcl(target, 'floatnotes-drag-handler') || hcl(target, 'floatnotes-drag')) {
            e.stopPropagation();
            note = getNote(target);
            note.minimizeAndSave();
        }
        else if(hcl(target, 'floatnotes-content') || (ha(target, 'floatnotes-content') && target.nodeName.toLowerCase() !== 'a')) {
            e.stopPropagation();
            note =  getNote(target);
            if(!note.isValid()) {
                Util.Dialog.showTamperDetectionAlert();
                return;
            }
            note.startEdit();
        }
    }, true);

    container.addEventListener('mouseover', function(e) {
        //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
        if(!(moving || resizing || options_open)) {
            e.stopPropagation();
            var note = getNote(e.target);
            note.mouseenter(); 
        }
    }, false);

    container.addEventListener('mouseout', function(e) {
        //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
        if(!(moving || resizing || options_open)) {
            e.stopPropagation();
            var note = getNote(e.target);
            note.mouseleave();
        }
    }, false);

    container.addEventListener('mousedown', function(e) {
        //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
        var target = e.target;
        if(!ic(target, 'floatnotes-indicator')) {
            var note = getNote(target);
            note.raiseToTop();
            if(hcl(target, 'floatnotes-drag-handler') || hcl(target, 'floatnotes-drag') || hcl(target, 'floatnotes-resize')) {
                Util.Css.addClass(container, 'overlay');
                Util.Css.addClass(container, 'moving');
                Util.Css.css(container, {
                    width: document.body.clientWidth + "px",
                    height: document.body.clientHeight + "px"
                });
                if(hcl(target, 'floatnotes-resize')) {
                    resizing = true;
                    note.startResize(e);
                }
                else {
                    moving = true;
                    note.startMove(e);
                }
            }
        }
    }, true);

    container.addEventListener('mouseup', function(e) {
        //LOG('Container received ' + e.type  + ' for element: ' + e.target.className)
        moving = resizing = false;
        Util.Css.removeClass(container, 'moving');
        Util.Css.removeClass(container, 'overlay');
        Util.Css.css(container, {
            width: 0,
            height: 0
        });
    }, true);

    container.addEventListener('contextmenu', function(e) {
        var note = getNote(e.target);
        if(note) {
            self.mainUI_.setContextNote(note.getNoteData());
        }
    }, true);

    return container;
};

/*// get notfied if a note gets edited
InPageNotesContainer.prototype.observe = function(subject, topic, value) {
    if(topic === "floatnotes-note-edit") {
        _noteEditing = value;
    }
};*/

InPageNotesContainer.prototype.setNotes = function(notes) {
    FloatNotesNotesContainer.prototype.setNotes.call(this, notes);
    this.indicator_.setView(this);
    this.indicator_.attachTo(this.mainUI_.getCurrentDocument(), this.getContainer_());
};

InPageNotesContainer.prototype.showNotes = function() {
    Util.Css.css(this.getContainer_(), 'display', '');
};

InPageNotesContainer.prototype.hideNotes = function() {
    Util.Css.css(this.getContainer_(), 'display', 'none');
};

InPageNotesContainer.prototype.redraw = function(){
    LOG('UI updates');
    this.indicator_.redraw();
    this.indicator_.updateAndShow(this.mainUI_.getCurrentDocument(), Util.Js.toArray(this.currentNotes_));
};

InPageNotesContainer.prototype.focusNote = function(noteId) {
    var note = this.currentNotes_[noteId];
    if(note) {
        note.getElementNode().scrollIntoView(true);
    } 
};
