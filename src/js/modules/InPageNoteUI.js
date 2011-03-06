//!#include "../header.js"

Cu.import("resource://floatnotes/preferences.js");
Cu.import("resource://floatnotes/NoteUIAPI.js");

EXPORTED_SYMBOLS = ["InPageNoteUI"];

var ZINDEX = 100000;


function InPageNoteUI(data, view) {
    this.data = data;
    this.dom = null;
    this.ele = {};
    this.view = view;
    this.doc;
}


InPageNoteUI.prototype = (function() {

var _processedNote;
var _editedNote;


/* helper funnctions for moving / rezing fixed note */
 
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

    var processedNote = _processedNote;
    var note = processedNote.note;
    var window = processedNote .window;
    var style = note.dom.style;

    var newValues = {
        X: Math.max(processedNote.X + e.pageX,0),
        Y: Math.max(processedNote.Y + e.pageY,0)
    };
    updateFix(newValues, style.width, style.height, window, style, note);
    style.width = newValues.X + "px";
    style.height =  newValues.Y + "px";

    scrollWindow(e, window);
};

var move = function(e) {
    e.stopPropagation();
    e.preventDefault();

    var processedNote = _processedNote;
    var note = processedNote.note;
    var window = processedNote .window;
    var style = note.dom.style;

    var newValues = {
        X: Math.max(processedNote.X + e.pageX,0),
        Y: Math.max(processedNote.Y + e.pageY,0) };

    updateFix(newValues, style.left, style.top, window, style);
    style.left = newValues.X  + 'px';
    style.top =  newValues.Y  + 'px';

    scrollWindow(e, window);
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


var public = {

    /* getter and setter */

    __proto__: NoteUIAPI,

    get _window() {
        return this._document.defaultView;
    },


    set text(value) {
        if(this.data.content != value || value === '') {
            this.setStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
            this.data.content = value;
        }
        if(this.ele && this.ele.content) {
            this.ele.content.innerHTML = this.markdownParser.makeHtml(value);
        }
    },

    /* end getter and setter */


    _attachTo: function(doc, container) {
        if(doc) {
            if(this.dom === null) {
                this.dom = this.getDomElement(doc);
                if(this.data.id) {
                    this.dom.id = 'floatnotes-note-' + this.data.id;
                }
            }
            if(doc !== this.doc) {
                LOG(this.guid + " adopted") 
                this.dom = doc.adoptNode(this.dom);
                container = container || doc.body;
                container.appendChild(this.dom);
                this.doc = doc;
            }
        }
    },

    _detach: function() {
        if(this.dom && this.dom.parentNode) {
            this.dom.parentNode.removeChild(this.dom);
            //this.dom.parentNode = null;
        }
    },

    _updateUI: function() {
        if(this.dom) {
            this.setData(this.ele);
            this.updateStatus();
        }
    },

    minimize: function() {
        Util.Css.addClass(this.dom, 'small');
    },

    unminimize: function() {
        Util.Css.removeClass(this.dom, 'small');
    },

    edit: function() {
        var textarea = this.ele.text;
        Util.Css.hide(this.ele.content);

        textarea.value = this.data.content;
        Util.Css.show(this.ele.text);
        textarea.focus();

        Util.Css.addClass(this.dom, 'note-edit');
        this.setStatus(NoteUIAPI.STATUS.EDITING);

        _editedNote = this;
        var window = Util.Mozilla.getRecentWindow();
        window.addEventListener('keydown', this.endEdit, true);
        window.addEventListener('click', this.endEdit, false);
        Util.Mozilla.notifyObserver('floatnotes-note-edit', true);     
   },

    endEdit: function(e) {
        var finish = false;
        var abort = false;
        var note = _editedNote;
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
            note.unsetStatus(NoteUIAPI.STATUS.EDITING);
            note.save();
            finish = true;
        }

        if(finish) {
            e.stopPropagation();
            e.preventDefault();
            var window = Util.Mozilla.getRecentWindow();
            window.removeEventListener('click', note.endEdit, false);
            window.removeEventListener('keydown', note.endEdit, true);

            Util.Css.show(note.ele.content);
            Util.Css.hide(note.ele.text);

            Util.Css.removeClass(note.dom, 'note-edit');
            if(note.hasStatus(NoteUIAPI.STATUS.EDITING)) {
                note.unsetStatus(NoteUIAPI.STATUS.EDITING);
            }
            _editedNote = null;
            Util.Mozilla.notifyObserver('floatnotes-note-edit', false);     


            if(abort && !note.data.id && note.ele.text.value == '') {
                note.detach();
            }
        }
    },

    move: function(e) {
        e.preventDefault();
        e.stopPropagation();

        _processedNote = {
            note: this,
            X: parseInt(this.dom.style.left, 10) - e.pageX,
            Y: parseInt(this.dom.style.top, 10) - e.pageY,
            opacity: this.dom.style.opacity || 1,
            window: this._window
        };
        this.dom.style.opacity = Preferences.draggingTransparency;

        this.setStatus(NoteUIAPI.STATUS.DRAGGING);

        if(this.hasStatus(NoteUIAPI.STATUS.FIXED)) {
            updateFix = _updateFixMove;
            scrollWindow = function(){};
        }
        var window = Util.Mozilla.getRecentWindow();
        window.addEventListener("mouseup", this.endMove, true);
        window.addEventListener("mousemove", move, true);
    },

    endMove: function(e) {
        e.preventDefault();
        //e.stopPropagation();

        var note = _processedNote.note;
        note.setStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
        note.unsetStatus(NoteUIAPI.STATUS.DRAGGING);
        note.dom.style.opacity =  _processedNote.opacity;
        note.data.x = parseInt(note.dom.style.left, 10);
        note.data.y = parseInt(note.dom.style.top, 10);
        note.save();

        if(note.hasStatus(NoteUIAPI.STATUS.FIXED)) {
            updateFix = function(){};
            scrollWindow = _scrollWindow;
        }

        var window = Util.Mozilla.getRecentWindow();
        window.removeEventListener('mousemove', move, true);
        window.removeEventListener('mouseup', note.endMove, true);
        if(!Util.Css.isOrIsContained(e.target, 'floatnotes-note')) {
            note.mouseleave();
        }
        Util.Dom.fireEvent(note.view.currentDocument, note.dom, 'mouseup');
    },

    resize: function(e) {
        e.preventDefault();
        e.stopPropagation();

        _processedNote = {
            note: this,
            X: parseInt(this.dom.style.width, 10) - e.pageX,
            Y: parseInt(this.dom.style.height, 10) - e.pageY,
            opacity: this.dom.style.opacity || 1,
            window: this._window
        };
        this.dom.style.opacity = Preferences.draggingTransparency;

        if(this.hasStatus(NoteUIAPI.STATUS.FIXED)) {
            updateFix = _updateFixResize;
            scrollWindow = function(){};
        }

        this.setStatus(NoteUIAPI.STATUS.RESIZING);

        var window = Util.Mozilla.getRecentWindow();
        window.addEventListener("mouseup", this.endResize, true);
        window.addEventListener("mousemove", resize, true);	

    },

    endResize: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var note = _processedNote.note,
        style = note.dom.style,
        data = note.data;

        note.setStatus(NoteUIAPI.STATUS.NEEDS_SAVE);
        note.unsetStatus(NoteUIAPI.STATUS.RESIZING);
        style.opacity =  _processedNote.opacity;
        var newWidth = parseInt(style.width, 10); 
        var newHeight = parseInt(style.height, 10);
        data.w = style.width =  Math.max(newWidth,60); 
        data.h = style.height = Math.max(newHeight, 80);
        note.save();

        if(note.hasStatus(NoteUIAPI.STATUS.FIXED)) {
            updateFix = function(){};
            scrollWindow = _scrollWindow;
        }

        var window = Util.Mozilla.getRecentWindow();
        window.removeEventListener('mousemove', resize, true);
        window.removeEventListener('mouseup', note.endResize, true);
        if(!Util.Css.isOrIsContained(e.target, 'floatnotes-note')) {
            note.mouseleave();
        }
        Util.Dom.fireEvent(note.view.currentDocument, note.dom, 'mouseup');
    },

    _postSave: function(id, guid){
        if(id > -1) {
            this.dom.id =  'floatnotes-note-' + id;
            this.dom.setAttribute('rel', guid);
        }
        this.ele.content.title = Util.Locale.get('note.last_modified',  [this.data.modification_date.toLocaleString()]);
    },

    fix: function() {
        Util.Css.addClass(this.dom, "fixed");
    },

    unfix: function() {
        Util.Css.removeClass(this.dom, "fixed");
    },

    _calculateNewPosition: function() {
        var newTop, newLeft,
        win = this._window,
        style = this.dom.style;

        if(this.hasStatus(NoteUIAPI.STATUS.FIXED)) {
            newTop = (this.data.y - win.pageYOffset);
            newLeft = (this.data.x - win.pageXOffset);
        }
        else {
            newTop = (this.data.y + win.pageYOffset);
            newLeft = (this.data.x + win.pageXOffset);
        }

        AF(isNaN(newTop), "New top is a valid number")
        AF(isNaN(newLeft), "New left is a valid number")

        style.top =  newTop + "px";
        style.left = newLeft + "px";
        
        return {x: newLeft, y: newTop};
    },

    mouseenter: function() {
        var show = Util.Css.show,
        elements = this.ele;
        if(this.hasStatus(NoteUIAPI.STATUS.MINIMIZED)) {
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
        if(this.hasStatus(NoteUIAPI.STATUS.MINIMIZED)) {
            this.minimize();
        }
    },

    raiseToTop: function(e) {
        var element, style;
        if(this.style) {
            element = this;
            style = this.style;
        }
        else {
            element = this.dom;
            style = this.dom.style;
        }

        AT(element, "Element does exist")

        var maxz = +element.style.zIndex;

        var siblings = element.parentNode.childNodes;

        for (var i = siblings.length;i-- ;) {
            var v = 0;
            if(siblings[i] && siblings[i].style) {
                v = +siblings[i].style.zIndex;
            }
            maxz =  v > maxz ? v : maxz;
        }
        style.zIndex = maxz+1;  
    },

    getDomElement: function(doc) {	
        var elements = this.createDOMElements(doc);
        this.attachEventHandlers(elements);
        this.ele = elements;
        return elements.container;

    },

    createDOMElements: function(doc) {
        var container, drag, resize, content_frame, content, text, ifix, fixer, edit, del, menuspacer, menu;

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

        content_frame = doc.createElement('iframe');
        content_frame.className = 'floatnotes-content';
        content_frame.src = "floatnotes:blank";

        content = doc.createElement('div');
        content.className = 'floatnotes-content';

        resize = doc.createElement('div');
        resize.className = 'floatnotes-resize';

        text = doc.createElement('textarea');
        text.className = 'floatnotes-text';
        text.style.cssText = "display: none;";
        text.rows = 1;
        text.cols = 1;

        ifix = doc.createElement('div');
        ifix.className = 'iframe-fix';

        InPageNoteUI.prototype.dom = {
            container: container, 
            drag: drag, 
            resize: resize, 
            content_frame: content_frame, 
            content: content, 
            text: text,
            fixer: fixer,
            ifix: ifix,
            edit: edit,
            del: del,
            menu: menu,
            menuspacer: menuspacer
        };

        drag = content = content_frame = ifix = resize = text = fixer = edit = del = menu = menuspacer = null;

        InPageNoteUI.prototype.createDOMElements = function(doc) {
            var elements = InPageNoteUI.prototype.dom;
            var new_elements = {
                container: elements.container.cloneNode(false), 
                drag: elements.drag.cloneNode(true), 
                resize: elements.resize.cloneNode(false), 
                content_frame: elements.content_frame.cloneNode(false), 
                content: elements.content.cloneNode(false), 
                text: elements.text.cloneNode(false),
                fixer: elements.fixer.cloneNode(false),
                ifix: elements.ifix.cloneNode(false),
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
            container.appendChild(new_elements.content_frame);
            container.appendChild(new_elements.ifix);
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
        elements.content.style.fontSize = Preferences.fontSize + 'px';
        elements.text.style.fontSize = Preferences.fontSize + 'px';
        elements.content.innerHTML = this.markdownParser.makeHtml(this.data.content);
        elements.content.title = Util.Locale.get('note.last_modified',  [this.data.modification_date.toLocaleString()]);
        elements.menu.style.backgroundColor = this.data.color;
    },

    attachEventHandlers: function(elements) {
        var fireEvent =  Util.Dom.fireEvent,
            propEvent = Util.Dom.propagateEvent,
            frame = elements.content_frame,
            fire = function(event) {
                fireEvent(frame.ownerDocument, frame, event);
            };
        elements.content.addEventListener('dblclick', function(e){
            fire('dblclick');
        }, true);

        elements.content.addEventListener('mousedown', function(e){
            fire('mousedown');
        }, true);

        elements.content.addEventListener('mouseup', function(e){
            fire('mouseup');
        }, true);

        elements.content.addEventListener('click', function(e){
            if(e.target.nodeName === 'A') {
                e.preventDefault();
                frame.ownerDocument.defaultView.location = e.target.href;
            }
            fire('click');
        }, false);

        elements.text.addEventListener('click', function(e){
            e.stopPropagation();
        }, false);

        elements.content_frame.addEventListener('load', function(e) {
            var body = this.contentDocument.body;
            body.appendChild(elements.content);                
            body.appendChild(elements.text);
            this.contentDocument.addEventListener('contextmenu', function(e) {
                e.stopPropagation();
                fire('contextmenu');
            }, true);
            if(elements.text.style.display === 'block') {
                elements.text.focus();
            }
            //this.removeEventListener('load', arguments.callee, false);
        }, false);
    }
}

return public;

}());

