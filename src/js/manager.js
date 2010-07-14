	function FloatNotes(database) {
		this._db = database;
		this.converter = new Showdown.converter();
		this.status = {};
		this.docs = {};
		this.notes = {};
	}
	  
	  var scoller = function() {
		  gFloatNotes.startScrollTimer();
	  };
	  
	  
    /**
     * FloatNotes global object prototype. Contains all the functions to load,
     * add, delete and save the notes.
     * 
     */
	FloatNotes.prototype = {
	      /* Initial startup */
	      init: function () {
		/*
				var ver = -1, firstrun = true;
				var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
				                                           .getService(Components.interfaces.nsIExtensionManager);
				var current = gExtensionManager.getItemForID("floatnotes@felix-kling.de").version;
				
				// Load preferences
		          this.pref = Components.classes["@mozilla.org/preferences-service;1"]
		  				.getService(Components.interfaces.nsIPrefBranch)
		  				.getBranch("extensions.floatnotes.");
		          
		  	  	// --- Load and create database
		          var file = Components.classes["@mozilla.org/file/directory_service;1"]
		                       .getService(Components.interfaces.nsIProperties)
		                       .get("ProfD", Components.interfaces.nsIFile);
		          file.append("floatnotes.sqlite");

		          var storageService = Components.classes["@mozilla.org/storage/service;1"]
		                          .getService(Components.interfaces.mozIStorageService);
		          this.db = storageService.openDatabase(file);
		          
		        // check for first run or upgrade
		
				try{
					firstrun = this.pref.getBoolPref("firstrun");
					ver = this.pref.getCharPref("version");					
				}catch(e){
					// nothing
				}finally{
					if (firstrun){
						this.pref.setBoolPref("firstrun",false);
						this.pref.setCharPref("version",current);	
						 // Insert code for first run here				
				          // Create DB if not exists
				          this.db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, collapse INTEGER)');
				          this.db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)');
				          // -- end database
					}
					if(!firstrun) {
						if (ver == -1 || ver < "0.6"){ 
							this.pref.setCharPref("version",current);		
							// Insert code if version is different here => upgrade
							this.db.executeSimpleSQL('UPDATE floatnotes SET color="#FCFACF"');
						}
					}

				}
	          
	    //create statements
	          this._update_note_statement = this.db.createStatement("UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, y=:y, collapse=:collapse, color=:color, url=:url WHERE id = :id");
	          this._create_note_statement  = this.db.createStatement("INSERT INTO floatnotes  (url, content, h, w, x, y, collapse, color) VALUES ( :url, :content, :h, :w, :x, :y, :collapse, :color)");
	          this._delete_note_statement  = this.db.createStatement("DELETE FROM floatnotes WHERE id = :id");

	    // Load  CSS to global stylessheets
	          var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
	                          .getService(Components.interfaces.nsIStyleSheetService);
	          var ios = Components.classes["@mozilla.org/network/io-service;1"]
	                          .getService(Components.interfaces.nsIIOService);
	          var uri = ios.newURI("chrome://floatnotes/skin/notes.css", null, null);
	          if(!sss.sheetRegistered(uri, sss.AGENT_SHEET))
	              sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);
	          
	  	

	  	// get references to menu items
	          this._deleteMenuItem = document.getElementById('floatnotes-delete-note');
	          this._locationsMenu = document.getElementById('floatnotes-edit-note');
	          this._editMenuItem = document.getElementById('floatnotes-edit-note');
	          this._hideMenuItem = document.getElementById('floatnotes-hide-note');
	          this._newMenuItem = document.getElementById('floatnotes-new-note');
	          
	      // load string bundle
	          this.stringsBundle = document.getElementById("floatnotes-stringbundle");
	          
          // create indicators	    		
              this.indicator_above = new Indicator(1);
              this.indicator_below = new Indicator(-1);
	          
	      // attach load handler
	          gBrowser.addEventListener("load", function(e){gFloatNotes.onPageLoad(e);}, true);
	          var container = gBrowser.tabContainer;
	          container.addEventListener("TabSelect", function(e){gFloatNotes.onTabSelect(e);}, false);
	          window.removeEventListener("load", function(event){gFloatNotes.init();}, false);
	          */
	      },

	      /**
	       * Loads the note data on page load.
	       */
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

	              // Get these preferences everytime on page load to have a fast update
	              this._scrolltimeout = this.pref.getIntPref('scrolltimer');
	              this.indicator_timeout = this.pref.getIntPref('fadeOutAfter');
	              this.show_indicators = this.pref.getBoolPref('showIndicator');
	              
	              if(doc === gBrowser.contentDocument) {
		              this.loadNotes(gBrowser.contentDocument);
	              }
	      	}
	      },
	      
	      /**
	       * Load and/or show notes
	       */
	      onTabSelect: function(e) {
	      	var doc = gBrowser.contentDocument;
	      	var domain = doc.location;
	      	if(domain.href.indexOf('about:') === 0)
	      		return
	      	if(!this.docs[domain]) {
	      		this.loadNotes(doc);
	      	}
	      	else {      		
		      	this._attachNotesTo(doc);
	
		  	    if(this.status[domain]) {
		  	    	this._updateMenuText(gFloatNotes.status[domain]['hidden']);
		  	    }
		  	    if(this.show_indicators) {
		  	    	this.indicator_above.attachTo(doc);
		  	    	this.indicator_below.attachTo(doc);		  	    	
		  	    	this._attachScrollHandler(doc);
		  	    	util.fireEvent(doc, 'scroll');
		  	    }
	      	}
	      },
	      
	      /**
	       * Load and attach the notes
	       */
	      loadNotes: function(doc) {
	    	  // don't load stuff for about pages
	    	  if(doc.location.href.indexOf('about:') === 0)
	    		  return;
	    	  
	    	  var notes = Array();
              this.docs[doc.location] = notes;
              
              // Get notes for this site
              var statement = this.db.createStatement("SELECT * FROM floatnotes WHERE url = :url ORDER BY x ASC");
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
            	  for (var row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
            		  
            		  var data = {
            				  x: row.getResultByName("x"),
            				  y: row.getResultByName("y"),
            				  id: row.getResultByName("id"),
            				  url: row.getResultByName("url"),
            				  content: row.getResultByName("content"),
            				  w: row.getResultByName("w"),
            				  h: row.getResultByName("h"),
            				  collapse: row.getResultByName("collapse"),
            				  color: row.getResultByName("color")
            		  };
            		  if(gFloatNotes.notes[data.id] === undefined) {
            			  gFloatNotes.notes[data.id] = new FloatNote(data);
            		  }  					
            		  notes.push(gFloatNotes.notes[data.id]);
            	  }

            	  gFloatNotes._attachNotesTo(doc);
            	  if(gFloatNotes.show_indicators) {
            		  gFloatNotes.indicator_above.attachTo(doc);
            		  gFloatNotes.indicator_below.attachTo(doc); 
            		  gFloatNotes._attachScrollHandler(doc);
            		  util.fireEvent(doc, 'scroll');
            	  }	  			    	

              },
              handleCompletion: function() {
            	  
              }
              });
	    	  
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
	      				notes.splice(todelete[i],1);
	      			}
	      		}
	      	}
	      },
	      
	      startScrollTimer: function() {
	    	  var win = window,
	    	  	  that = this;
	    	  if(this._scrolltimer) {
	    		  win.clearTimeout(this._scrolltimer);
	    		  this._scrolltimer = null;
	    	  }
	    	  
	    	  this._scrolltimer = win.setTimeout(function(){
	    		  that.updateIndicators();
	    	  }, this._scrolltimeout);
	      },
	      
	      updateIndicators: function() {
	    	  var doc = gBrowser.contentDocument;
	    	  var wintop = parseInt(doc.defaultView.pageYOffset),
	    	  winheight = parseInt(doc.defaultView.innerHeight);
	    	  this.docs[doc.location].forEach(function(note) {
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
	    		  }
    				
    		});
    			
    		this.indicator_above.update(doc);
    		this.indicator_below.update(doc);
	      },
	      
	      _attachScrollHandler: function(doc) {
	    	 this._removeScrollHandler();
	    	 doc.addEventListener('scroll', scoller, false);
	    	 var that = this;
	    	 this._killScrollHandler = function() {
	    		 doc.removeEventListener('scroll', scoller, false);
	    		 that._killScrollHandler = null;
	    	 };
	      },
	      
	      _removeScrollHandler: function() {
	    	if(this._killScrollHandler) {
	    		this._killScrollHandler();
	    		this._killScrollHandler = null;
	      	}
	      },
	      
	      saveNote: function(note) {
	  		if(!(note.status & status.EDITING) && note.status & status.NEEDS_SAVE) {
	  			var data = note.data,
	  			statement;
	  			// new or update ?
	  			if(data.id !== undefined) {
	  				statement = this._update_note_statement;
	  			}
	  			else {
	  				statement = this._create_note_statement;
	  			}
	  			
	  			try {
	  				for (var param in statement.params) {
	  					statement.params[param] = data[param];
	  				}
	  				statement.executeAsync({
	  					handleCompletion: function(aReason) {
	  				    	if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
	  				    		return
	  				    	if(data.id === undefined) {
	  				    		data.id = gFloatNotes.db.lastInsertRowID;
	  				    		note.dom.id =  'floatnotes-note-' + data.id;
	  				    		note.data = data;
	  				    		gFloatNotes.notes[data.id] = note;
	  				    	}
	  				    	note.status ^= status.NEEDS_SAVE;
	  					}
	  				});
	  			}
	  			finally {
	  				statement.reset();
	  			}
	  		}
	      },
	      
	      addNote: function() {
	          var doc = gBrowser.contentDocument;
	          var note = new FloatNote({
	  			x: this.X,
	  			y:this.Y,
	  			w: this.pref.getIntPref('width'),
	  			h: this.pref.getIntPref('height'),
	  			content: "",
	  			url: this._getDefaultUrl(),
	  			color: this.pref.getCharPref('color'),
	  			collapse: false});
	          if(!this.docs[doc.location]) {
	        	  this.docs[doc.location] = Array();	        	  
	          }
	          this.docs[doc.location].push(note);       
	          note.attachTo(doc);
	          if(this.docs[doc.location].length == 1) {
	        	  gFloatNotes.indicator_above.attachTo(doc);
        		  gFloatNotes.indicator_below.attachTo(doc); 
	        	  this._attachScrollHandler(doc);
	          }
	          note.edit();
	      },
	      
	      deleteNote: function() {
	    	  if(this.contextNote) {
	    		  this._delete_note_statement.params.id = this.contextNote.data.id;
	    		  var that = this;
	    		  try {
	    			  
	    			  this._delete_note_statement.executeAsync({
	    				  handleResult: function(aResultSet) {
	    			  },

	    			  handleError: function(aError) {

	    			  },
	    			  handleCompletion: function(aReason) {
	    				  if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
	    					  return;
	    				  }
	    				  that.contextNote.detach();
	    				  that.contextNote.dom = null;
	    				  that.notes[that.contextNote.data.id] = null;
	    				  that.contextNote = null;
	    			  }
	    			  });
	    		  }
	    		  finally {
	    			this._delete_note_statement.reset();  
	    		  }
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
	  			this.docs[domain].forEach(function(obj) {if(obj && obj.dom) obj.dom.style.display = "none";});
	  		    this._removeScrollHandler();
	  		    this.indicator_above.hide(true);
	  		    this.indicator_below.hide(true);
	  		    this.status[domain]['hidden'] = true;
	  		    this._updateMenuText(true);
	  		}
	  		else {
	  		    this.status[domain]['hidden'] = false;
	  		    this.docs[domain].forEach(function(obj) {if(obj && obj.dom) obj.dom.style.display = "block";});
	  		    this._attachScrollHandler(gBrowser.contentDocument);
	  		    util.fireEvent(gBrowser.contentDocument, 'scroll');
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
	        	  // don't show any menu items if in editing mode
	        	  var hide = (this.contextNote.status & status.EDITING);
	              this._deleteMenuItem.hidden = hide;
	              this._editMenuItem.hidden = hide;
	              this._newMenuItem.hidden = true;
	          }
	          else {
	              this._deleteMenuItem.hidden = true;
	              this._editMenuItem.hidden = true;
	              this._newMenuItem.hidden = false;
	          }
	          var domain = gBrowser.contentDocument.location;
	          if(gFloatNotes.docs[domain] && gFloatNotes.docs[domain].length > 0 && !this.contextNote) {
	        	  this._hideMenuItem.hidden = false;
	        	  if(gFloatNotes.status[domain]) {
	        		  this._updateMenuText(gFloatNotes.status[domain]['hidden']);
	        	  }
	        	  else {
	        		  this._updateMenuText(false);
	        	  }
	        	  
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
	  		    item.setAttribute('oncommand', "gFloatNotes.contextNote.updateLocation(this.value);");
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
	  			this._hideMenuItem.setAttribute('label', this.stringsBundle.getFormattedString('showNotesString', [this.docs[gBrowser.contentDocument.location].filter(function(obj) {return obj && obj.dom;}).length], 1));
	  			this._hideMenuItem.setAttribute('image', 'chrome://floatnotes/skin/unhide_note_small.png');
	  		}
	      }
	  };
