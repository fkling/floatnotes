#ifndef __INCLUDE_NOTE__
#define __INCLUDE_NOTE__

#include "util.js"

var status = {
		SAVED: 1,
		EDITING: 2,
		DRAGGING: 4,
		RESIZING: 8,
		NEEDS_SAVE: 16,
		MINIMIZED: 32
	},
	ZINDEX = 100000;

var resizeTextarea = function(note) {
	util.css(note.ele.text, {
		'height': (parseInt(note.dom.style.height)) + 'px',
		'width': (parseInt(note.dom.style.width)) + 'px'
	});
  };

var moveResize = function(e, note, X, Y) {
	  e.stopPropagation();
	  e.preventDefault();
	  
	  var newX = Math.max(X + e.pageX,0) + 'px';
	  var newY = Math.max(Y + e.pageY,0) + 'px';
	  
	  if(note.status & status.DRAGGING) {
		  note.dom.style.left = newX;
		  note.dom.style.top =  newY;
	  }
	  else if(note.status & status.RESIZING) {
		  note.dom.style.width = newX;
		  note.dom.style.height = newY;
	  }
	  
	  if(e.pageY < window.content.pageYOffset) {
		  var y = e.pageY - window.content.pageYOffset;
	  }
	  else if (e.pageY > window.content.innerHeight + window.content.pageYOffset) {
		  var y = e.pageY - (window.content.innerHeight + window.content.pageYOffset);
	  }

	  if(e.pageX < window.content.pageXOffset) {
		  var x = e.pageX - window.content.pageXOffset;
	  }
	  else if (e.pageX > window.content.innerWidth + window.content.pageXOffset) {
		  var x = e.pageX - (window.content.innerWidth + window.content.pageXOffset);
	  }

	  if(x || y) {
		  window.content.scrollBy(x,y);
	  }

	  return false;
  };
  
 function FloatNote(data, noteManager, markdownParser) {
		this.data = data;
		this.dom = null;
		this.ele = {};
		this.status = 0;
		this.noteManager = noteManager;
		this.markdownParser = markdownParser;
}
	
	
FloatNote.prototype = {
	get domNode() {
		return this.dom;
	},
	attachToDocument: function(doc) {
		if(doc) {
	  		if(this.dom == null) {
	  			this.dom = this.getDomElement(doc);
	  			this.dom.id = 'floatnotes-note-' + this.data.id;
	  		}
	  		else {
	  			this.detach();
	  		}
	  		doc.body.appendChild(this.dom);
	  		if(this.data.collapse) {
	  			this.status |= status.MINIMIZED;
	  		    this.collapse(true, false);			    
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
  		this.status |= status.MINIMIZED;
  		this.minimize();
  		this.data.collapsed = true;
  		this.status |= status.NEEDS_SAVE;
  		this.save();
  	},
  	
  	unminimize: function() {
  		util.removeClass(this.dom, 'small');
  		util.css(this.dom, {width: this.data.w + "px", height: this.data.h + "px"});	  		
  	},
  	
  	unminimizeAndSave: function() {
  		this.status ^= status.MINIMIZED;
  		this.unminimize();
  		this.data.collapsed = false;
  		this.status |= status.NEEDS_SAVE;
  		this.save();
  	},
  	
  	
  	updateLocation: function(newLocation) {
  		this.data.url = newLocation;
  		this.status |= status.NEEDS_SAVE;
  		this.save();
  	},
  	
  	edit: function() {
  		util.fireEvent(this.dom, 'dblclick');
  	},
  	
  	save: function(){
  		if(!(this.status & status.EDIT) && (this.status & status.NEEDS_SAVE)) {
	  		this.noteManager.saveNote(this);
  		}
  	},	
  	
  	getDomElement: function(doc) {
  		var note = this,
  		container, drag, resize, content, text;


  		// Create elements
  		container = doc.createElement('div');
  		container.className = 'floatnotes-note';

  		util.css(container, {
  			'backgroundColor': this.data.color, 
  			'left': this.data.x + "px",
  			'top': this.data.y  + "px",
  			'width': this.data.w  + "px",
  			'height': this.data.h  + "px",
  			'position': 'absolute',
  			'zIndex': ZINDEX
  		});

  		drag = doc.createElement('div');
  		drag.className = 'floatnotes-drag';

  		content = doc.createElement('div');
  		content.className = 'floatnotes-content';

  		resize = doc.createElement('div');
  		resize.className = 'floatnotes-resize';

  		text = doc.createElement('textarea');
  		text.className = 'floatnotes-text';
  		text.style.display = 'none';
  		
  		util.css(text, {
  			'backgroundColor': this.data.color, 
  			"position": "absolute",
  	    	"border": "0",
  	    	"padding": "5px"
  		});


  		// define event handlers

  		// note minimize
  		drag.addEventListener('dblclick', function(e) {
  			e.stopPropagation();
  			if(note.status & status.EDITING)
  				return;
  			note.minimizeAndSave();
  		}, false);


  		// set hover
  		var _in = function(e) {
  			if(note.status & status.MINIMIZED) {
  				note.unminimize()
  			}
  			util.show(note.ele.drag);
  			util.show(note.ele.resize);
  		};

  		var _out = function(e) {
  			util.hide(note.ele.drag);
  			util.hide(note.ele.resize);
  			if(note.status & status.MINIMIZED) {
  				note.minimize()
  			}
  		};


  		container.addEventListener('mouseover', _in, false);
  		container.addEventListener('mouseout', _out, false);


  		// note edit
  		container.addEventListener('dblclick', function(e) {
  			e.preventDefault();
  			e.stopPropagation();

  			util.hide(note.ele.content);
  			note.ele.text.value = note.data.content;
  			util.show(note.ele.text);
  			note.ele.text.focus();
  			util.addClass(note.dom, 'note-edit');
  			resizeTextarea(note, note.dom.style.width, note.dom.style.height);  	    		
  			note.status |= status.EDITING;

  			var finish = function(e) {
  				if(e.button === undefined || e.button != 2) {
  					
  					// If a context menu item is clicked, don't trigger end of edit
  					var target = e.target;
  					if(target != note.noteManager._newMenuItem && target != note.noteManager.hideMenuItem) {
	  					do {
	  						if(target.id == "contentAreaContextMenu")
	  							return;
	  					} while(target = target.parentNode);
  					}
  					
  					window.removeEventListener('click', finish, false);
  					window.removeEventListener('keydown', key, true);
  					var content = note.ele.text.value;
	  				note.data.content = content;
	  				note.ele.content.innerHTML = note.markdownParser.makeHtml(content);
	  				util.show(note.ele.content);
	  				util.hide(note.ele.text);

	  				util.removeClass(note.dom, 'note-edit');
	  				note.status ^= status.EDITING;
	  				note.status |= status.NEEDS_SAVE;
	  				note.save();
  				}
  			};
  			
  			var key = function(e) {
  				if(e.keyCode == e.DOM_VK_ESCAPE	) { //escape was pressed
  					window.removeEventListener('click', finish, false);
	  				window.removeEventListener('keydown', key, true);
	  				util.show(note.ele.content);
	  				util.hide(note.ele.text);

	  				util.removeClass(note.dom, 'note-edit');
	  				note.status ^= status.EDITING;
	  				e.preventDefault();
		  			e.stopPropagation();
  				}
  				else if(e.keyCode == 13 && e.ctrlKey) {
  					e.preventDefault();
  		  			e.stopPropagation();
  		  			util.fireEvent(window, 'click');
  				}
  			};

  			window.addEventListener('keydown', key, true);
  			window.addEventListener('click', finish, false);

  		}, false);

  		// note move
  		drag.addEventListener('mousedown', function(event) {
  			event.preventDefault();
  			event.stopPropagation();
  			var X = parseInt(note.dom.style.left) - event.pageX;
  			var Y = parseInt(note.dom.style.top) - event.pageY;
  			var opacity = note.dom.style.opacity || 1;
  			note.dom.style.opacity = 0.6;
  			note.status |= status.DRAGGING;
  			note.dom.removeEventListener('mouseout', _out, false);
  			note.dom.removeEventListener('mouseover', _in, false);

  			var move = function(e) {
  				e.preventDefault();
  				e.stopPropagation();
  				moveResize(e, note, X, Y);
  			};

  			var release = function(e) {
  				note.status ^= status.DRAGGING | status.NEEDS_SAVE;
  				note.dom.style.opacity = opacity;
  				note.data.x = parseInt(note.dom.style.left);
  				note.data.y = parseInt(note.dom.style.top);
  				note.save();
  				note.dom.addEventListener('mouseout', _out, false);
  				note.dom.addEventListener('mouseover', _in, false);
  				window.content.document.removeEventListener('mousemove', move, true);
  				window.content.document.removeEventListener('mouseup', release, true);
  				return false;
  			};

  			window.content.document.addEventListener("mouseup", release, true);
  			window.content.document.addEventListener("mousemove", move, true);	        	  

  			return false;

  		}, true);


  		// note resize          
  		resize.addEventListener('mousedown', function(event) {
  			event.preventDefault();
  			event.stopPropagation();
  			var X = parseInt(note.dom.style.width) - event.pageX;
  			var Y = parseInt(note.dom.style.height) - event.pageY;
  			var opacity = note.dom.style.opacity || 1;
  			note.dom.style.opacity = 0.6;
  			note.status |= status.RESIZING;
  			note.dom.removeEventListener('mouseout', _out, false);
  			note.dom.removeEventListener('mouseover', _in, false);

  			var resize = function(e) {
  				e.preventDefault();
  				e.stopPropagation();
  				moveResize(e, note, X, Y);
  				resizeTextarea(note);
  			};

  			var release = function(e) {
  				note.status ^= status.RESIZING | status.NEEDS_SAVE;
  				note.dom.style.opacity = opacity;
  				note.dom.addEventListener('mouseout', _out, false);
  				note.dom.addEventListener('mouseover', _in, false);
  				note.data.w = parseInt(note.dom.style.width);
  				note.data.h = parseInt(note.dom.style.height);
  				note.save();
  				window.content.document.removeEventListener('mousemove', resize, true);
  				window.content.document.removeEventListener('mouseup', release, true);
  				return false;
  			};

  			window.content.document.addEventListener("mouseup", release, true);
  			window.content.document.addEventListener("mousemove", resize, true);	        	  

  			return false;

  		}, false);

  		// note edit
  		//content.addEventListener('dbclick', function() {note.edit();}, false);

  		// note extend
  		container.addEventListener('click', function(e) {
  			if(note.status & status.MINIMIZED && e.target.className != 'floatnotes-drag' && e.target.className != 'floatnotes-resize') {
  				note.unminimizeAndSave();
  			}

  			if(note.status & status.EDITING) {
  				e.stopPropagation();
  			}
  		}, false);

  		// bring note to front
  		container.addEventListener('mousedown', function(event) {
  			var maxz = parseInt(this.style.zIndex);

  			var siblings = this.parentNode.childNodes;

  			for (var i in siblings) {
  				if(siblings[i] && siblings[i].style)
  					var v = parseInt(siblings[i].style.zIndex);
  					maxz =  v > maxz ? v : maxz;
  			}
  			this.style.zIndex = maxz+1;  
  		}, true);


  		// set as context note
  		container.addEventListener('contextmenu', function(e) {
  			note.noteManager.contextNote = note;		
  		}, true);


  		// set text
  		content.innerHTML = this.markdownParser.makeHtml(this.data.content);

  		this.ele.drag = drag;
  		this.ele.content = content;
  		this.ele.resize = resize;
  		this.ele.text = text;

  		container.appendChild(drag);
  		container.appendChild(content);
  		container.appendChild(text);
  		container.appendChild(resize);

  		drag = content = resize = text = null;
  		doc = null;

  		return container;
  	}
  	
  };

#endif