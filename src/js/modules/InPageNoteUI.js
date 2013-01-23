//!#include "../header.js"
/*global Util*/

"use strict";

Cu['import']('resource://floatnotes/preferences.js');
Cu['import']('resource://floatnotes/NoteUI.js');

/*global Preferences: true, FloatNotesNoteUI: true */

var EXPORTED_SYMBOLS = ['FloatNotesInPageNoteUI'];

var ZINDEX = 100000;


function InPageNoteUI() {
  this.__super__.apply(this, arguments);
}

Util.Js.inherits(InPageNoteUI, FloatNotesNoteUI);

var FloatNotesInPageNoteUI = InPageNoteUI;

InPageNoteUI.prototype._elementNode = null;
InPageNoteUI.prototype._domElements = null;

InPageNoteUI.createInstance = function(note_data, container, document) {
  return new InPageNoteUI(note_data, container, document);
};

InPageNoteUI.prototype.setText = function(text) {
  this.__super__.prototype.setText.call(this, text);
  if (this._domElements && this._domElements.content) {
    this._domElements.content.innerHTML = this._markdownParser.makeHtml(text);
  }
};

InPageNoteUI.prototype.getElementNode = function() {
  return this._elementNode;
};

InPageNoteUI.prototype._attachTo = function(container) {
  if (this._document) {
    if (this._domElements === null) {
      this._domElements = this._createDomElements(this._document);
      this._elementNode = this._domElements.container;
    }
    container.appendChild(this._elementNode);
    if (this._domElements.content_frame.src !== 'floatnotes:blank') {
      this._domElements.content_frame.src = 'floatnotes:blank';
    }
  }
};

InPageNoteUI.prototype._createDomElements = function(doc) {
  var container;
  var drag;
  var resize;
  var content_frame;
  var content;
  var text;
  var ifix;
  var fixer;
  var edit;
  var del;
  var menuspacer;
  var menu;

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
  edit.className = 'floatnotes-edit floatnotes-menu-entry';
  edit.title = Util.Locale.get('note.menu.edit');

  del = doc.createElement('span');
  del.className = 'floatnotes-delete floatnotes-menu-entry';
  del.title = Util.Locale.get('note.menu.delete');
  del.innerHTML = '&#x2717;';

  content_frame = doc.createElement('iframe');
  content_frame.className = 'floatnotes-content';
  content_frame.src = 'floatnotes:blank';

  content = doc.createElement('div');
  content.className = 'floatnotes-content';

  resize = doc.createElement('div');
  resize.className = 'floatnotes-resize';

  text = doc.createElement('textarea');
  text.className = 'floatnotes-text';
  text.style.cssText = 'display: none;';
  text.rows = 1;
  text.cols = 1;

  ifix = doc.createElement('div');
  ifix.className = 'iframe-fix';

  // Combine elements

  menu.appendChild(fixer);
  menu.appendChild(edit);
  menu.appendChild(del);

  menuspacer.appendChild(menu);

  container.appendChild(drag);
  container.appendChild(menuspacer);
  container.appendChild(content_frame);
  container.appendChild(ifix);
  container.appendChild(resize);

 var domElements = {
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

  this._attachIframeEventHandlers(domElements);

  return domElements;
};

InPageNoteUI.prototype._attachIframeEventHandlers = function(elements) {
  var fireEvent = Util.Dom.fireEvent;
  var frame = elements.content_frame;
  var fire = function(event) {
    fireEvent(frame.ownerDocument, frame, event);
  };
  
  var event_handlers = [];
  // Propagate events
  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'dblclick',
    fire.bind(null, 'dblclick'),
    true
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'mousedown',
    fire.bind(null, 'mousedown'),
    true
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'mouseup',
    fire.bind(null, 'mouseup'),
    true
  ));

  //FIXME: Open new tab on middle click or ctrl/cmd + click
  event_handlers.push(Util.Js.addEventListener(
    elements.content,
    'click',
    function(e) {
      if (e.target.nodeName === 'A') {
        e.preventDefault();
        frame.ownerDocument.defaultView.location = e.target.href;
      }
      fire('click');
    },
    true
  ));

  event_handlers.push(Util.Js.addEventListener(
    elements.text,
    'click',
    function(e) {
      e.stopPropagation();
    },
    false
  ));

  elements.content_frame.addEventListener('load', function handler(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.src !== 'floatnotes:blank') {
      Util.Dialog.showTamperDetectionAlert();
      return;
    }
    var body = this.contentDocument.body;
    body.appendChild(elements.content);
    body.appendChild(elements.text);
    this.contentDocument.addEventListener('contextmenu', function(e) {
      e.stopPropagation();
      fire('contextmenu');
    }, true);
    if (elements.text.style.display === 'block') {
      elements.text.focus();
    }
    this.removeEventListener('load', handler, false);
  }, false);

  // cleanup
  this._removeIframeEventHandlers = function() {
    event_handlers.forEach(function(remove) { remove();});
    elements = frame = event_handlers = fire = null;
  };
};

InPageNoteUI.prototype._detach = function() {
  if (this._elementNode) {
    Util.Dom.detach(this._elementNode);
    this._document = null;
    this._container = null;
    // remove all iframe event handlers
    this._removeIframeEventHandlers();
  }
};

InPageNoteUI.prototype._update = function() {
  if (this._elementNode) {
    this._updateDOMElements();
  }
};

InPageNoteUI.prototype.minimize = function() {
  LOG('Note minimized');
  Util.Css.addClass(this._elementNode, 'small');
};

InPageNoteUI.prototype.unminimize = function() {
  Util.Css.removeClass(this._elementNode, 'small');
};

InPageNoteUI.prototype.startEdit = function() {
  var textarea = this._domElements.text;
  var window = Util.Mozilla.getRecentWindow();

  // hide redndered text
  Util.Css.hide(this._domElements.content);

  // update texarea with note text and focus it
  textarea.value = this._noteData.content;
  Util.Css.show(textarea);
  textarea.focus();

  // set note state
  Util.Css.addClass(this._elementNode, 'note-edit');
  this.setStatus(FloatNotesNoteUI.STATUS.EDITING);

  // listen for edit end
  var event_handlers = [
    Util.Js.addEventListener(window, 'keydown', this.endEdit.bind(this), true),
    Util.Js.addEventListener(window, 'click', this.endEdit.bind(this), false),
  ];
  this._removeEditHandlers = function() {
    event_handlers.forEach(function(remove) { remove(); });
  };
  Util.Mozilla.notifyObserver('floatnotes-note-edit', true);
};

InPageNoteUI.prototype.endEdit = function(e) {
LOG('end edit');
  var finish = false,
  abort = false;

  if (e.type === 'keydown' &&
      e.keyCode === e.DOM_VK_ESCAPE) { //escape was pressed
    finish = true;
    abort = true;
  }
  else if ((e.type === 'keydown' && e.keyCode === 13 && e.ctrlKey) ||
           (e.type === 'click' && (e.button === undefined || e.button !== 2))) {
    // If a context menu item is clicked, don't trigger end of edit
    var target = e.target;
    do {
      if (target.id === 'contentAreaContextMenu') {
        return true;
      }
    } while ((target = target.parentNode));


    finish = true;
    var text = this._domElements.text.value;
    if (!text) {
      abort = true;
    }
    else {
      this.setText(this._domElements.text.value);
      this.unsetStatus(FloatNotesNoteUI.STATUS.EDITING);
      this.save();
    }
  }

  if (finish) {
    this._removeEditHandlers();

    Util.Css.show(this._domElements.content);
    Util.Css.hide(this._domElements.text);

    Util.Css.removeClass(this._elementNode, 'note-edit');
    if (this.hasStatus(FloatNotesNoteUI.STATUS.EDITING)) {
      this.unsetStatus(FloatNotesNoteUI.STATUS.EDITING);
    }
    Util.Mozilla.notifyObserver('floatnotes-note-edit', false);

    // if the node was new and no text was entered, remove it
    if (abort && !this._noteData.id && this._domElements.text.value === '') {
      this.detach();
    }
  }
};

InPageNoteUI.prototype.startMove = function(e) {
  e.preventDefault();
  e.stopPropagation();

  var x = this._noteData.x - e.pageX,
  y = this._noteData.y - e.pageY;

  this._elementNode.style.opacity = Preferences.draggingTransparency;

  this.setStatus(FloatNotesNoteUI.STATUS.DRAGGING);

  var window = Util.Mozilla.getRecentWindow();
  var event_handlers = [
    Util.Js.addEventListener(
      window,
      'mouseup',
      this.endMove.bind(this, this._elementNode.style.opacity || 1),
      true
    ),
    Util.Js.addEventListener(
      window,
      'mousemove',
      this.onMove.bind(
        this,
        this.getWindow(),
        x,
        y,
        this._noteData.w,
        this._noteData.h,
        this._elementNode.style,
        this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)
      ),
      true
    )
  ];
  this._removeMoveHandlers = function() {
    event_handlers.forEach(function(remove) { remove();});
  };
};

InPageNoteUI.prototype.onMove = function(
  window,
  startX,
  startY,
  width,
  height,
  style,
  fix,
  e) {
  e.stopPropagation();
  e.preventDefault();

  var x = Math.max(startX + e.pageX, 0),
  y = Math.max(startY + e.pageY, 0);

  if (fix) {
    if (y + height > window.innerHeight) {
      y = window.innerHeight - height;
    }
    if (x + width > window.innerWidth) {
      x = window.innerWidth - width;
    }
  }

  style.left = x + 'px';
  style.top = y + 'px';
  Util.Dom.scrollWindow(e, window);
};



InPageNoteUI.prototype.endMove = function(opacity, e) {
  e.preventDefault();
  //e.stopPropagation();

  this.setStatus(FloatNotesNoteUI.STATUS.NEEDS_SAVE);
  this.unsetStatus(FloatNotesNoteUI.STATUS.DRAGGING);
  this._elementNode.style.opacity = opacity;
  this._noteData.x = parseInt(this._elementNode.style.left, 10);
  this._noteData.y = parseInt(this._elementNode.style.top, 10);
  this.save();

  this._removeMoveHandlers();
  if (!Util.Css.isOrIsContained(e.target, 'floatnotes-note')) {
    this.mouseleave();
  }
  Util.Dom.fireEvent(this.getDocument(), this._elementNode, 'mouseup');
};

InPageNoteUI.prototype.startResize = function(e) {
  e.preventDefault();
  e.stopPropagation();

  var width = this._noteData.w - e.pageX,
  height = this._noteData.h - e.pageY;

  this._elementNode.style.opacity = Preferences.draggingTransparency;

  this.setStatus(FloatNotesNoteUI.STATUS.RESIZE);

  var window = this.getWindow();
  var event_handlers = [
    Util.Js.addEventListener(
      window,
      'mouseup',
      this.endResize.bind(this, this._elementNode.style.opacity || 1),
      true
    ),
    Util.Js.addEventListener(
      window,
      'mousemove',
      this.onResize.bind(
        this,
        this.getWindow(),
        width,
        height,
        this._noteData.x,
        this._noteData.y,
        this._elementNode.style,
        this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)
      ),
      true
    )
  ];
  this._removeResizeHandlers = function() {
    event_handlers.forEach(function(remove) { remove(); });
  };
};

InPageNoteUI.prototype.onResize = function(
  window,
  startWidth,
  startHeight,
  x,
  y,
  style,
  fix,
  e) {
  LOG('onResize');
  e.stopPropagation();
  e.preventDefault();

  var width = Math.max(startWidth + e.pageX, 0),
  height = Math.max(startHeight + e.pageY, 0);

  if (fix) {
    if (y + height > window.innerHeight) {
      height = window.innerHeight - y;
    }
    if (x + width > window.innerWidth) {
      width = window.innerWidth - x;
    }
  }

  style.width = width + 'px';
  style.height = height + 'px';
  Util.Dom.scrollWindow(e, window);
};

InPageNoteUI.prototype.endResize = function(opacity, e) {
  LOG('EndResize');
  e.preventDefault();
  e.stopPropagation();

  var style = this._elementNode.style;

  this.setStatus(FloatNotesNoteUI.STATUS.NEEDS_SAVE);
  this.unsetStatus(FloatNotesNoteUI.STATUS.RESIZING);

  style.opacity = opacity;
  this._noteData.w = style.width = Math.max(parseInt(style.width, 10) , 60);
  this._noteData.h = style.height = Math.max(parseInt(style.height, 10), 80);
  this.save();

  this._removeResizeHandlers();
  if (!Util.Css.isOrIsContained(e.target, 'floatnotes-note')) {
    this.mouseleave();
  }
  Util.Dom.fireEvent(this.getDocument(), this._elementNode, 'mouseup');
};

InPageNoteUI.prototype.save = function() {
  this.__super__.prototype.save.call(this).then(function(result) {
    LOG('Note UI' + result);
    if (result['new']) {
      this._elementNode.id = 'floatnotes-note-' + result.noteData.id;
      this._elementNode.setAttribute('rel', result.noteData.guid);
    }
    this._domElements.content.title = Util.Locale.get(
      'note.last_modified',
      [this._noteData.modification_date.toLocaleString()]
    );
  }.bind(this));
};

InPageNoteUI.prototype.fix = function() {
  Util.Css.addClass(this._elementNode, 'fixed');
};

InPageNoteUI.prototype.unfix = function() {
  Util.Css.removeClass(this._elementNode, 'fixed');
};

InPageNoteUI.prototype.calculateNewPosition_ = function() {
  var newTop, newLeft,
  win = this.getWindow(),
  style = this._elementNode.style;

  if (this.hasStatus(FloatNotesNoteUI.STATUS.FIXED)) {
    newTop = (this._noteData.y - win.pageYOffset);
    newLeft = (this._noteData.x - win.pageXOffset);
  }
  else {
    newTop = (this._noteData.y + win.pageYOffset);
    newLeft = (this._noteData.x + win.pageXOffset);
  }

  style.top = newTop + 'px';
  style.left = newLeft + 'px';

  return {x: newLeft, y: newTop};
};

InPageNoteUI.prototype.mouseenter = function() {
  var elements = this._domElements;

  if (this.hasStatus(FloatNotesNoteUI.STATUS.MINIMIZED)) {
    this.unminimize();
  }

  Util.Css.show(elements.drag, elements.resize, elements.menuspacer);
};

InPageNoteUI.prototype.mouseleave = function() {
  var elements = this._domElements;

  Util.Css.hide(elements.drag, elements.resize, elements.menuspacer);

  if (this.hasStatus(FloatNotesNoteUI.STATUS.MINIMIZED)) {
    this.minimize();
  }
};

InPageNoteUI.prototype.raiseToTop  = function() {
  var element = this.style ? this : this._elementNode,
  maxz = +element.style.zIndex,
  siblings = element.parentNode.childNodes,
  t, sibling;

  AT(element, 'Element does exist');

  for (var i = siblings.length; i--;) {
    t = 0;
    sibling = siblings[i];
    if (siblings && sibling.style) {
      t = +sibling.style.zIndex;
    }
    maxz = t > maxz ? t : maxz;
  }
  Util.Css.css(element, 'zIndex', maxz + 1);
};


InPageNoteUI.prototype._updateDOMElements = function() {
  var elements = this._domElements;
  elements.container.setAttribute('rel', (this._noteData.guid || 'new'));
  elements.container.style.cssText = [
    'background-color:' + this._noteData.color,
    'left:' + this._noteData.x + 'px',
    'top:' + this._noteData.y + 'px',
    'width:' + this._noteData.w + 'px',
    'height:' + this._noteData.h + 'px',
    'z-index:' + ZINDEX,
    'opacity:' + Preferences.transparency,
    'font-size:' + Preferences.fontSize + 'px'
  ].join(';');
  elements.content.style.fontSize = Preferences.fontSize + 'px';
  elements.text.style.fontSize = Preferences.fontSize + 'px';
  elements.content.innerHTML =
    this._markdownParser.makeHtml(this._noteData.content);
  elements.content.title = Util.Locale.get(
    'note.last_modified',
    [this._noteData.modification_date.toLocaleString()]
  );
  elements.menu.style.backgroundColor = this._noteData.color;

  var darkColor = Util.Css.isDarkColor(this._noteData.color);
  Util.Css.toggleClass(elements.content, 'dark', darkColor);
  Util.Css.toggleClass(elements.text, 'dark', darkColor);
  Util.Css.toggleClass(elements.container, 'dark', darkColor);

  // set meta data
  this._elementNode.setAttribute('data-ref', this.getRef());
  if (this._noteData.id) {
    this._elementNode.id = 'floatnotes-note-' + this._noteData.id;
  }
};

InPageNoteUI.prototype.isValid = function() {
  if (this._domElements) {
    return this._domElements.content_frame.src === 'floatnotes:blank';
  }
  return false;
};
