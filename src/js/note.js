#ifndef __INCLUDE_NOTE__
#define __INCLUDE_NOTE__

#include "util.js"

var status = {
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
		if(note.hasStatus(status.MINIMIZED)) {
			note.unminimize();
		}
		util.show(note.ele.drag);
		util.show(note.ele.resize);
	}
	};

var _out = function(note) {
    return function(e) {
		util.hide(note.ele.drag);
		util.hide(note.ele.resize);
		if(note.hasStatus(status.MINIMIZED)) {
			note.minimize();
		}
	}
	};
	
	var _updateFix = function(newValues, defaultX, defaultY, window, noteStyle) {
		if(parseInt(newValues.Y) + parseInt(noteStyle.height) >= window.innerHeight) {
			newValues.Y = defaultY;
		 }
		if(parseInt(newValues.X) + parseInt(noteStyle.width) >= window.innerWidth) {
			newValues.X = defaultX;
		}
	}
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
	  }
	  
	  updateFix(newValues, style.width, style.height, content, style);
	  style.width = newValues.X;
	  style.height =  newValues.Y;
	  
	  scrollWindow(e, content);
}


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
	  }
	  
	  updateFix(newValues, style.left, style.top, content, style);
	  style.left = newValues.X;
	  style.top =  newValues.Y;
	  
	  scrollWindow(e, content);
  };
  
  var scrollWindow = function(e, window) {
	  if(e.pageY < window.pageYOffset) {
		  var y = e.pageY - window.pageYOffset;
	  }
	  else if (e.pageY > window.innerHeight + window.pageYOffset) {
		  var y = e.pageY - (window.innerHeight + window.pageYOffset);
	  }

	  if(e.pageX < window.pageXOffset) {
		  var x = e.pageX - window.pageXOffset;
	  }
	  else if (e.pageX > window.innerWidth + window.pageXOffset) {
		  var x = e.pageX - (window.innerWidth + window.pageXOffset);
	  }

	  if(x || y) {
		  content.scrollBy(x,y);
	  }
	  return false;
  }
  
  var _scrollWindow = scrollWindow;
  
 function FloatNote(data, noteManager, markdownParser) {
		this.data = data;
		this.dom = null;
		this.ele = {};
		this.status = 0;
		this.noteManager = noteManager;
		this.markdownParser = markdownParser;
}
 
FloatNotes.handler = {
		
}
	
	
FloatNote.prototype = {
	attachToDocument: function(doc) {
		if(doc) {
	  		if(this.dom == null) {
	  			this.dom = this.getDomElement(doc);
	  			this.dom.id = 'floatnotes-note-' + this.data.id;
	  		}
	  		else {
	  			//this.detach();
	  		}
	  		this.dom = doc.adoptNode(this.dom);
	  		doc.body.parentNode.appendChild(this.dom);
	  		if(this.data.collapse) {
	  			this.status |= status.MINIMIZED;
	  		    this.minimize();
	  		}
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
  		this.setStatus(status.MINIMIZED);
  		this.minimize();
  		this.data.collapsed = true;
  		this.setStatus(status.NEEDS_SAVE);
  		this.save();
  	},
  	
  	unminimize: function() {
  		util.removeClass(this.dom, 'small'); 		
  	},
  	
  	unminimizeAndSave: function() {
  		this.unsetStatus(status.MINIMIZED);
  		this.unminimize();
  		this.data.collapsed = false;
  		this.setStatus(status.NEEDS_SAVE);
  		this.save();
  	},
  	
  	
  	updateLocation: function(newLocation) {
  		this.data.url = newLocation;
  		this.status |= status.NEEDS_SAVE;
  		this.save();
  	},
  	
  	setStatus: function(status) {
  		this.status |= status;
  	},
  	
  	unsetStatus: function(status) {
  		this.status ^= status;
  	},
  	
  	hasStatus: function(status) {
  		return this.status & status;
  	},
  	
  	edit: function() {
  		var textarea = this.ele.text;
		util.hide(this.ele.content);
		
		textarea.value = this.data.content;
		util.show(this.ele.text);
		textarea.focus();
		
		util.addClass(this.dom, 'note-edit');
		this.setStatus(status.EDITING);

		FloatNote.editedNote = this;
		window.addEventListener('keydown', this.endEdit, true);
		window.addEventListener('click', this.endEdit, false);
  	},
  	
  	endEdit: function(e) {
  		var finish = false;
		var note = FloatNote.editedNote;
		if(e.type == "keydown" && e.keyCode == e.DOM_VK_ESCAPE	) { //escape was pressed
			finish = true;
			Firebug.Console.log('ESC pressed');
		}
		else if((e.type == "keydown" && e.keyCode == 13 && e.ctrlKey) || (e.type == "click" && (e.button === undefined || e.button != 2))) {
			// If a context menu item is clicked, don't trigger end of edit
			var target = e.target;
			do {
				if(target.id == "contentAreaContextMenu")
					return true;
			} while(target = target.parentNode);
	
			var content = note.ele.text.value;
			note.data.content = content;
			note.ele.content.innerHTML = note.markdownParser.makeHtml(content);
			note.setStatus(status.NEEDS_SAVE);
			note.save();
			finish = true;
		}
		
		if(finish) {
			e.preventDefault();
			e.stopPropagation();
			
			window.removeEventListener('click', note.endEdit, false);
			window.removeEventListener('keydown', note.endEdit, true);
			
			util.show(note.ele.content);
			util.hide(note.ele.text);
	
			util.removeClass(note.dom, 'note-edit');
			note.unsetStatus(status.EDITING);
			FloatNote.editedNote = null;
		}
  	},
  	
  	startMove: function(e) {
		e.preventDefault();
		e.stopPropagation();
		
  		FloatNote.movedNote = {
  			note: this,
  			X: parseInt(this.dom.style.left) - e.pageX,
  			Y: parseInt(this.dom.style.top) - e.pageY,
  			opacity: this.dom.style.opacity || 1
  		};
  		
		this.setStatus(status.DRAGGING);
		this.dom.removeEventListener('mouseout', this.outHandler, false);
		this.dom.removeEventListener('mouseover', this.inHandler, false);
		
		if(this.hasStatus(status.FIXED)) {
			updateFix = _updateFix;
			scrollWindow = function(){};
		}
		
		window.content.document.addEventListener("mouseup", this.endMove, true);
  		window.content.document.addEventListener("mousemove", move, true);

  	},
  	
  	endMove: function(e) {
		e.preventDefault();
		e.stopPropagation();
  		
  		var note = FloatNote.movedNote.note;
  		note.setStatus(status.NEEDS_SAVE);
  		note.unsetStatus(status.DRAGGING);
		note.dom.style.opacity = FloatNote.movedNote.opacity;
		note.data.x = parseInt(note.dom.style.left);
		note.data.y = parseInt(note.dom.style.top);
		note.save();
		
		if(note.hasStatus(status.FIXED)) {
			updateFix = function(){};
			scrollWindow = _scrollWindow;
		}
		
		note.dom.addEventListener('mouseout', note.outHandler, false);
		note.dom.addEventListener('mouseover', note.inHandler, false);
		
		window.content.document.removeEventListener('mousemove', move, true);
		window.content.document.removeEventListener('mouseup', note.endMove, true);
  	},
  	
  	startResize: function(e) {
		e.preventDefault();
		e.stopPropagation();
  		
  		FloatNote.movedNote = {
  			note: this,
  			X: parseInt(this.dom.style.width) - e.pageX,
  			Y: parseInt(this.dom.style.height) - e.pageY,
  			opacity: this.dom.style.opacity || 1 				
  		};
  		
  		if(this.hasStatus(status.FIXED)) {
			updateFix = _updateFix;
			scrollWindow = function(){};
		}
  		
		this.setStatus(status.RESIZING);
		this.dom.removeEventListener('mouseout', this.outHandler, false);
		this.dom.removeEventListener('mouseover', this.inHandler, false);
		
		window.content.document.addEventListener("mouseup", this.endResize, true);
  		window.content.document.addEventListener("mousemove", resize, true);	

  	},
  	
  	endResize: function(e) {
		e.preventDefault();
		e.stopPropagation();
  		
  		var note = FloatNote.movedNote.note;
  		note.setStatus(status.NEEDS_SAVE);
  		note.unsetStatus(status.RESIZING);
		note.dom.style.opacity = FloatNote.movedNote.opacity;
		note.data.w = parseInt(note.dom.style.width);
		note.data.h = parseInt(note.dom.style.height);
		note.save();
		
		if(note.hasStatus(status.FIXED)) {
			updateFix = function(){};
			scrollWindow = _scrollWindow;
		}
		
		note.dom.addEventListener('mouseout', note.outHandler, false);
		note.dom.addEventListener('mouseover', note.inHandler, false);
		
		window.content.document.removeEventListener('mousemove', resize, true);
		window.content.document.removeEventListener('mouseup', note.endResize, true);
  	},
  	
  	save: function(){
  		if(!this.hasStatus(status.EDITING) && this.hasStatus(status.NEEDS_SAVE)) {
  			var that = this;
	  		this.noteManager.saveNote(this, function(id) {
	  			if(id) {
	  				that.dom.id =  'floatnotes-note-' + id;
	  				that.data.id = id;
	  				that.unsetStatus(status.NEEDS_SAVE);
	  			}
	  		});
  		}
  	},
  	
  	fix : function(e) {
		this.setStatus(status.FIXED);
		var style = this.dom.style;
		style.top = (e.clientY - e.layerY) + "px";
  		util.addClass(this.dom, "fixed");
  		this.toggleFix = this.unfix;
  	},
  	
  	unfix: function(e) {
		this.unsetStatus(status.FIXED);
		var style = this.dom.style;
		style.top = (e.pageY - e.layerY) + "px";
		util.removeClass(this.dom, "fixed");
		this.toggleFix = this.fix;
  	},
  	
  	raiseToTop: function(e) {
		var maxz = parseInt(this.style.zIndex);

		var siblings = this.parentNode.childNodes;

		for (var i in siblings) {
			if(siblings[i] && siblings[i].style)
				var v = parseInt(siblings[i].style.zIndex);
				maxz =  v > maxz ? v : maxz;
		}
		this.style.zIndex = maxz+1;  
  	},
  	
  	getDomElement: function(doc) {	
  		var elements = this.createDOMElements(doc);
  		Firebug.Console.log(elements);
  		this.setData(elements);
  		this.attachEventHandlers(elements);
  		this.ele = elements;
  		return elements.container;
  		
  	},
  	
  	createDOMElements: function(doc) {
  		var container, drag, resize, content, text, fixer;
  		
  		container = doc.createElement('div');
  		container.className = 'floatnotes-note';
  		
  		drag = doc.createElement('div');
  		drag.className = 'floatnotes-drag';
  		
  		fixer = doc.createElement('span');
  		fixer.className= 'floatnotes-togglefix';	
  		fixer.appendChild(doc.createTextNode('\u25CF'));
  		

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
  				fixer: fixer};
  		
  		drag = content = resize = text = fixer = null;
  		
  		FloatNote.prototype.createDOMElements = function(doc) {
  			var elements = FloatNote.prototype.dom;
  			var new_elements = {
				container: elements.container.cloneNode(false), 
  				drag: elements.drag.cloneNode(false), 
  				resize: elements.resize.cloneNode(false), 
  				content: elements.content.cloneNode(false), 
  				text: elements.text.cloneNode(false),
  				fixer: elements.fixer.cloneNode(true)
  			};
  			
  			var container = new_elements.container;
  			new_elements.drag.appendChild(new_elements.fixer);
  			container.appendChild(new_elements.drag);
  			container.appendChild(new_elements.content);
  			container.appendChild(new_elements.text);
  			container.appendChild(new_elements.resize);
			
  			return new_elements;
  		}
  		
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
  		
  		elements.text.style.backgroundColor = this.data.color;
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
  		}, true)

  		// note minimize
  		elements.drag.addEventListener('dblclick', function(e) {
  			e.stopPropagation();
  			if(!note.hasStatus(status.EDITING)) note.minimizeAndSave();
  		}, false);


  		
		elements.container.addEventListener('mouseout', this.outHandler, false);
		elements.container.addEventListener('mouseover', this.inHandler, false);

		elements.container.addEventListener('dblclick', function(e) {
  			if(e.target.className != 'floatnotes-drag') note.edit();
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
  			if(note.hasStatus(status.MINIMIZED) && e.target.className != 'floatnotes-drag' && e.target.className != 'floatnotes-resize') {
  				note.unminimizeAndSave();
  			}
  			if(note.hasStatus(status.EDITING)) {
  				e.stopPropagation();
  			}
  		}, false);

  		// bring note to front
		elements.container.addEventListener('mousedown', this.raiseToTop, true);

  		// set as context note
		elements.container.addEventListener('contextmenu', function(e) {
  			note.noteManager.contextNote = note;		
  		}, true);
  	}
  	
  };

#endif
