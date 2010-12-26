//!#ifndef __INCLUDE_NOTE__
//!#define __INCLUDE_NOTE__
//!#include "header.js"
Cu.import("resource://floatnotes/showdown/showdown.js");
Cu.import("resource://floatnotes/preferences.js");

var ZINDEX = 100000;

var _updateFixMove = function(newValues, defaultX, defaultY, window, noteStyle) {
    if(newValues.Y + parseInt(noteStyle.height, 10) >= window.innerHeight) {
        newValues.Y = defaultY;
    }
    if(newValues.X + parseInt(noteStyle.width, 10) >= window.innerWidth) {
        newValues.X = defaultX;
    }
};

var _updateFixResize = function(newValues, defaultX, defaultY, window, noteStyle, note) {
    if(note.data.y + parseInt(newValues.Y, 10) >= window.innerHeight) {
        newValues.Y = defaultY;
    }
    if(note.data.x + parseInt(newValues.X, 10) >= window.innerWidth) {
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
        X: Math.max(movedNote.X + e.pageX,0),
        Y: Math.max(movedNote.Y + e.pageY,0)
    };
    updateFix(newValues, style.width, style.height, content, style, note);
    style.width = newValues.X + "px";
    style.height =  newValues.Y + "px";

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
        X: Math.max(movedNote.X + e.pageX,0),
        Y: Math.max(movedNote.Y + e.pageY,0)
    };

    updateFix(newValues, style.left, style.top, content, style);
    style.left = newValues.X  + 'px';
    style.top =  newValues.Y  + 'px';

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

FloatNote.STATUS = {
    SAVED: 1,
    EDITING: 2,
    DRAGGING: 4,
    RESIZING: 8,
    NEEDS_SAVE: 16,
    MINIMIZED: 32,
    FIXED: 64
};


FloatNote.prototype = {

    /* getter and setter */

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
            this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        }
    },

    get color() {
        return this.data.color;
    },

    set color(value) {
        this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        this.data.color = value;
    },

    get text() {
        return this.data.content;
    },

    set text(value) {
        if(this.data.content != value || value === '') {
            this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
            this.data.content = value;
        }
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
                if(this.data.id) {
                    this.dom.id = 'floatnotes-note-' + this.data.id;
                }
            }
            this.dom = doc.adoptNode(this.dom);
            node = node || doc.body;
            node.appendChild(this.dom);
            this.updateStatus();
        }
    },

    updateStatus: function() {
        if(this.hasStatus(FloatNote.STATUS.MINIMIZED)) {
            this.minimize();
        }
        else {
            this.unminimize();
        }

        if(this.hasStatus(FloatNote.STATUS.FIXED)) {
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
        Util.Css.addClass(this.dom, 'small');
    },

    minimizeAndSave: function() {
        this.setStatus(FloatNote.STATUS.MINIMIZED);
        this.minimize();
        this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        this.save();
    },

    unminimize: function() {
        Util.Css.removeClass(this.dom, 'small');
    },

    unminimizeAndSave: function() {
        this.unsetStatus(FloatNote.STATUS.MINIMIZED);
        this.unminimize();
        this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        this.save();
    },


    updateLocation: function(newLocation) {
        this.data._prevURL = this.data.url;
        this.data.url = newLocation;
        this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        this.save();
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

    edit: function() {
        var textarea = this.ele.text;
        Util.Css.hide(this.ele.content);

        textarea.value = this.data.content;
        Util.Css.show(this.ele.text);
        textarea.focus();

        Util.Css.addClass(this.dom, 'note-edit');
        this.setStatus(FloatNote.STATUS.EDITING);

        FloatNote.editedNote = this;
        window.addEventListener('keydown', this.endEdit, true);
        window.addEventListener('click', this.endEdit, false);
        this.view.noteIsEditing(true);
    },

    endEdit: function(e) {
        var finish = false;
        var abort = false;
        var note = FloatNote.editedNote;
        if(e.type == "keydown" && e.keyCode == e.DOM_VK_ESCAPE	) { //escape was pressed
            finish = true;
            abort = true;
        }
        else if((e.type == "keydown" && e.keyCode == 13 && e.ctrlKey) || (e.type == "click" && (e.button === undefined || e.button != 2))) {
            // If a context menu item is clicked, don't trigger end of edit
            var target = e.target;
            do {
                if(target.id == "contentAreaContextMenu") {
                    return true;
                }
            } while((target = target.parentNode));

            note.text = note.ele.text.value;
            note.unsetStatus(FloatNote.STATUS.EDITING);
            note.save();
            finish = true;
        }

        if(finish) {
            e.stopPropagation();
            e.preventDefault();
            window.removeEventListener('click', note.endEdit, false);
            window.removeEventListener('keydown', note.endEdit, true);

            Util.Css.show(note.ele.content);
            Util.Css.hide(note.ele.text);

            Util.Css.removeClass(note.dom, 'note-edit');
            if(note.hasStatus(FloatNote.STATUS.EDITING)) {
                note.unsetStatus(FloatNote.STATUS.EDITING);
            }
            FloatNote.editedNote = null;
            note.view.noteIsEditing(false);

            if(abort && !note.data.id && note.ele.text.value == '') {
                note.detach();
            }
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
        this.dom.style.opacity = Preferences.draggingTransparency;

        this.setStatus(FloatNote.STATUS.DRAGGING);

        if(this.hasStatus(FloatNote.STATUS.FIXED)) {
            updateFix = _updateFixMove;
            scrollWindow = function(){};
        }
        window.addEventListener("mouseup", this.endMove, true);
        window.addEventListener("mousemove", move, true);
    },

    endMove: function(e) {
        e.preventDefault();
        //e.stopPropagation();

        var note = FloatNote.movedNote.note;
        note.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        note.unsetStatus(FloatNote.STATUS.DRAGGING);
        note.dom.style.opacity = FloatNote.movedNote.opacity;
        note.data.x = parseInt(note.dom.style.left, 10);
        note.data.y = parseInt(note.dom.style.top, 10);
        note.save();

        if(note.hasStatus(FloatNote.STATUS.FIXED)) {
            updateFix = function(){};
            scrollWindow = _scrollWindow;
        }

        window.removeEventListener('mousemove', move, true);
        window.removeEventListener('mouseup', note.endMove, true);
        Util.Dom.fireEvent(note.view.currentDocument, note.dom, 'mouseup');
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
        this.dom.style.opacity = Preferences.draggingTransparency;

        if(this.hasStatus(FloatNote.STATUS.FIXED)) {
            updateFix = _updateFixResize;
            scrollWindow = function(){};
        }

        this.setStatus(FloatNote.STATUS.RESIZING);

        window.addEventListener("mouseup", this.endResize, true);
        window.addEventListener("mousemove", resize, true);	

    },

    endResize: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var note = FloatNote.movedNote.note,
            style = note.dom.style,
            data = note.data;

        note.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        note.unsetStatus(FloatNote.STATUS.RESIZING);
        style.opacity = FloatNote.movedNote.opacity;
        var newWidth = parseInt(style.width, 10); 
        var newHeight = parseInt(style.height, 10);
        data.w = style.width =  Math.max(newWidth,60); 
        data.h = style.height = Math.max(newHeight, 80);
        note.save();

        if(note.hasStatus(FloatNote.STATUS.FIXED)) {
            updateFix = function(){};
            scrollWindow = _scrollWindow;
        }

        window.removeEventListener('mousemove', resize, true);
        window.removeEventListener('mouseup', note.endResize, true);
        Util.Dom.fireEvent(note.view.currentDocument, note.dom, 'mouseup');
    },

    save: function(){
        if(!this.hasStatus(FloatNote.STATUS.EDITING) && this.hasStatus(FloatNote.STATUS.NEEDS_SAVE)) {
            var that = this;
            that.unsetStatus(FloatNote.STATUS.NEEDS_SAVE);
            this.view.saveNote(this, function(id, guid) {
                if(id > -1) {
                    that.dom.id =  'floatnotes-note-' + id;
                    that.dom.setAttribute('rel', guid);
                }
                that.ele.content.title = Util.Locale.get('note.last_modified',  [that.data.modification_date.toLocaleString()]);
            });
        }
    },

    setFix: function() {
        this.setStatus(FloatNote.STATUS.FIXED);
        Util.Css.addClass(this.dom, "fixed");
        this.toggleFix = this.unfix;
    },

    unsetFix: function() {
        this.unsetStatus(FloatNote.STATUS.FIXED);
        Util.Css.removeClass(this.dom, "fixed");
        this.toggleFix = this.fix;
    },

    fix : function(e) {
        var style = this.dom.style;
        var newTop = (this.data.y - this.view.currentDocument.defaultView.pageYOffset);
        this.setFix();
        style.top =  newTop + "px";
        this.data.y = newTop;
        this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        this.save();
    },

    unfix: function(e) {
        var style = this.dom.style;
        var newTop = (this.data.y + this.view.currentDocument.defaultView.pageYOffset);
        this.unsetFix();
        style.top = newTop + "px";
        this.data.y = newTop;
        this.setStatus(FloatNote.STATUS.NEEDS_SAVE);
        this.save();
    },

    mouseenter: function() {
        var show = Util.Css.show,
            elements = this.ele;
        if(this.hasStatus(FloatNote.STATUS.MINIMIZED)) {
            this.unminimize();
        }
        show(elements.drag);
        show(elements.resize);
        show(elements.menuspacer);
    },

    mouseleave: function() {
        var hide = Util.Css.hide,
            elements = this.ele;
        hide(elements.drag);
        hide(elements.resize);
        hide(elements.menuspacer);
        if(this.hasStatus(FloatNote.STATUS.MINIMIZED)) {
            this.minimize();
        }
    },

    raiseToTop: function(e) {
        var element;
        if(this.style) {
            element = this;
        }
        else {
            element = this.dom;
        }

        var maxz = parseInt(element.style.zIndex, 10);

        var siblings = element.parentNode.childNodes;

        for (var i = siblings.length -1;i > -1; --i) {
            var v = 0;
            if(siblings[i] && siblings[i].style) {
                v = parseInt(siblings[i].style.zIndex, 10);
            }
            maxz =  v > maxz ? v : maxz;
        }
        element.style.zIndex = maxz+1;  
    },

    getDomElement: function(doc) {	
        var elements = this.createDOMElements(doc);
        this.setData(elements);
        this.attachEventHandlers(elements);
        this.ele = elements;
        return elements.container;

    },

    createDOMElements: function(doc) {
        var container, drag, resize, content, text, fixer, edit, del, menuspacer, menu;

        container = doc.createElement('div');
        container.className = 'floatnotes-note';

        drag = doc.createElement('div');
        drag.className = 'floatnotes-drag';
        drag.innerHTML = '<div class="floatnotes-drag-handler"></div>';
        
        menuspacer = doc.createElement('div');
        menuspacer.className = 'floatnotes-menuspacer';

        menu = doc.createElement('div');
        menu.className = 'floatnotes-menu';

        fixer = doc.createElement('span');
        fixer.className = 'floatnotes-togglefix floatnotes-menu-entry';
        fixer.title = Util.Locale.get('note.menu.pin');

        edit = doc.createElement('span');
        edit.className= 'floatnotes-edit floatnotes-menu-entry';	
        edit.title = Util.Locale.get('note.menu.edit');

        del = doc.createElement('span');
        del.className= 'floatnotes-delete floatnotes-menu-entry';	
        del.title = Util.Locale.get('note.menu.delete');

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
            menu: menu,
            menuspacer: menuspacer
        };

        drag = content = resize = text = fixer = edit = del = menu = menuspacer = null;

        FloatNote.prototype.createDOMElements = function(doc) {
            var elements = FloatNote.prototype.dom;
            var new_elements = {
                container: elements.container.cloneNode(false), 
                drag: elements.drag.cloneNode(true), 
                resize: elements.resize.cloneNode(false), 
                content: elements.content.cloneNode(false), 
                text: elements.text.cloneNode(false),
                fixer: elements.fixer.cloneNode(false),
                edit: elements.edit.cloneNode(false),
                del: elements.del.cloneNode(false),
                menu: elements.menu.cloneNode(false),
                menuspacer: elements.menuspacer.cloneNode(false)
            };

            var container = new_elements.container;
            var menu = new_elements.menu;
            menu.appendChild(new_elements.fixer);
            menu.appendChild(new_elements.edit);
            menu.appendChild(new_elements.del);
            new_elements.menuspacer.appendChild(menu);
            container.appendChild(new_elements.drag);
            container.appendChild(new_elements.menuspacer);
            container.appendChild(new_elements.content);
            container.appendChild(new_elements.text);
            container.appendChild(new_elements.resize);

            return new_elements;
        };

        return this.createDOMElements(doc);
    },

    setData: function(elements) {
        elements.container.setAttribute('rel', (this.data.guid || 'new'));
        elements.container.style.cssText = [
            'background-color:' + this.data.color, 
            'left:' + this.data.x + "px",
            'top:' + this.data.y  + "px",
            'width:' + this.data.w  + "px",
            'height:' + this.data.h  + "px",
            'z-index:' + ZINDEX,
            'opacity:' + Preferences.transparency,
            'font-size:' + Preferences.fontSize + 'px'
        ].join(';');
        elements.content.innerHTML = this.markdownParser.makeHtml(this.data.content);
        elements.content.title = Util.Locale.get('note.last_modified',  [this.data.modification_date.toLocaleString()]);
        elements.menu.style.backgroundColor = this.data.color;
    },

    attachEventHandlers: function(elements) {
        this.toggleFix = this.fix;
    }

};
//!#endif
