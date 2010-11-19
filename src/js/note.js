//!#ifndef __INCLUDE_NOTE__
//!#define __INCLUDE_NOTE__

//!#include "util.js"

Components.utils.import("resource://floatnotes/showdown/showdown.js");

var note_status = {
    SAVED: 1,
    EDITING: 2,
    DRAGGING: 4,
    RESIZING: 8,
    NEEDS_SAVE: 16,
    MINIMIZED: 32,
    FIXED: 64
},
ZINDEX = 100000;

var _in = function(note) {
    return function(e) {
        if(note.hasStatus(note_status.MINIMIZED)) {
            note.unminimize();
        }
        util.show(note.ele.drag);
        util.show(note.ele.resize);
        util.show(note.ele.menu);
    };
};

var _out = function(note) {
    return function(e) {
        util.hide(note.ele.drag);
        util.hide(note.ele.resize);
        util.hide(note.ele.menu);
        if(note.hasStatus(note_status.MINIMIZED)) {
            note.minimize();
        }
    };
};

var _updateFix = function(newValues, defaultX, defaultY, window, noteStyle) {
    if(parseInt(newValues.Y, 10) + parseInt(noteStyle.height, 10) >= window.innerHeight) {
        newValues.Y = defaultY;
    }
    if(parseInt(newValues.X, 10) + parseInt(noteStyle.width, 10) >= window.innerWidth) {
        newValues.X = defaultX;
    }
};
var updateFix = function(){};

var resize = function(e) {
    e.stopPropagation();
    e.preventDefault();

    var movedNote = FloatNote.movedNote;
    var note = movedNote.note;
    var style = note.dom.style;

    var content = window.content;
    var newValues = {
        X: Math.max(movedNote.X + e.pageX,0) + 'px',
        Y: Math.max(movedNote.Y + e.pageY,0) + 'px'
    };

    updateFix(newValues, style.width, style.height, content, style);
    style.width = newValues.X;
    style.height =  newValues.Y;

    scrollWindow(e, content);
};


var move = function(e) {
    e.stopPropagation();
    e.preventDefault();

    var movedNote = FloatNote.movedNote;
    var note = movedNote.note;
    var style = note.dom.style;

    var content = window.content;
    var newValues = {
        X: Math.max(movedNote.X + e.pageX,0) + 'px',
        Y: Math.max(movedNote.Y + e.pageY,0) + 'px'
    };

    updateFix(newValues, style.left, style.top, content, style);
    style.left = newValues.X;
    style.top =  newValues.Y;

    scrollWindow(e, content);
};

var scrollWindow = function(e, window) {
    var x, y;
    if(e.pageY < window.pageYOffset) {
        y = e.pageY - window.pageYOffset;
    }
    else if (e.pageY > window.innerHeight + window.pageYOffset) {
        y = e.pageY - (window.innerHeight + window.pageYOffset);
    }

    if(e.pageX < window.pageXOffset) {
        x = e.pageX - window.pageXOffset;
    }
    else if (e.pageX > window.innerWidth + window.pageXOffset) {
        x = e.pageX - (window.innerWidth + window.pageXOffset);
    }

    if(x || y) { LOG('Scroll detect by x:' + x + ' and y:' + y);
        content.scrollBy(x,y);
    }
    return false;
};

var _scrollWindow = scrollWindow;

function FloatNote(data, view) {
    this.data = data;
    this.dom = null;
    this.ele = {};
    this.view = view;
}

FloatNote.prototype = {

    /* getter and setter */

    get url() {
        return this.data.url;
    },

    set url(value) {
        this.data._prevURL = this.data.url;
        this.data.url = value;
        this.setStatus(note_status.NEEDS_SAVE);
    },

    get color() {
        return this.data.color;
    },

    set color(value) {
        this.setStatus(note_status.NEEDS_SAVE);
        this.data.color = value;
    },

    get text() {
        return this.data.content;
    },

    set text(value) {
        this.setStatus(note_status.NEEDS_SAVE);
        if(this.ele && this.ele.content) {
            this.ele.content.innerHTML = this.markdownParser.makeHtml(value);
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

    /* end getter and setter */

    markdownParser: new Showdown.converter(),

    attachToDocument: function(doc, node) {
        if(doc) {
            if(this.dom === null) {
                this.dom = this.getDomElement(doc);
                this.dom.id = 'floatnotes-note-' + this.data.id;
            }
            this.dom = doc.adoptNode(this.dom);
            node = node || doc.body;
            node.appendChild(this.dom);
            this.updateStatus();
        }
    },

    updateStatus: function() {
        if(this.hasStatus(note_status.MINIMIZED)) {
            this.minimize();
        }
        else {
            this.unminimize();
        }

        if(this.hasStatus(note_status.FIXED)) {
            this.setFix();
        }
        else {
            this.unsetFix();
        }

    },

    update: function() {
        this.updateDOM();
        this.text = this.data.content;
    },

    updateDOM: function() {
        if(this.dom) {
            this.setData(this.ele);
            this.updateStatus();
        }
    },

    detach: function() {
        if(this.dom && this.dom.parentNode) {
            this.dom.parentNode.removeChild(this.dom);
            //this.dom.parentNode = null;
        }
    },

    minimize: function() {
        util.addClass(this.dom, 'small');
    },

    minimizeAndSave: function() {
        this.setStatus(note_status.MINIMIZED);
        this.minimize();
        this.setStatus(note_status.NEEDS_SAVE);
        this.save();
    },

    unminimize: function() {
        util.removeClass(this.dom, 'small');
    },

    unminimizeAndSave: function() {
        this.unsetStatus(note_status.MINIMIZED);
        this.unminimize();
        this.setStatus(note_status.NEEDS_SAVE);
        this.save();
    },


    updateLocation: function(newLocation) {
        this.data._prevURL = this.data.url;
        this.data.url = newLocation;
        this.setStatus(note_status.NEEDS_SAVE);
        this.save();
    },

    setStatus: function(status) {
        if(!this.hasStatus(status)) {
            this.data.status |= status;
        }
    },

    unsetStatus: function(status) {
        if(this.hasStatus(status)) {
            this.data.status ^= status;
        }
    },

    hasStatus: function(status) {
        return this.data.status & status;
    },

    edit: function() {
        var textarea = this.ele.text;
        util.hide(this.ele.content);

        textarea.value = this.data.content;
        util.show(this.ele.text);
        textarea.focus();

        util.addClass(this.dom, 'note-edit');
        this.setStatus(note_status.EDITING);

        FloatNote.editedNote = this;
        window.addEventListener('keydown', this.endEdit, true);
        window.addEventListener('click', this.endEdit, false);
    },

    endEdit: function(e) {
        var finish = false;
        var note = FloatNote.editedNote;
        if(e.type == "keydown" && e.keyCode == e.DOM_VK_ESCAPE	) { //escape was pressed
            finish = true;
        }
        else if((e.type == "keydown" && e.keyCode == 13 && e.ctrlKey) || (e.type == "click" && (e.button === undefined || e.button != 2))) {
            // If a context menu item is clicked, don't trigger end of edit
            var target = e.target;
            do {
                if(target.id == "contentAreaContextMenu") {
                    return true;
                }
            } while((target = target.parentNode));

            var content = note.ele.text.value;
            note.data.title = content.substring(0, content.indexOf('\n'));
            note.data.content = content;
            note.ele.content.innerHTML = note.markdownParser.makeHtml(content);
            note.unsetStatus(note_status.EDITING);
            note.setStatus(note_status.NEEDS_SAVE);
            note.save();
            finish = true;
        }

        if(finish) {
            //e.preventDefault();
            //e.stopPropagation();

            window.removeEventListener('click', note.endEdit, false);
            window.removeEventListener('keydown', note.endEdit, true);

            util.show(note.ele.content);
            util.hide(note.ele.text);

            util.removeClass(note.dom, 'note-edit');
            if(note.hasStatus(note_status.EDITING)) {
                note.unsetStatus(note_status.EDITING);
            }
            FloatNote.editedNote = null;
        }
    },

    startMove: function(e) {
        e.preventDefault();
        e.stopPropagation();

        FloatNote.movedNote = {
            note: this,
            X: parseInt(this.dom.style.left, 10) - e.pageX,
            Y: parseInt(this.dom.style.top, 10) - e.pageY,
            opacity: this.dom.style.opacity || 1
        };
        this.dom.style.opacity = 0.7;

        this.setStatus(note_status.DRAGGING);
        this.dom.removeEventListener('mouseout', this.outHandler, false);
        this.dom.removeEventListener('mouseover', this.inHandler, false);

        if(this.hasStatus(note_status.FIXED)) {
            updateFix = _updateFix;
            scrollWindow = function(){};
        }

        gBrowser.contentDocument.addEventListener("mouseup", this.endMove, true);
        gBrowser.contentDocument.addEventListener("mousemove", move, true);

    },

    endMove: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var note = FloatNote.movedNote.note;
        note.setStatus(note_status.NEEDS_SAVE);
        note.unsetStatus(note_status.DRAGGING);
        note.dom.style.opacity = FloatNote.movedNote.opacity;
        note.data.x = parseInt(note.dom.style.left, 10);
        note.data.y = parseInt(note.dom.style.top, 10);
        note.save();

        if(note.hasStatus(note_status.FIXED)) {
            updateFix = function(){};
            scrollWindow = _scrollWindow;
        }

        note.dom.addEventListener('mouseout', note.outHandler, false);
        note.dom.addEventListener('mouseover', note.inHandler, false);

        gBrowser.contentDocument.removeEventListener('mousemove', move, true);
        gBrowser.contentDocument.removeEventListener('mouseup', note.endMove, true);
    },

    startResize: function(e) {
        e.preventDefault();
        e.stopPropagation();

        FloatNote.movedNote = {
            note: this,
            X: parseInt(this.dom.style.width, 10) - e.pageX,
            Y: parseInt(this.dom.style.height, 10) - e.pageY,
            opacity: this.dom.style.opacity || 1
        };
        this.dom.style.opacity = 0.7;

        if(this.hasStatus(note_status.FIXED)) {
            updateFix = _updateFix;
            scrollWindow = function(){};
        }

        this.setStatus(note_status.RESIZING);
        this.dom.removeEventListener('mouseout', this.outHandler, false);
        this.dom.removeEventListener('mouseover', this.inHandler, false);

        gBrowser.contentDocument.addEventListener("mouseup", this.endResize, true);
        gBrowser.contentDocument.addEventListener("mousemove", resize, true);	

    },

    endResize: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var note = FloatNote.movedNote.note;
        note.setStatus(note_status.NEEDS_SAVE);
        note.unsetStatus(note_status.RESIZING);
        note.dom.style.opacity = FloatNote.movedNote.opacity;
        note.data.w = parseInt(note.dom.style.width, 10);
        note.data.h = parseInt(note.dom.style.height, 10);
        note.save();

        if(note.hasStatus(note_status.FIXED)) {
            updateFix = function(){};
            scrollWindow = _scrollWindow;
        }

        note.dom.addEventListener('mouseout', note.outHandler, false);
        note.dom.addEventListener('mouseover', note.inHandler, false);

        gBrowser.contentDocument.removeEventListener('mousemove', resize, true);
        gBrowser.contentDocument.removeEventListener('mouseup', note.endResize, true);
    },

    save: function(){
        if(!this.hasStatus(note_status.EDITING) && this.hasStatus(note_status.NEEDS_SAVE)) {
            var that = this;
            that.unsetStatus(note_status.NEEDS_SAVE);
            this.view.saveNote(this, function(id, guid) {
                if(id > -1) {
                    that.dom.id =  'floatnotes-note-' + id;
                }
            });
        }
    },

    setFix: function() {
        this.setStatus(note_status.FIXED);
        util.addClass(this.dom, "fixed");
        this.toggleFix = this.unfix;
    },

    unsetFix: function() {
        this.unsetStatus(note_status.FIXED);
        util.removeClass(this.dom, "fixed");
        this.toggleFix = this.fix;
    },

    fix : function(e) {
        this.setFix();
        var style = this.dom.style;
        var newTop = (this.data.y - this.view.currentDocument.defaultView.pageYOffset);
        style.top =  newTop + "px";
        this.data.y = newTop;
        this.setStatus(note_status.NEEDS_SAVE);
        this.save();
    },

    unfix: function(e) {
        this.unsetStatus(note_status.FIXED);
        var style = this.dom.style;
        var newTop = (this.data.y + this.view.currentDocument.defaultView.pageYOffset);
        style.top = newTop + "px";
        this.data.y = newTop;
        util.removeClass(this.dom, "fixed");
        this.toggleFix = this.fix;
        this.setStatus(note_status.NEEDS_SAVE);
        this.save();
    },

    raiseToTop: function(e) {
        var maxz = parseInt(this.style.zIndex, 10);

        var siblings = this.parentNode.childNodes;

        for (var i = siblings.length -1;i > -1; --i) {
            var v = 0;
            if(siblings[i] && siblings[i].style) {
                v = parseInt(siblings[i].style.zIndex, 10);
            }
            maxz =  v > maxz ? v : maxz;
        }
        this.style.zIndex = maxz+1;  
    },

    getDomElement: function(doc) {	
        var elements = this.createDOMElements(doc);
        this.setData(elements);
        this.attachEventHandlers(elements);
        this.ele = elements;
        return elements.container;

    },

    createDOMElements: function(doc) {
        var container, drag, resize, content, text, fixer, edit, del, menu;

        container = doc.createElement('div');
        container.className = 'floatnotes-note';

        drag = doc.createElement('div');
        drag.className = 'floatnotes-drag';
        drag.innerHTML = '<div class="floatnotes-drag-handler"></div>';
        
        menu = doc.createElement('div');
        menu.className = 'floatnotes-menu';

        fixer = doc.createElement('span');
        fixer.className = 'floatnotes-togglefix floatnotes-menu-entry';	
        fixer.appendChild(doc.createTextNode('\u25CF'));

        edit = doc.createElement('span');
        edit.className= 'floatnotes-edit floatnotes-menu-entry';	
        edit.appendChild(doc.createTextNode('E'));

        del = doc.createElement('span');
        del.className= 'floatnotes-delete floatnotes-menu-entry';	
        del.appendChild(doc.createTextNode('D'));

        menu.appendChild(fixer);
        menu.appendChild(edit);
        menu.appendChild(del);
        

        content = doc.createElement('div');
        content.className = 'floatnotes-content';

        resize = doc.createElement('div');
        resize.className = 'floatnotes-resize';

        text = doc.createElement('textarea');
        text.className = 'floatnotes-text';
        text.style.cssText = "display: none;";
        text.rows = 1;
        text.cols = 1;

        FloatNote.prototype.dom = {
            container: container, 
            drag: drag, 
            resize: resize, 
            content: content, 
            text: text,
            fixer: fixer,
            edit: edit,
            del: del,
            menu: menu
        };

        drag = content = resize = text = fixer = edit = del = menu = null;

        FloatNote.prototype.createDOMElements = function(doc) {
            var elements = FloatNote.prototype.dom;
            var new_elements = {
                container: elements.container.cloneNode(false), 
                drag: elements.drag.cloneNode(true), 
                resize: elements.resize.cloneNode(false), 
                content: elements.content.cloneNode(false), 
                text: elements.text.cloneNode(false),
                fixer: elements.fixer.cloneNode(true),
                edit: elements.edit.cloneNode(true),
                del: elements.del.cloneNode(true),
                menu: elements.menu.cloneNode(false)
            };

            var container = new_elements.container;
            new_elements.menu.appendChild(new_elements.fixer);
            new_elements.menu.appendChild(new_elements.edit);
            new_elements.menu.appendChild(new_elements.del);
            container.appendChild(new_elements.drag);
            container.appendChild(new_elements.menu);
            container.appendChild(new_elements.content);
            container.appendChild(new_elements.text);
            container.appendChild(new_elements.resize);

            return new_elements;
        };

        return this.createDOMElements(doc);
    },

    setData: function(elements) {
        elements.container.style.cssText = [
            'background-color:' + this.data.color, 
            'left:' + this.data.x + "px",
            'top:' + this.data.y  + "px",
            'width:' + this.data.w  + "px",
            'height:' + this.data.h  + "px",
            'z-index:' + ZINDEX
        ].join(';');
        elements.content.innerHTML = this.markdownParser.makeHtml(this.data.content);
    },

    attachEventHandlers: function(elements) {
        var note = this;

        this.toggleFix = this.fix;
        this.outHandler = _out(this);
        this.inHandler = _in(this);

        elements.fixer.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            e.preventDefault();
            note.toggleFix(e);
        }, true);

        elements.fixer.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            e.preventDefault();
        }, true);

        elements.edit.addEventListener('click', function(e) {
            note.view.openEditPopup(note, elements.edit, function(color, url) {
                note.url = url;
                note.color = color;
                note.save();
                note.update();
                elements.container.addEventListener('mouseout', note.outHandler, false);
                note.outHandler();
            });
            elements.container.removeEventListener('mouseout', note.outHandler, false);
        }, false);

        elements.del.addEventListener('click', function(e) {
            gFloatNotesView.deleteNote(note);    
        }, false);


        // note minimize
        elements.drag.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            if(!note.hasStatus(note_status.EDITING)) {
                note.minimizeAndSave();
            }
        }, false);



        elements.container.addEventListener('mouseout', this.outHandler, false);
        elements.container.addEventListener('mouseover', this.inHandler, false);

        elements.container.addEventListener('dblclick', function(e) {
            if(e.target.className != 'floatnotes-drag') {
                note.edit();
            }
        }, false);

        // note move
        elements.drag.addEventListener('mousedown', function(event) {
            note.startMove(event);
        }, false);

        // note resize          
        elements.resize.addEventListener('mousedown', function(event) {
            note.startResize(event);
        }, true);

        // note extend
        elements.container.addEventListener('click', function(e) {
            if(note.hasStatus(note_status.MINIMIZED) && e.target.className != 'floatnotes-drag' &&  e.target.className != 'floatnotes-drag-handler' && e.target.className != 'floatnotes-resize') {
                note.unminimizeAndSave();
            }
            if(note.hasStatus(note_status.EDITING)) {
                e.stopPropagation();
            }
        }, false);

        // bring note to front
        elements.container.addEventListener('mousedown', this.raiseToTop, true);

        // set as context note
        elements.container.addEventListener('contextmenu', function(e) {
            note.view.contextNote = note;		
        }, true);
    }

};

//!#endif
