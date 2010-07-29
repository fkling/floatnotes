#ifndef __INCLUDE_MANAGER_
#define __INCLUDE_MANAGER_

#include "note.js"
#include "indicator.js"
#include "util.js"

function FloatNotes(database) {
	this._db = database;
	this.converter = new Showdown.converter();
	this.status = {};
	this.docs = {};
	this.notes = {};
	
	// get references to menu items
    this._deleteMenuItem = document.getElementById('floatnotes-delete-note');
    this._locationsMenu = document.getElementById('floatnotes-edit-note');
    this._editMenuItem = document.getElementById('floatnotes-edit-note');
    this._hideMenuItem = document.getElementById('floatnotes-hide-note');
    this._newMenuItem = document.getElementById('floatnotes-new-note');
   
    // create indicators	    		
    this.indicator_above = new Indicator(1);
    this.indicator_below = new Indicator(-1);
    
    // attach load handler
    gBrowser.addEventListener("load", function(e){gFloatNotesManager.onPageLoad(e);}, true);
    var container = gBrowser.tabContainer;
    container.addEventListener("TabSelect", function(e){gFloatNotesManager.onTabSelect(e);}, false);
    window.addEventListener("contextmenu", function(e) {gFloatNotesManager.updateContext(e);}, true);
    window.addEventListener("contextmenu", function(e) {gFloatNotesManager.updateMenuItems(e);}, false);
    
}
  
 var scoller = function() {
	 gFloatNotesManager.startScrollTimer();
 };
  
  
/**
 * FloatNotes global object prototype. Contains all the functions to load,
 * add, delete and save the notes.
 * 
 */
FloatNotes.prototype = {
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
              this.updatePreferences();  

              var doc = win.document; // doc is document that triggered "onload" event                       
              if(doc === gBrowser.contentDocument) {
	              this.loadNotes(gBrowser.contentDocument);
              }
      	}
      },
      
      updatePreferences: function() {
    	  this._scrolltimeout = util.getPreferencesService().getIntPref('scrolltimer');
          this.indicator_timeout = util.getPreferencesService().getIntPref('fadeOutAfter');
          this.show_indicators = util.getPreferencesService().getBoolPref('showIndicator');
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
	  	    	this._updateMenuText(this.status[domain]['hidden']);
	  	    }
	  	    this._showIndicators(doc);
      	}
      },
      
      /**
       * Load and attach the notes
       */
      loadNotes: function(doc) {
    	  // don't load stuff for about pages
    	  if(doc.location.href.indexOf('about:') === 0)
    		  return;
    	  
    	  var that = this;
    	  
          this._db.getNotesForURLs(this._getLocations(doc, true), function(notesdata) {
        	  var notes = Array();
        	  var manager = that;
        	  
              manager.docs[doc.location] = notes;
              
              for (var i = 0, length = notesdata.length; i < length;i++) {
        		  
            	  var data = notesdata[i];
            	  
        		  if(manager.notes[data.id] === undefined) {
        			  manager.notes[data.id] = new FloatNote(data, manager, manager.converter);
        		  }  					
        		  notes.push(manager.notes[data.id]);
        	  }
              manager._attachNotesTo(doc);
        	  manager._showIndicators(doc);
          });
    	  
      },
      
      _showIndicators: function(doc) {
    	  if(this.show_indicators) {
    		  this.indicator_above.attachTo(doc);
    		  this.indicator_below.attachTo(doc); 
    		  this._attachScrollHandler(doc);
    		  util.fireEvent(doc, 'scroll');
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
      				note.attachToDocument(doc);	
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
		var data = note.data;
		var that = this;
		
		// new or update ?
		
		if(typeof data.id == "undefined") {
			this._db.createNoteAndGetId(data, function(id) {
				note.dom.id =  'floatnotes-note-' + data.id;
		    	note.data = data;
		    	that.notes[data.id] = note;
		    	note.status ^= status.NEEDS_SAVE;
			});
		}
		else {
			this._db.updateNote(data, function() {
		    	note.status ^= status.NEEDS_SAVE;
			});
		}		
      },
      
      addNote: function() {
          var doc = gBrowser.contentDocument;
          var note = new FloatNote({
  			x: this.X,
  			y:this.Y,
  			w: util.getPreferencesService().getIntPref('width'),
  			h: util.getPreferencesService().getIntPref('height'),
  			content: "",
  			url: this._getDefaultUrl(),
  			color: util.getPreferencesService().getCharPref('color'),
  			collapse: false}, this, this.converter);
          if(!this.docs[doc.location]) {
        	  this.docs[doc.location] = Array();	        	  
          }
          this.docs[doc.location].push(note);       
          note.attachToDocument(doc);
          if(this.docs[doc.location].length == 1) {
        	  this.indicator_above.attachTo(doc);
    		  this.indicator_below.attachTo(doc); 
        	  this._attachScrollHandler(doc);
          }
          note.edit();
      },
      
      deleteNote: function() {
    	  if(this.contextNote) {
    		  var that = this;
    		  
    		  this._db.deleteNote(this.contextNote.data.id, function() {
    			  that.contextNote.detach();
				  that.contextNote.dom = null;
				  that.notes[that.contextNote.data.id] = null;
				  that.contextNote = null;
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
      	var default_loc = util.getPreferencesService().getIntPref('location');
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
          if(this.docs[domain] && this.docs[domain].length > 0 && !this.contextNote) {
        	  this._hideMenuItem.hidden = false;
        	  if(this.status[domain]) {
        		  this._updateMenuText(this.status[domain]['hidden']);
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
  		    item.setAttribute('oncommand', "gFloatNotesManager.contextNote.updateLocation(this.value);");
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

#endif
