
if(!de) var de = {};
if(!de.felixkling) de.felixkling = {};

de.felixkling.util = {
	css: {
		set: function(node, style) {
				if(node && node.style) {
					for (var key in style) {
						node.style[key] = style[key];
					}
				}
		},
		show: function(node) {
			if(node && node.style) {
				node.style.display = "block";
			}
		},
		hide: function(node) {
			if(node && node.style) {
				node.style.display = "none";
			}
		}
	},
	update: function(obj, data) {
		if (obj) {
			for (var attr in data) {
				obj[attr] = data[attr];
			}
		}
	},
	addClass: function(node, cls) {
		if(node && node.className && node.className.indexOf(cls) == -1) {
			node.className = node.className + " " + cls;
		}
	},
	removeClass: function(node, cls) {
		if(node && node.className && node.className.indexOf(cls) >= 0) {
			var pattern = new RegExp('\\s*' + cls + '\\s*');
			node.className = node.className.replace(pattern, ' ');
		}
	}
};

function FloatNotes() {
	this.db = null;
	this.converter = new Showdown.converter();
	this.status = {};
	this.docs = {};
	this.notes = {};
}

(function() {
	
	function FloatNote(data) {
		this.data = data;
		this.dom = null;
		this.ele = {};
		this.status = 0;
	}
	
	function Indicator(type) {
		this.ABOVE = 1;
		this.BELOW = -1;
		
		var doc = gBrowser.contentDocument;
		var css;
		if(type == this.BELOW) {
			this.label = gFloatNotes.stringsBundle.getString('belowIndicatorString');
			css = {"position": 'fixed', "bottom": "0px", "left": "5px", 'display': 'none'};
		}
		else if(type == this.ABOVE) {
			this.label = gFloatNotes.stringsBundle.getString('aboveIndicatorString');
			css = {"position": 'fixed', "top": "0px", "left": "5px", 'display': 'none'};
		}
		this.type = type;
		
		var indicator = doc.createElement('div');
  		indicator.id = "floatnotes-above";
  		indicator.className = "floatnotes-indicator";
  			
  		var label = doc.createElement('div');
  		label.className = "floatnotes-indicator-label";
  		
  		var container = doc.createElement('div');
  		container.className = "floatnotes-inidcator-container";
  		
  		de.felixkling.util.css.set(indicator, css);
  		de.felixkling.util.css.set(container, {"display": 'none'});
  			
  		indicator.addEventListener('mouseover', function(e) {
  			gFloatNotes.indicator_above.container.style.display = 'block';
  		
  		}, false);
  		
  		indicator.addEventListener('mouseout', function(e) {
  			gFloatNotes.indicator_above.container.style.display = 'none';
  		
  		}, false);
  		
  		indicator.appendChild(label);
  		indicator.appendChild(container);
  		
  		
  		this.ele = {
  				"indicator": indicator,
  				"label": label,
  				"container": container
  		};
	}
	
	var status = {
			SAVED: 1,
			EDITING: 2,
			DRAGGING: 4,
			RESIZING: 8,
			NEEDS_SAVE: 16,
			COLLAPSED: 32
		},
		ZINDEX = 100000;
	
	var resizeTextarea = function(note) {
		de.felixkling.util.css.set(note.ele.text, {
			'height': (parseInt(note.dom.style.height) - 2 - 10) + 'px',
			'width': (parseInt(note.dom.style.width) - 2 - 10) + 'px'
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
	  
	  var scoller = function() {
		  if(gFloatNotes.pref.getBoolPref('showIndicator')) {
			  gFloatNotes.startScrollTimer();
		  }
	  };
	  
	  function fireEvent(element,event) {
		   if (document.createEvent) {
		       // dispatch for firefox + others
		       var evt = document.createEvent("HTMLEvents");
		       evt.initEvent(event, true, true ); // event type,bubbling,cancelable
		       return !element.dispatchEvent(evt);
		   } else {
		       // dispatch for IE
		       var evt = document.createEventObject();
		       return element.fireEvent('on'+event,evt)
		   }
		}

	
	FloatNotes.prototype = {
	      /* Initial startup */
	      init: function () {
	  	// --- Load and create database
	          var file = Components.classes["@mozilla.org/file/directory_service;1"]
	                       .getService(Components.interfaces.nsIProperties)
	                       .get("ProfD", Components.interfaces.nsIFile);
	          file.append("floatnotes.sqlite");

	          var storageService = Components.classes["@mozilla.org/storage/service;1"]
	                          .getService(Components.interfaces.mozIStorageService);
	          this.db = storageService.openDatabase(file);
	          // Create DB if not exists
	          this.db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, collapse INTEGER)');
	          this.db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
	         // -- end database


	  	// Load preferences
	          this.pref = Components.classes["@mozilla.org/preferences-service;1"]
	  				.getService(Components.interfaces.nsIPrefBranch)
	  				.getBranch("extensions.floatnotes.");

	  	// get references to menu items
	          this._deleteMenuItem = document.getElementById('floatnotes-delete-note');
	          this._locationsMenu = document.getElementById('floatnotes-edit-note');
	          this._editMenuItem = document.getElementById('floatnotes-edit-note');
	          this._hideMenuItem = document.getElementById('floatnotes-hide-note');
	          
	      // load string bundle
	          this.stringsBundle = document.getElementById("floatnotes-stringbundle");
	          
	      // attach load handler
	          gBrowser.addEventListener("load", function(e){gFloatNotes.onPageLoad(e);}, true);
	          var container = gBrowser.tabContainer;
	          container.addEventListener("TabSelect", function(e){gFloatNotes.onTabSelect(e);}, false);
	      },

	      onPageLoad: function (event) {
	      	if (event.originalTarget instanceof HTMLDocument) {
	              var win = event.originalTarget.defaultView;
	              if (win.frameElement) {
	              	// Frame within a tab was loaded. win should be the top window of
	              	// the frameset. If you don't want do anything when frames/iframes
	              	// are loaded in this web page, uncomment the following line:
	              	return;
	              }

	  	    var doc = win.document; // doc is document that triggered "onload" event
	  	    
	  	    this._scrolltimeout = this.pref.getIntPref('scrolltimer');
	  	    this.indicator_timeout = this.pref.getIntPref('fadeOutAfter');
	  	    
	  	    // enable indicators
	  	    if(this.pref.getBoolPref('showIndicator')) {
	  	    	
	  	    	if(!this.indicator_above && !this.indicator_below) {
	  	    		
	  	    		this.indicator_above = new Indicator(1);
	  	    		this.indicator_below = new Indicator(-1);
	  	    		/*
	  	    		indicator.addEventListener('click', function(e) {
	  	    			e.preventDefault();
	  	    			e.stopPropagation();
	  	    			if(e.target.className == 'floatnotes-indicator-text') {
	  	    				var node = gBrowser.contentDocument.getElementById(e.target.getAttribute('rel'));
	  	    				gBrowser.contentDocument.defaultView.scrollTo(0, Math.max(parseInt(node.style.top) - 20,0));
	  	    			}   		
	  	    		}, true);
	  	    		
	  	    		*/
	  	    	}
	  	    	this._attachScrollHandler(doc);
	  	    	
	  	    }
	  	    
	  	    var notes = Array();
	  	    this.docs[doc.location] = notes;
	  	    
	  	    // Get notes for this site
	  	    var statement = this.db.createStatement("SELECT * FROM floatnotes WHERE url = :url");
	  	    var urls = this._getLocations(doc, true);
	  	    var params = statement.newBindingParamsArray();

	  	    for (var i in urls) {
	  	    	var bp = params.newBindingParams();
	  	    	bp.bindByName('url', urls[i]);
	  	    	params.addParams(bp);
	  	    }
	  	    statement.bindParameters(params);
	  	    statement.executeAsync({
	  			handleResult: function(aResultSet) {
	  			    if(aResultSet)
	  			    	gFloatNotes._injectStylesheet(doc);
	  			    
	  			    for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
	  	
	  					var data = {
	  					    x: row.getResultByName("x"),
	  					    y: row.getResultByName("y"),
	  					    id: row.getResultByName("id"),
	  					    url: row.getResultByName("url"),
	  					    content: row.getResultByName("content"),
	  					    w: row.getResultByName("w"),
	  					    h: row.getResultByName("h"),
	  					    collapsed: row.getResultByName("collapse"),
	  					    color: row.getResultByName("color")
	  					};
	  					if(gFloatNotes.notes[data.id] === undefined) {
	  						gFloatNotes.notes[data.id] = new FloatNote(data);
	  					}  					
	  					notes.push(gFloatNotes.notes[data.id]);
	  			    }
	  			    if(doc == gBrowser.contentDocument) {
	  			    	gFloatNotes._attachNotesTo(gBrowser.contentDocument);
	  			    	if(gFloatNotes.pref.getBoolPref('showIndicator')) {
	  			    		gFloatNotes.indicator_above.attachTo(doc);
	  			    		gFloatNotes.indicator_below.attachTo(doc);
	  			    		fireEvent(doc, 'scroll');
	  			  	    }	  			    	
	  			    }
	  			    
	  			    // hide notes for this domain if previously hidden
	  			},
	  	
	  			handleError: function(aError) {
	  			    print("Error: " + aError.message);
	  			},
	  	
	  			handleCompletion: function(aReason) {
	  			    if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
	  			    	print("Query canceled or aborted!");
	  				}
	  		    });
	  		}
	      },
	      
	      onTabSelect: function(e) {
	      	var doc = gBrowser.contentDocument;
	      	this._attachNotesTo(doc);
	      	var domain = doc.location;
	  	    if(gFloatNotes.status[domain]) {
	  	    	gFloatNotes._updateMenuText(gFloatNotes.status[domain]['hidden']);
	  	    }
	  	    if(this.pref.getBoolPref('showIndicator')) {
	  	    	this.indicator_above.attachTo(doc);
	  	    	this.indicator_below.attachTo(doc);
	  	    	fireEvent(doc, 'scroll');
	  	    }
	      },
	      
	      _attachNotesTo: function(doc) {
	      	var notes = this.docs[doc.location];
	      	if (notes) {
	      		var todelete = Array();
	      		for (var i in notes) {
	      			var note = this.notes[notes[i].data.id];
	      			if( note === null) {
	      				todelete.push(i);
	      			}
	      			else {
	      				note.attachTo(doc);	
	      			}	      			
	      		}
	      		if(todelete) {
	      			for(var i in todelete) {
	      				noteids.splice(todelete[i],1);
	      			}
	      		}
	      	}
	      },
	      
	      startScrollTimer: function() {
	    	  if(this._scrolltimer) {
	    		  window.clearTimeout(this._scrolltimer);
	    		  this._scrolltimer = null;
	    	  }
	    	  
	    	  this._scrolltimer = window.setTimeout(function(){
	    		  gFloatNotes.updateIndicators();
	    	  }, this._scrolltimeout);
	      },
	      
	      updateIndicators: function() {
	    	  var wintop = parseInt(gBrowser.contentDocument.defaultView.pageYOffset),
	    	  	winheight = parseInt(gBrowser.contentDocument.defaultView.innerHeight);
    		gFloatNotes.docs[gBrowser.contentDocument.location].forEach(function(note) {
    				if(note && note.dom) {
    					var element = note.dom;
    					var id = 'floatnotes-indicator-text-' + note.data.id,
    					top = parseInt(element.style.top),
    					bottom = top + parseInt(element.offsetHeight);
    					var $position = null;
    					if (wintop > bottom) {
    						note.view = 1;
    					}
    					else if(wintop + winheight < top) {
    						note.view = -1;
    					}
    					else {
    						note.view = 0;
    					}
    					/*
    				if($position) {	    				
    					if($position.find('#' + id).length == 0) {
    						var ele = $('<div class="floatnotes-text"></div>', doc).attr('id', id)
	    					.text($element.children('.floatnotes-content').text())
	    					.data('top', $element.css('top'));
    						//$position.data('count', $position.data('count') + 1);
    						ele.appendTo($position.children('.floatnotes-texts'));
    					}
    				}
    				else {
    					$position = $('#' + id, doc).closest('.floatnotes-indicator');
    					//$position.data('count', $position.data('count') -1);
    					$('#' + id, doc).remove();
    				}*/
    				}
    				
    		});
    			
    		gFloatNotes.indicator_above.update(gBrowser.contentDocument);
    		gFloatNotes.indicator_below.update(gBrowser.contentDocument);
	      },
	      
	      _attachScrollHandler: function(doc) {
	    	 doc.addEventListener('scroll', scoller, false);
	    	    	  
	    	  /*
	  	    				if($position) {	    				
	  	    					if($position.find('#' + id).length == 0) {
	  	    						var ele = $('<div class="floatnotes-text"></div>', doc).attr('id', id)
	  		    					.text($element.children('.floatnotes-content').text())
	  		    					.data('top', $element.css('top'));
	  	    						//$position.data('count', $position.data('count') + 1);
	  	    						ele.appendTo($position.children('.floatnotes-texts'));
	  	    					}
	  	    				}
	  	    				else {
	  	    					$position = $('#' + id, doc).closest('.floatnotes-indicator');
	  	    					//$position.data('count', $position.data('count') -1);
	  	    					$('#' + id, doc).remove();
	  	    				}
	  	    				}
	  	    		});*/

	      },
	      
	      /* Inject the JS stylesheet to style the notes */
	      _injectStylesheet: function(doc) {
	      	var style = doc.getElementById("floatnotes-style");
	      	// already injected ?
	  		if(!style) {
	  		    style = doc.createElement('link');
	  		    style.id = 'floatnotes-style';
	  		    style.rel = "stylesheet";
	  		    style.href = "chrome://floatnotes/skin/notes.css";
	  		    style.type = "text/css";
	  		    doc.getElementsByTagName('head')[0].appendChild(style);
	  		}
	      },
	      
	      saveNote: function(note) {
	  		if(!(note.status & status.EDITING) && note.status & status.NEEDS_SAVE) {
	  			var data = note.data;
	  			// new or update ?
	  			if(data.id) {
	  				var statement = gFloatNotes.db.createStatement("UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, y=:y, collapse=:collapse, color=:color, url=:url WHERE id = :id");
	  				statement.params.id = data.id;
	  			}
	  			else {
	  				var statement = gFloatNotes.db.createStatement("INSERT INTO floatnotes  (url, content, h, w, x, y, collapse, color) VALUES ( :url, :content, :h, :w, :x, :y, :collapse, :color)");
	  				var insert = true;
	  			}
	  		    statement.params.url = data.url;
	  		    statement.params.content = data.content;
	  		    statement.params.h = data.h;
	  		    statement.params.w = data.w;
	  		    statement.params.x = data.x;
	  		    statement.params.y = data.y;
	  		    statement.params.collapse = data.collapsed;
	  		    statement.params.color = data.color;

	  		    statement.executeAsync({
	  				handleResult: function(aResultSet) {
	  				    alert(aResultSet);
	  				},
	  				handleError: function(aError) {
	  				    print("Error: " + aError.message);
	  				},
	  				handleCompletion: function(aReason) {
	  				    if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
	  					 print("Query canceled or aborted!");
	  				    if(insert) {
	  				    	data.id = gFloatNotes.db.lastInsertRowID;
	  				    	note.dom.id =  'floatnotes-note-' + data.id;
	  						note.data = data;
	  				    	gFloatNotes.notes[data.id] = note;
	  				    }
	  				    note.status ^= status.NEEDS_SAVE;
	  				}
	  		    });
	  		}
	      },
	      
	      addNote: function() {
	          var doc = gBrowser.contentDocument;
	          this._injectStylesheet(doc);
	          var note = new FloatNote({
	  			x: this.X,
	  			y:this.Y,
	  			w: this.pref.getIntPref('width'),
	  			h: this.pref.getIntPref('height'),
	  			content: "",
	  			url: this._getDefaultUrl(),
	  			color: this.pref.getCharPref('color'),
	  			collapsed: false});
	          this.docs[doc.location].push(note);
	          note.attachTo(doc);
	          note.edit();
	      },
	      
	      deleteNote: function() {
	    	  if(this.contextNote) {
	    		  var statement = this.db.createStatement("DELETE FROM floatnotes WHERE id = :id");
	    		  statement.params.id = this.contextNote.data.id;
	    		  var that = this;
	    		  statement.executeAsync({
	    			  	handleResult: function(aResultSet) {
	    		  		},

	    		  		handleError: function(aError) {
	    		  			print("Error: " + aError.message);
	    		  		},

	    		  		handleCompletion: function(aReason) {
	    		  			if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
	    		  				print("Query canceled or aborted!");
	    		  				return;
	    		  			}
	    		  			that.contextNote.detach();
	    		  			that.contextNote.dom = null;
	    		  			gFloatNotes.notes[that.contextNote.data.id] = null;
	    		  			that.contextNote = null;
	    		  		}
	    		  });
	    	  }
	      },
	      
	      /* show or hide the notes for the current location */
	      toggleNotes: function() {
	  		var domain = window.content.document.location;
	  		if(!this.status[domain]) {
	  		    this.status[domain] = {
	  			hidden: false
	  		    };
	  		}
	  		if(!this.status[domain]['hidden']) {
	  			this.docs[domain].forEach(function(obj) {obj.dom.style.display = "none";});
	  		    this.status[domain]['hidden'] = true;
	  		    //$(gBrowser.contentDocument).unbind("scroll.floatnotes");
	  		    this._updateMenuText(true);
	  		}
	  		else {
	  		    this.status[domain]['hidden'] = false;
	  		    this.docs[domain].forEach(function(obj) {obj.dom.style.display = "block";});
	  		    this._attachScrollHandler(window.content, window.content.document);
	  		    //$(gBrowser.contentDocument).trigger('scroll');
	  		    this._updateMenuText(false);
	  		}

	      },
	      
	      /* get the URL for a new note */ 
	      _getDefaultUrl: function() {
	      	var loc = this._getLocations();
	      	var default_loc = this.pref.getIntPref('location');
	      	if(default_loc == 0) {
	      		return loc[0];
	      	}
	      	if(window.content.document.location.search) {
	      		return loc[loc.length + default_loc];
	      	}
	      	else {
	      		return loc[loc.length + default_loc +1];
	      	}
	      },
	      
	      /* compute the possible locations for the current URL */
	      _getLocations: function(doc) {
	  		var location = (doc) ? doc.location : window.content.document.location;
	  		var urls = Array();
	  		if(location.protocol == 'http:' || location.protocol == 'https:') {
	  		    var url =  location.href.replace(location.hash, '').replace(location.protocol + '//', '');
	  		    if(location.search) {
	  		        var url_with_search = url;
	  		        url = url_with_search.replace(location.search, '');
	  		    }
	  		    var parts = url.split('/');
	  		    var path = '';
	  		    if(parts[parts.length-1] == '') parts.pop();
	  		    for (var i in parts) {
	  		        path += parts[i];
	  		        urls.push( path + '*');
	  		        path += '/';
	  		    }
	  		    var last = urls[urls.length-1];
	  	        last = last.substring(0,last.length-1);
	  	        if(last.charAt(last.length-1) == '/')
	  	            last = last.substring(0,last.length-1);
	  		    urls.push(last);
	  		    if(location.search)
	  		        urls.push(url_with_search);
	  		}
	  		else {
	  		   urls.push(location.href.replace(location.hash,''));
	  		}
	  		return urls;
	      },
	      
	      updateContext: function(event) {
	          this.contextNote = null;
	          this.X = event.pageX;
	          this.Y = event.pageY;
	      },
	      
	      updateMenuItems: function(event) {
	          if(this.contextNote) {
	              this._deleteMenuItem.hidden = false;
	              this._editMenuItem.hidden = false;
	          }
	          else {
	              this._deleteMenuItem.hidden = true;
	              this._editMenuItem.hidden = true;
	          }
	  		if(gFloatNotes.docs[gBrowser.contentDocument.location]) {
	  			this._hideMenuItem.hidden = false;
	  		}
	  		else {
	  			this._hideMenuItem.hidden = true;
	  		}

	      },
	      
	      updateMenuLocations: function() {
	      	var loc = this._getLocations(window.content);
	  		for(var i in loc) {
	  		    var item = this._locationsMenu.appendItem(loc[i], loc[i]);
	  		    item.setAttribute('type','radio');
	  		    item.setAttribute('name', 'floatnotes-menu-location');
	  		    item.setAttribute('checked', (this.contextNote.data.url == loc[i]));
	  		    item.setAttribute('oncommand', "gFloatNotes.contextNote.dom.data('url',this.value).addClass('needs-save').trigger('save');");
	  		}
	      },
	      
	      removeMenuLocations: function() {
	  		for(var i  = this._locationsMenu.itemCount-1; i >= 0; i--) {
	  		    this._locationsMenu.removeItemAt(i);
	  		}
	      },
	      
	      _updateMenuText: function(hide) {
	      	
	  		if(!hide) {
	  			this._hideMenuItem.setAttribute('label', this.stringsBundle.getString('hideNotesString'));
	  			this._hideMenuItem.setAttribute('image', 'chrome://floatnotes/skin/hide_note_small.png');
	  		}
	  		else {
	  			this._hideMenuItem.setAttribute('label', this.stringsBundle.getFormattedString('showNotesString', [gFloatNotes.docs[gBrowser.contentDocument.location].length ]));
	  			this._hideMenuItem.setAttribute('image', 'chrome://floatnotes/skin/unhide_note_small.png');
	  		}
	      }
	  };

	FloatNote.prototype = {
	  	attachTo: function(doc) {
	  		if(this.dom == null) {
	  			this.dom = this.getDomElement(doc);
	  			this.dom.id = 'floatnotes-note-' + this.data.id;
	  		}
	  		else {
	  			this.detach();
	  		}
	  		doc.body.appendChild(this.dom);
	  		if(this.collapsed == true) {
	  		    //this.collapse();			    
	  		}
	  	},
	  	
	  	detach: function() {
	  		if(this.dom && this.dom.parentNode) {
	  			this.dom.parentNode.removeChild(this.dom);
	  			//this.dom.parentNode = null;
	  		}
	  	},
	  	
	  	collapse: function(collapse, save) {
	  		save = (save === true);
	  		if(collapse) {
          		de.felixkling.util.addClass(this.dom, 'small');
          		if (save) {
          			this.data.collapsed = true;
          			this.status |= status.NEEDS_SAVE;
          			this.save();
         		}  		
	  		}
	  		else {
	  			de.felixkling.util.removeClass(this.dom, 'small');
	  			de.felixkling.util.css.set(this.dom, {width: this.data.w, height: this.data.h});
      	    	if(save) {
      	    		this.data.collapsed = false;
      	    		this.status |= status.NEEDS_SAVE;
          			this.save();
      	    	}
	  		}
	  	},
	  	
	  	edit: function() {
	  		fireEvent(this.dom, 'dblclick');
	  	},
	  	
	  	save: function(){
	  		gFloatNotes.saveNote(this);
	  	},	
	  	getDomElement: function(doc) {
	  		var note = this,
	  		container, drag, resize, content, text;


	  		// Create elements
	  		container = doc.createElement('div');
	  		container.className = 'floatnotes-note';

	  		de.felixkling.util.css.set(container, {
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
	  		text.style.display = 'none';


	  		// define event handlers

	  		// note collapse
	  		drag.addEventListener('dblclick', function(e) {
	  			e.stopPropagation();
	  			note.status |= status.COLLAPSED;
	  			note.collapse(true);
	  		}, false);


	  		// set hover
	  		var _in = function(e) {
	  			if(note.status & status.COLLAPSED) {
	  				note.collapse(false, false);
	  			}
	  			de.felixkling.util.css.show(note.ele.drag);
	  			de.felixkling.util.css.show(note.ele.resize);
	  		};

	  		var _out = function(e) {
	  			de.felixkling.util.css.hide(note.ele.drag);
	  			de.felixkling.util.css.hide(note.ele.resize);
	  			if(note.status & status.COLLAPSED) {
	  				note.collapse(true, false);
	  			}
	  		};


	  		container.addEventListener('mouseover', _in, false);
	  		container.addEventListener('mouseout', _out, false);


	  		// note edit
	  		container.addEventListener('dblclick', function(e) {
	  			e.preventDefault();
	  			e.stopPropagation();

	  			de.felixkling.util.css.hide(note.ele.content);
	  			note.ele.text.value = note.data.content;
	  			de.felixkling.util.css.show(note.ele.text);
	  			note.ele.text.focus();
	  			de.felixkling.util.addClass(note.dom, 'note-edit');
	  			resizeTextarea(note, note.dom.style.width, note.dom.style.height);  	    		
	  			note.status |= status.EDITING;

	  			var finish = function(e) {
	  				window.removeEventListener('click', finish, false);
	  				window.removeEventListener('keydown', key, true);
	  				var content = note.ele.text.value;
	  				note.data.content = content;
	  				note.ele.content.innerHTML = gFloatNotes.converter.makeHtml(content);
	  				de.felixkling.util.css.show(note.ele.content);
	  				de.felixkling.util.css.hide(note.ele.text);

	  				de.felixkling.util.removeClass(note.dom, 'note-edit');
	  				note.status ^= status.EDITING;
	  				note.status |= status.NEEDS_SAVE;
	  				note.save();    			
	  			};
	  			
	  			var key = function(e) {
	  				if(e.keyCode == e.DOM_VK_ESCAPE	) { //escape was pressed
	  					window.removeEventListener('click', finish, false);
		  				window.removeEventListener('keydown', key, true);
		  				de.felixkling.util.css.show(note.ele.content);
		  				de.felixkling.util.css.hide(note.ele.text);

		  				de.felixkling.util.removeClass(note.dom, 'note-edit');
		  				note.status ^= status.EDITING;
		  				e.preventDefault();
			  			e.stopPropagation();
	  				}
	  				else if(e.keyCode == 13 && e.ctrlKey) {
	  					e.preventDefault();
	  		  			e.stopPropagation();
	  					fireEvent(window, 'click');
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
	  			note.dom.style.opacity = 0.8;
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
	  			note.dom.style.opacity = 0.8;
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
	  		content.addEventListener('dbclick', function() {note.edit();}, false);

	  		// note extend
	  		container.addEventListener('click', function(e) {
	  			if(note.status & status.COLLAPSED && e.target.className != 'floatnotes-drag' && e.target.className != 'floatnotes-resize') {
	  				note.status ^= status.COLLAPSED;
	  				note.collapse(false);
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
	  			gFloatNotes.contextNote = note;		
	  		}, true);


	  		// set text
	  		content.innerHTML = gFloatNotes.converter.makeHtml(this.data.content);

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
	
	Indicator.prototype = {
		update: function(doc) {
			var that = this;
			this.stop();
			var n = gFloatNotes.docs[doc.location].filter(function(note){ return note.view == that.type;}).length;
			if(n > 0) {
				this.ele.label.innerHTML = n + ' ' + (n > 1 ? gFloatNotes.stringsBundle.getString('pluralIndicatorString'): gFloatNotes.stringsBundle.getString('singularIndicatorString')) +  " " + this.label;
				this.ele.indicator.style.display = "block";
				this.timer = window.setTimeout(function(){ that.ele.indicator.style.display="none";}, gFloatNotes.indicator_timeout*1000);
			}
			else {
				this.ele.indicator.style.display = "none";
			}
			return n;
		},
		stop: function() {
			if(this.timer) {
				window.clearTimeout(this.timer);
			}
		},
		attachTo: function(doc) {
	  		this.detach();
	  		this.ele.indicator.style.display = "none";
	  		doc.body.appendChild(this.ele.indicator);
	  	},
	  	
	  	detach: function() {
	  		if(this.ele.indicator && this.ele.indicator.parentNode) {
	  			this.ele.indicator.parentNode.removeChild(this.ele.indicator);
	  			//this.dom.parentNode = null;
	  		}
	  	}
	};
})();

var gFloatNotes = new FloatNotes();
window.addEventListener("load", function(event){gFloatNotes.init();}, false);
window.addEventListener("contextmenu", function(e) {gFloatNotes.updateContext(e);}, true);
window.addEventListener("contextmenu", function(e) {gFloatNotes.updateMenuItems(e);}, false);