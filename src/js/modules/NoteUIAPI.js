//!#include "../header.js"

Cu.import("resource://floatnotes/showdown/showdown.js");

EXPORTED_SYMBOLS = ["NoteUIAPI"];

var NoteUIAPI = (function() {

    var _saveHandler;
    var _last;

    return {

        /* getter and setter */

        get _document() {
            return this.view.currentDocument;
        },

        get guid() {
            return this.data.guid;
        },

        get url() {
            return this.data.url;
        },

        set url(value) {
            if(this.data.url != value) {
                this.data._prevURL = this.data.url;
                this.data.url = value;
                this.setStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
            }
        },

        get color() {
            return this.data.color;
        },

        set color(value) {
            this.setStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
            this.data.color = value;
        },

        get text() {
            return this.data.content;
        },

        set text(value) {
            if(this.data.content != value || value === '') {
                this.setStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
                this.data.content = value;
            }
        },

        get title() {
            var index = this.data.content.indexOf("\n");
            if(index < 0) {
                return this.data.content;
            }
            else {
                return this.data.content.substring(0, index);
            }
        },

        set title(value) {},

        get isFixed() {
            return this.hasStatus(NoteUIAPI.STATUS.FIXED);
        },

        /* end getter and setter */

        markdownParser: new Showdown.converter(),

        attachTo: function(doc, container) {
            this._attachTo(doc, container);
            this.updateUI();
        },

        detach: function() {
            this._detach();    
        },

        updateStatus: function() {
            if(this.hasStatus(NoteUIAPI.STATUS.MINIMIZED)) {
                this.minimize();
            }
            else {
                this.unminimize();
            }

            if(this.hasStatus(NoteUIAPI.STATUS.FIXED)) {
                this.fix();
            }
            else {
                this.unfix();
            }

        },

        updateUI: function() {
            this._updateUI();
            this.updateStatus();
            this.text = this.data.content;
        },

        minimize: function() {},

        minimizeAndSave: function() {
            if(!this.hasStatus(NoteUIAPI.STATUS.MINIMIZED) && !this.hasStatus(NoteUIAPI.STATUS.EDITING)) {
                this.setStatus(NoteUIAPI.STATUS.MINIMIZED);
                this.minimize();
                this._setSaveAndSave();
            }
        },

        unminimize: function() {},

        unminimizeAndSave: function() {
            if(this.hasStatus(NoteUIAPI.STATUS.MINIMIZED)) {
                this.unsetStatus(NoteUIAPI.STATUS.MINIMIZED);
                this.unminimize();
                this._setSaveAndSave();
            }
        },


        updateLocation: function(newLocation) {
            this.data._prevURL = this.data.url;
            this.data.url = newLocation;
            this._setSaveAndSave();
        },

        setStatus: function(status) {
            this.data.status |= status;
        },

        unsetStatus: function(status) {
            this.data.status &= ~status;
        },

        hasStatus: function(status) {
            return this.data.status & status;
        },

        edit: function() {},

        move: function(event) {},

        resize: function(event){},

        _setSaveAndSave: function() {
            this.setStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
            this.save(); 
        },

        save: function(){
            if(!this.hasStatus(NoteUIAPI.STATUS.EDITING) && this.hasStatus(NoteUIAPI.STATUS.NEEDS_SAVE)) {
                this.unsetStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
                var handler;
                if(_last === this) {
                    handler = _saveHandler;
                }
                else {
                    _last = this;
                    handler = _saveHandler = Util.Js.bind(this._postSave, this);
                }
                this.view.saveNote(this.data, handler);
            }
        },

        fix: function() {
            AT(false, "fix must be implemented")
        },

        unfix: function() {
            AT(false, "unfix must be implemented")
        },

        fixAndSave : function(e) {
            this.setStatus(NoteUIAPI.STATUS.FIXED);
            this._setNewPosition(this._calculateNewPosition());
            this.fix();
            this._setSaveAndSave();
        },

        unfixAndSave: function(e) {
            this.unsetStatus(NoteUIAPI.STATUS.FIXED);
            this._setNewPosition(this._calculateNewPosition());
            this.unfix();
            this._setSaveAndSave();
        },

        _setNewPosition: function(pos) {
            this.data.x = pos.x;
            this.data.y = pos.y;
        },

        toggleFix: function() {
            if(this.hasStatus(NoteUIAPI.STATUS.FIXED)) {
                this.unfixAndSave();
            }
            else {
                this.fixAndSave();
            }
        },

        mouseenter: function() {},

        mouseleave: function() {},

        raiseToTop: function(event) {},

    }
}());

NoteUIAPI.STATUS = {
    SAVED: 1,
    EDITING: 2,
    DRAGGING: 4,
    RESIZING: 8,
    NEEDS_SAVE: 16,
    MINIMIZED: 32,
    FIXED: 64
};
