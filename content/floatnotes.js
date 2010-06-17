function FloatNotes() {
    this.db = null;
    this.converter = new Showdown.converter();
    this.status = {};
}

(function ($) {
$.support.opacity = true;

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

	    // enable indicators
	    if(this.pref.getBoolPref('showIndicator')) {
      	    var $above = $('<div id="floatnotes-above" class="floatnotes-indicator" ><div class="floatnotes-label"></div><div class="floatnotes-texts"></div></div>', doc)
          	.css({position: 'fixed', top: 0, left: 0})
          	.data({'count': 0, 'label': this.stringsBundle.getString('aboveIndicatorString')})
          	.find('.floatnotes-texts').hide().end()
          	.hover(function(){
          			$(this).trigger('reset').find('.floatnotes-texts').show();
          			$.doTimeout('fade-' + this.id);
          		}, function() {
          			$(this).trigger('fade').find('.floatnotes-texts').hide();
          		})
          	.hide()
          	.delegate('.floatnotes-text', 'click', {doc: doc}, function(event) {
          			$(this).parent().hide();
          			$(event.data.doc).scrollTo(Math.max(parseInt($(this).data('top')) - 20,0),  {easing:'swing', duration: 500});
          		})
          	.bind('reset', {doc: doc}, function(event) {
          		$(this, event.data.doc).stop(true, true).show().css('opacity', 1);
          	})
          	.appendTo(doc.body);
      
          	var fadeout;
          	if((fadeout = this.pref.getIntPref('fadeOutAfter')) > 0) {
          		$above.bind('fade', {doc: doc}, function(event) {
          			var that = this;
          			$.doTimeout('fade-' + this.id, fadeout*1000, function() {
          				$(that, event.data.doc).fadeOut(800);
          			});
          			
          		});
          	}
      
          	var $below = $above.clone(true)
          	.attr('id', 'floatnotes-below')
          	.data('label', this.stringsBundle.getString('belowIndicatorString'))
          	.css({bottom: 0, top: ''})
          	.appendTo(doc.body);
	    	this._attachScrollHandler(win, doc);
	    }

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
		
					var note = gFloatNotes._createNote(data, doc);
					if(note.data('collapsed') == true) {
					    note.trigger('collapse');
					}
			    }
			    // hide notes for this domain if previously hidden
			    var domain = doc.location;
			    if(gFloatNotes.status[domain]) {
			    	gFloatNotes._updateMenuText(gFloatNotes.status[domain]['hidden']);
			    }
			    $(doc).trigger('scroll');
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
    
    _attachScrollHandler: function(win, doc) {
    	var $above = $('#floatnotes-above', doc);
    	var $below = $('#floatnotes-below', doc);
    	$(doc).bind('scroll.floatnotes', function(e) {
    		var doc = this;
    		$.doTimeout('scroll', 75, function(){
    			var wintop = parseInt($(doc).scrollTop()),
    				winheight = parseInt($(win).height());
	    		$above.trigger('reset');
	    		$below.trigger('reset');
	    		$('.floatnotes-note', doc)
	    		//.filter(function(){return $(this).data('id');})
	    		.each(function() {	
	    				var id = 'floatnotes-text-' + $(this).data('id'),
	    					top = parseInt($(this).css('top')),
	    					bottom = parseInt($(this).css('top')) + parseInt($(this).height());
	    				var $position = null;
	    				if (wintop > bottom) {
	    					$position = $above;
	    				}
	    				else if(wintop + winheight < top) {
	    					$position = $below;
	    				}
	    				if($position) {	    				
	    					if($position.find('#' + id).length == 0) {
	    						var ele = $('<div class="floatnotes-text"></div>', doc).attr('id', id)
		    					.text($(this).find('.floatnotes-content').text())
		    					.data('top', $(this).css('top'));
	    						$position.data('count', $position.data('count') + 1);
	    						ele.appendTo($position.children('.floatnotes-texts'));
	    					}
	    				}
	    				else {
	    					$position = $('#' + id, doc).closest('.floatnotes-indicator');
	    					$position.data('count', $position.data('count') -1);
	    					$('#' + id, doc).remove();
	    				}
	    		});
	    			
	    			
	    		$.each([$above, $below], function() {
	    			var data = this.data();
	    			if(data.count > 0) {
	    				this
	   					.find('.floatnotes-label')
	   					.text(data.count + ' ' + (data.count > 1 ? gFloatNotes.stringsBundle.getString('pluralIndicatorString'): gFloatNotes.stringsBundle.getString('singularIndicatorString')) +  " " + data.label)
	   					.end()
	   					.show().trigger('fade');
    				}	    				
    				else {
	    				this.hide();
	    			}			
	    		});
	    	});
    	});
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
    /* Create a new note */
    _createNote: function(data, doc) {
    	
    	// small function to compute the size of the textarea properly
        var resizeTextarea = function(context, width, height) {
        	var $ta = $('textarea', context);
        	var $context = $(context);
        	$ta.css('height', parseInt(height)
		          - 2*$context.css('border-width')
		          - 2*parseInt($ta.css('padding-left')))
		    .css('width', parseInt(width)
		          - 2*$context.css('border-width')
		          - 2*parseInt($ta.css('padding-left')));
        };
        
        var inf = function() {
        	if($(this).data('collapsed')) {
        		$(this).trigger('uncollapse');
        	}
        	$('.floatnotes-drag, .floatnotes-resize', this).show();
        };
        var outf = function() {
        	$('.floatnotes-drag, .floatnotes-resize', this).hide();
        	if($(this).data('collapsed'))
        		$(this).trigger('collapse', [false, true]);
        };
        
        // create the divs, set and bind all necessary handlers
        return $('<div class="floatnotes-note"><div class="floatnotes-drag"></div><div class="floatnotes-content"></div><textarea></textarea><div class="floatnotes-resize"></div></div>', doc)
        .data(data)
        .find('textarea').hide().end()
        .find('.floatnotes-drag')
	    	.dblclick(function(){ // note collapses on dblclick if not editing
	    		if(!$(this).parent().hasClass('note-edit'))
	    			$(this).hide().trigger('collapse',[true, true]);
	    		})
	    		.hide()
	    .end()
	    .find('.floatnotes-resize').hide().end()
	    .find('.floatnotes-content')
	    	.bind('dblclick', function() { // dblclick enables editing
	    		$(this).trigger('start-edit');
	    	})
	    	.html(gFloatNotes.converter.makeHtml(data.content))
	    	.end()
	    .click(function(e) { // if clicked in the context area, the note stays uncollapsed
	    	if(e.target.className != 'floatnotes-drag' && e.target.className != 'floatnotes-resize' && $(this).data('collapsed')) {
	    		var data = $(this).data();
                data.collapsed = false;
                $(this).addClass('needs-save').trigger('save');
            }
	    	if($(this).hasClass('note-edit')) {
	    		e.stopPropagation();
	    	}
	    })
	    .mousedown(function() {   	 // bring note to front
	    	var maxz = Math.max.apply(this, $(this).siblings('.floatnotes-note').map(function(){return parseInt($(this).css('z-index'));}).get());
	    	if(maxz)
	    		$(this).css('z-index', maxz+1);
	    })
        .jqResize('.floatnotes-resize', function() {
        		$(this).unbind('mouseenter mouseleave');
        	}, function(w, h) {
	        	$(this).unbind('mouseenter mouseleave');
	        	if($(this).hasClass('note-edit')) {
	        		resizeTextarea(this, w, h);
	        	}
	        },
	        function() {
		        var data = $(this).data();
		        data.w = parseInt($(this).css('width'));
	            data.h = parseInt($(this).css('height'));
	            $(this).addClass('needs-save').trigger('save');
	            $(this).removeClass('floatnotes-resizing');
	            $(this).hover(inf, outf);
        })
        .jqDrag('.floatnotes-drag', function() {
	        	$(this).unbind('mouseenter mouseleave');
		    },
		    null,
		    function() {
		    	var data = $(this).data();
	             	data.x = parseInt($(this).css('left'));
	             	data.y = parseInt($(this).css('top'));
	             	$(this).addClass('needs-save').trigger('save');
	             	$(this).removeClass('floatnotes-dragging');
	             	 $(this).hover(inf, outf);
        })
        .css({'width': data.w, 'height': data.h, 'top': data.y, 'left': data.x, 'position': 'absolute'})
        .hover(inf, outf)
        .bind({
        	'collapse': function(event, save, animate) {
        		var data = $(this).data();
        		if(!data.collapsed) {
        			data.collapsed = true;
        		}
        		if(animate) {
        			$(this).animate({height: '16px',width:'16px'}, 'fast', function() {
            			$(this).addClass('small needs-save');
            			if(save) $(this).trigger('save');
            		});
        		}
        		else {
        			$(this).addClass('small needs-save');
        			if(save) $(this).trigger('save');
        		}
	    	},
	    	'uncollapse': function() {
	    		if($(this).hasClass('small')) {
    	    		var data = $(this).data();
    	    		$(this).removeClass('small').css({width: data.w, height: data.h});
    	    	}
	    	},
	    	'start-edit': function() {
	    		var $note = $(this);
	    		$('.floatnotes-content', this).hide();
	    		$('textarea', this).show().html($note.data('content')).focus();
	    		$note.addClass('note-edit');
	    		resizeTextarea(this, $note.width(), $note.height());
	    		$(window).bind('click.floatnotes', {note: $note}, function(e) {
	    			$(this).unbind('click.floatnotes');
	    			e.data.note.trigger('end-edit');
	    		});
	    	},
	    	'end-edit': function() {
	    		var data = $(this).data();
	    		$(this)
	    		.find('textarea')
	    			.each(function(){data.content = $(this).val();})
	    			.hide()
	    		.end()
	    		.find('.floatnotes-content')
	    			.html(gFloatNotes.converter.makeHtml(data.content))
	    			.show()
	    		.end()
	    		.removeClass('note-edit')
	    		.addClass('needs-save')
	    		.trigger('save');
	    	},
	    	'save.floatnotes': function() {
	    		var note = $(this);
	    		if(!note.hasClass('note-edit')) {
	    			var data = note.data();
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
						    }
						    note.removeClass('needs-save');
						}
				    });
	    		}
	    	},
	    	'contextmenu': function(e){
	    		gFloatNotes.contextNote = $(this);
	    	}
        })
        .appendTo(doc.body);
    },
    
    addNote: function() {
        var doc = window.content.document;
        this._injectStylesheet(doc);
        var note = this._createNote({
			x:this.X,
			y:this.Y,
			w: this.pref.getIntPref('width'),
			h: this.pref.getIntPref('height'),
			content: "",
			url: this._getDefaultUrl(),
			color: '#AAA',
			collapsed: false}, doc);
        note.trigger('start-edit', [doc]);
    },
    
    deleteNote: function() {
        var statement = this.db.createStatement("DELETE FROM floatnotes WHERE id = :id");
        statement.params.id = this.contextNote.data('id');
        var t = this;
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
                t.contextNote.remove();
                t.contextNote = null;
            }
        });
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
		    $('.floatnotes-note', window.content.document).hide();
		    this.status[domain]['hidden'] = true;
		    $(window.content.document).unbind("scroll.floatnotes");
		    this._updateMenuText(true);
		}
		else {
		    this.status[domain]['hidden'] = false;
		    $('.floatnotes-note', window.content.document).show();
		    this._attachScrollHandler(window.content, window.content.document);
		    $(window.content.document).trigger('scroll');
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
		var domain = window.content.document.location;
		if($('.floatnotes-note', window.content.document).length) {
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
		    item.setAttribute('checked', (this.contextNote.data('url') == loc[i]));
		    item.setAttribute('oncommand', "gFloatNotes.contextNote.data('url',this.value).addClass('needs-save').trigger('save');");
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
			this._hideMenuItem.setAttribute('label', this.stringsBundle.getFormattedString('showNotesString', [jQuery('.floatnotes-note', window.content.document).length ]));
			this._hideMenuItem.setAttribute('image', 'chrome://floatnotes/skin/unhide_note_small.png');
		}
    }
};

})(jQuery.noConflict());

var gFloatNotes = new FloatNotes();
window.addEventListener("load", function(){gFloatNotes.init(); }, false);
window.addEventListener("contextmenu", function(e) {gFloatNotes.updateContext(e);}, true);
window.addEventListener("contextmenu", function(e) {gFloatNotes.updateMenuItems(e);}, false);