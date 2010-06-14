function FloatNotes() {
    this.db = null;
    this.converter = new Showdown.converter();
    this.status = {};
}

(function($){
$.support.opacity = true;

FloatNotes.prototype = {
    /* Initial startup */
    init: function() {

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

	//var appcontent = document.getElementById("appcontent");   // browser
	//if(appcontent)
	 //   appcontent.addEventListener("load", function () {
	  // Add a callback to be run every time a document loads.
	  // note that this includes frames/iframes within the document
	  gBrowser.addEventListener("load", function(e){gFloatNotes.onPageLoad(e);}, true);
	//}, true);

        /*var messagepane = document.getElementById("messagepane"); // mail
        if(messagepane)
            messagepane.addEventListener("load", function () { myExtension.onPageLoad(); }, true);*/

    },

    onPageLoad: function(event) {
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
	    	.find('.floatnotes-texts').hide().end()
	    	.hover(function(){
	    			$(this).trigger('reset').find('.floatnotes-texts').show();
	    		}, function() {
	    			$(this).trigger('fade').find('.floatnotes-texts').hide();
	    		})
	    	.hide()
	    	.delegate('.floatnotes-text', 'click', {doc: doc}, function(event) {
	    			$(this).closest('.floatnotes-texts').hide();
	    			$(event.data.doc).scrollTo(Math.max(parseInt($(this).data('top')) - 20,0),  {easing:'swing', duration: 500});
	    		})
	    	.data('count', 0)
	    	.bind('reset', {doc: doc}, function() {
	    		$(this, doc).stop(true, true).show().css('opacity', 1);
	    	})
	    	.appendTo(doc.body);

	    	var fadeout;
	    	if((fadeout = this.pref.getIntPref('fadeOutAfter')) > 0) {
	    		$above.bind('fade', {doc: doc}, function(event) {
	    			$(this, event.data.doc).trigger('reset').delay(fadeout * 1000).fadeOut(800);
	    		});
	    	}

	    	var $below = $above.clone(true)
	    	.attr('id', 'floatnotes-below')
	    	.css({bottom: 0, top: ''})
	    	.appendTo(doc.body);
	    	/*
	    	$(doc).delegate('.floatnotes-note', 'floatnoteupdate', {above:$above, below:$below, doc: doc}, function(e, wintop){
	    		var prev_view = $(this).data('in_view'),
	    			in_view = true,
	    			$position = null,
	    			doc = e.data.doc,
	    			suffix, top, bottom;
	    		
	    		top = parseInt($(this).css('top')),
				bottom = parseInt($(this).css('top')) + parseInt($(this).height());
	    		if(wintop > bottom) {
					$position = e.data.above;
					suffix = 'above';
					in_view = false;
				}
				else if(wintop + $(win).height() < top) {
					$position = e.data.below;
					suffix = 'below';
					in_view = false;
				}
	    		if(prev_view != in_view) {
	    			var id = 'floatnotes-text-' + $(this).data('id');
	    			$(this).data('in_view', in_view);
	    			if(in_view) {
	    				$('#' + id, doc).remove();
	    				$position = $('#' + id, doc).closest('.floatnotes-indicator');
	    			}
	    			else {
	    				var ele = $('<div class="floatnotes-text"></div>', doc).attr('id', id)
	    				.text($(this).find('.floatnotes-content').text())
	    				.data('top', $(this).css('top'));    				
	    				ele.appendTo($position.find('.floatnotes-texts'));
	    			}
	    		}
		    	if($('.floatnotes-text',$above).length) {
		    		$above
		    		.children('.floatnotes-label').text($('.floatnotes-text',$above).length + ' note' + (($('.floatnotes-text',$above).length > 1) ? 's ': ' ') + 'above').end()
		    		.trigger('reset').show().trigger('fade');
		    	}
		    	else {
		    		$above
		    		.trigger('reset').hide();
		    	}
		    	if($('.floatnotes-text',$below).length) {
		    		$below
		    		.children('.floatnotes-label').text($('.floatnotes-text',$below).length + ' note' + (($('.floatnotes-text',$below).length > 1) ? 's ': ' ') + 'below').end()
		    		.trigger('reset').show().trigger('fade');
		    	}
		    	else {
		    		$below.trigger('reset').hide();
		    	}
	    	});
	    }
	    $(doc).bind('scroll', function() {
	    	$('.floatnotes-note:visible', this).trigger('floatnoteupdate',$(this).scrollTop());
	    });
	    */
	    	$(doc).bind('scroll', function(e) {
	    		var doc = this;
	    		$above.trigger('reset');
	    		$below.trigger('reset');
	    		var $above_texts = $('.floatnotes-texts', $above),
			    	$below_texts = $('.floatnotes-texts', $below);
	    			$('.floatnotes-note:visible', doc)
	    			.filter(function(){return $(this).data('id');})
	    			.each(function() {

	    				var id = 'floatnotes-text-' + $(this).data('id'),
	    					top = parseInt($(this).css('top')),
	    					bottom = parseInt($(this).css('top')) + parseInt($(this).height());
	    				var ele = $('<div class="floatnotes-text"></div>', doc).attr('id', id)
	    					.text($(this).find('.floatnotes-content').text())
	    					.data('top', $(this).css('top'));

	    				var $position = null;
	    				if($(doc).scrollTop() > bottom) {
	    					$position = $above;
	    				}
	    				else if(($(doc).scrollTop() + $(win).height()) < top) {
	    					$position = $below;
	    				}
	    				
	    				if($position) {	    				
	    					if($position.find('#' + id).length == 0) {
	    						$position.data('count', $above.data('count') + 1);
	    						ele.appendTo($position.find('.floatnotes-texts'));
	    					}
	    				}
	    				else {
	    					$position = $('#' + id, doc).closest('.floatnotes-indicator');
	    					$position.data('count', $position.data('count') -1);
	    					$('#' + id, doc).remove();
	    				}
	    			});
	    			
	    			$.each({'above': $above, 'below': $below}, function(i, val) {
	    				var count = val.data('count');
	    				if(count > 0) {
	    					val
	    					.find('.floatnotes-label')
	    					.text(count + ' note'  + (count > 1 ? 's ': ' ') +  i)
	    					.end()
	    					.show().trigger('fade');
	    				}
	    				else {
	    					val.hide();
	    				}			
	    			});
	    	});
	    }

	    // Get notes for this site
	    var statement = this.db.createStatement("SELECT * FROM floatnotes WHERE url = :url");
	    var urls = this.getLocations(doc, true);
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
			    	gFloatNotes.injectStylesheet(doc);
			    
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
		
					var note = gFloatNotes.createNote(data, doc);
					if(note.data('collapsed') == true) {
					    note.trigger('collapse');
					}
			    }
			    // hide notes for this domain if previously hidden
			    var domain = doc.location;
			    if(gFloatNotes.status[domain] && gFloatNotes.status[domain]['hidden'] == true) {
			    	gFloatNotes.updateContextText(true);
			    }
			    else {
			    	gFloatNotes.updateContextText(false);
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
    /* Inject the JS stylesheet to style the notes */
    injectStylesheet: function(doc) {
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
    createNote: function(data, doc) {
    	
    	data = $.extend(data, {in_view: true});
    	
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
        
        var set_hover = function($element) {
        	$element.hover(function() {
        		if($(this).data('collapsed')) {
        			$(this).trigger('uncollapse');
        		}

    	    	$('.floatnotes-drag, .floatnotes-resize', this).show();
    	    },
    	    function() {
        		$('.floatnotes-drag, .floatnotes-resize', this).hide();
    	    	if($(this).data('collapsed'))
    	    		$(this).trigger('collapse');
    	    });
        };
        // create the divs, set and bind all necessary handlers
        var note = $('<div class="floatnotes-note"><div class="floatnotes-drag"></div><div class="floatnotes-content"></div><textarea></textarea><div class="floatnotes-resize"></div></div>', doc)
        .data(data)
        .find('textarea').hide().end()
        .find('.floatnotes-drag')
	    	.dblclick(function(){ // note collapses on dblclick if not editing
	    		if(!$(this).parent().hasClass('note-edit'))
	    			$(this).hide().trigger('collapse',[true]);
	    		})
	    		.hide()
	    .end()
	    .find('.floatnotes-resize').hide().end()
	    .find('.floatnotes-content')
	    	.bind('dblclick', {docs: doc}, function(event) { // dblclick enables editing
	    		var doc = event.data.docs;
	    		$(this).trigger('start-edit', [doc]);
	    	})
	    	.html(gFloatNotes.converter.makeHtml(data.content))
	    	.end()
	    .click(function(e) {
	    	if(e.target.className != 'floatnotes-drag' && e.target.className != 'floatnotes-resize' && $(this).data('collapsed')) {
	    		var data = $(this).data();
                data.collapsed = false;
                $(this).addClass('needs-save').trigger('save');
            }
	    	if($(this).hasClass('note-edit')) {
	    		e.stopPropagation();
	    	}
	    	var maxz = Math.max($(this).siblings('.floatnotes-note').css('z-index'));
	    	if(maxz)
	    		$(this).css('z-index', maxz+1);
	    })
	    .css({'width': data.w, 'height': data.h, 'top': data.y, 'left': data.x, 'position': 'absolute'})
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
            set_hover($(this));
            //$(this).mouseout();
        })
        .jqDrag('.floatnotes-drag', function() {
        	$(this).unbind('mouseenter mouseleave');
	    },null,
	    function() {
	    	var data = $(this).data();
             	data.x = parseInt($(this).css('left'));
             	data.y = parseInt($(this).css('top'));
             	$(this).addClass('needs-save').trigger('save');
             	$(this).removeClass('floatnotes-dragging');
             	set_hover($(this));
             	//$(this).mouseout();
        })
        .bind({
        	'collapse': function(save) {
        		var data = $(this).data();
        		if(!data.collapsed) {
        			data.collapsed = true;
        		}
        		$(this).animate({height: '16px',width:'16px'}, 'fast', function() {
        			$(this).addClass('small needs-save');
        			if(save) $(this).trigger('save');
        		});
	    	},
	    	'uncollapse': function(save) {
	    		if($(this).hasClass('small')) {
    	    		var data = $(this).data();
    	    		$(this).removeClass('small').css({width: data.w, height: data.h});
    	    	}
	    	},
	    	'start-edit': function(doc) {
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
        set_hover(note);
        return note;
    },
    
    newNote: function() {
        var doc = window.content.document;
        this.injectStylesheet(doc);
        var note = this.createNote({
			x:this.X,
			y:this.Y,
			w: this.pref.getIntPref('width'),
			h: this.pref.getIntPref('height'),
			content: ":)",
			url: this.getDefaultUrl(),
			color: '#AAA',
			collapsed: false}, doc);
        note.trigger('start-edit', [doc]);
    },
    
    updateContext: function(event) {
        this.contextNote = null;
        this.X = event.pageX;
        this.Y = event.pageY;
    },
    
    getDefaultUrl: function() {
    	var loc = this.getLocations();
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
		//gFloatNotes.updateNumberOfNotes();
                t.contextNote.remove();
                t.contextNote = null;
            }
        });
    },
    
    showHideMenu: function(event) {
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
		    document.getElementById('floatnotes-hide-note').hidden = false;
		    if(this.status[domain] && this.status[domain]['hidden'] == true) {
		    	this.updateContextText(true);
		    }
		    else {
		    	this.updateContextText(false);
		    }
		}
		else {
		    document.getElementById('floatnotes-hide-note').hidden = true;
		}

    },
    getLocations: function(doc) {
		var location = (doc) ? doc.location : window.content.document.location;
		var urls = Array();
		if(location.protocol == 'http:' || location.protocol == 'https:') {
		    var url =  location.href.replace(location.hash, '').replace(location.protocol + '//', '');
		    if(location.search) {
		        var url_with_search = url;
		        url = url_with_search.replace(location.search, '');
		    }
		    parts = url.split('/');
		    path = '';
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
    
    updateMenuLocations: function() {
    	var loc = this.getLocations(window.content);
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
    
    showHideNotes: function() {
		var domain = window.content.document.location;
		if(!this.status[domain]) {
		    this.status[domain] = {
			hidden: false
		    };
		}
		if(!this.status[domain]['hidden']) {
		    $('.floatnotes-note', window.content.document).hide();
		    this.status[domain]['hidden'] = true;
		    this.updateContextText(true);
		}
		else {
		    this.status[domain]['hidden'] = false;
		    this.updateContextText(false);
		    $('.floatnotes-note', window.content.document).show();
		    $(window.content.document).trigger('scroll');
		}

    },
    
    updateContextText: function(hide) {
		var el = document.getElementById('floatnotes-hide-note');
		if(!hide) {
		    el.setAttribute('label', 'Hide notes');
		    el.setAttribute('image', 'chrome://floatnotes/skin/hide_note_small.png');
		}
		else {
		    el.setAttribute('label', 'Show notes (' + jQuery('.floatnotes-note', window.content.document).length +')');
		    el.setAttribute('image', 'chrome://floatnotes/skin/unhide_note_small.png');
		}
    },
    
    collapseNotes: function() {
		var domain = window.content.document.location;
		if(!this.status[domain]) {
		    this.status[domain]['collapse'] = false;
		}
		if(!this.status[domain]['collapse']) {
		    jQuery('.floatnotes', window.content.document).hide();
		    this.status[domain]['collapse'] = true;
		}
		else {
		    jQuery('.floatnotes', window.content.document).show();
		    this.status[domain]['collapse'] = false;
		}
    },
    
    updateNumberOfNotes: function() {
    	document.getElementById('floatnotes-statusbar').setAttribute('label', jQuery('.floatnotes-note', window.content.document).length + ' note(s)');
    }
};

})(jQuery.noConflict());

var gFloatNotes = new FloatNotes();
window.addEventListener("load", function(){gFloatNotes.init(); }, false);
window.addEventListener("contextmenu", function(e) {gFloatNotes.updateContext(e);}, true);
window.addEventListener("popupshowing", function(e) {gFloatNotes.showHideMenu(e);}, false);