function FloatNote(x, y, id, url, content, width, height, collapsed, color) {
    this.id = id;
    this.url = url || gFloatNotes.getDefaultUrl();
    this.content = content || ':)';
    this.width = width || this.defaultWidth;
    this.height = height || this.defaultHeight;
    this.x = x;
    this.y = y;
    this.changed = false;
    this.onedit = false;
    this.collapsed = collapsed || false;
    this.color = color || this.defaultColor
}

function markChanged(note) {
    note.changed = true;
    note.save();
}

FloatNote.prototype = {
    createNode: function(doc) {
        this._node = doc.createElement('div');
        this._node.style.backgroundColor = this.defaultColor;
        this._node.className = 'floatnotes-note';

        var big_div = doc.createElement('div');
        big_div.className = 'big';

        var header_div = doc.createElement('div');
        header_div.className = 'drag';

        var content_div = doc.createElement('div');
        content_div.innerHTML = gFloatNotes.converter.makeHtml(this.content);
        content_div.className = 'content';

        var resize_h = doc.createElement('div');
        resize_h.className = 'resize';

        big_div.appendChild(content_div);


        this._node.appendChild(header_div);
        this._node.appendChild(big_div);
        this._node.appendChild(resize_h);

        jQuery(doc.body).append(this._node);
        var $node = jQuery(this._node);
        $node.css({'width': this.width, 'height': this.height, 'top': this.y, 'left': this.x, 'position': 'absolute'});

        var note = this;


        jQuery('.drag', $node).dblclick(function(e) {note.collapse(e)});
        if(this.collapsed) this.collapse();

        $node.jqResize('.resize', function(w, h) {
            jQuery('textarea', $node).css('height', parseInt(h) - 10);
           },
           function() {
            note.width = parseInt($node.css('width'));
            note.height = parseInt($node.css('height'));
            markChanged(note);
        }).jqDrag('.drag', function() {
            note.x = parseInt($node.css('left'));
            note.y = parseInt($node.css('top'));
             markChanged(note);
        }).mouseleave(function() {

        });
        jQuery('.content', $node).dblclick(function(e) {
           e.preventDefault();
           note.edit();
        });
        this._node.addEventListener('contextmenu', function(e){e.floatnote = note}, false);
    },
    createMenu: function(e) {
        alert(window.getElementById('contentAreaContextMenu'));
    },
    collapse: function(e) {
        this.collapsed = true;
        markChanged(this);

        if (e) e.preventDefault();
        var note = this;
        var $node = jQuery(this._node).addClass('small');
        var $handler = jQuery('.drag',$node);
        $handler.unbind('dblclick');
        $node.hover(function() {
                $node.removeClass('small');
            },
            function() {
                if(note.collapsed)
                    $node.addClass('small');
            }
        );

        $node.click(function(e) {
            if(e.target.className != 'drag') {
                note.collapsed = false;
                markChanged(note);
                $node.removeClass('small').unbind('click').hover(null, null);
                $handler.dblclick(function(e) {note.collapse(e)});
            }

        });
    },
    edit: function(doc) {
        this.onedit = true;
        var $content = jQuery('.content', this._node).hide();
        var note = this;
        jQuery('.content', this._node).after('<textarea id="floatnotes-input"></textarea>');

        var bla = function(e) {
            if(e.target.id != "floatnotes-input" &&
               e.target.className != 'resize' &&
               e.target.className != 'drag') {
                e.preventDefault();
                note.content = jQuery('textarea', note._node).val();
                $content.html(gFloatNotes.converter.makeHtml(jQuery('textarea', note._node).val())).show();
                jQuery('textarea', note._node).remove()
                note.onedit = false;
                markChanged(note);
                window.content.removeEventListener('click', bla, true);
            }
        }

        window.content.addEventListener('click', bla, true);
        jQuery('textarea', this._node).focus();
        jQuery('textarea', this._node).first().css('height', parseInt(jQuery(note._node).css('height')) -10).text(this.content);
    },
    remove: function() {

    },
    save: function() {
        if(!this.onedit) {
        if(this.changed) {
            this.changed = false;
            if(this.id) {
                var statement = this._db.createStatement("UPDATE floatnotes  SET content=:content, h=:h, w=:w, x=:x, y=:y, collapse=:collapse, color=:color, url=:url WHERE id = :id");
                statement.params.id = this.id;

            }
            else {
                var statement = this._db.createStatement("INSERT INTO floatnotes  (url, content, h, w, x, y, collapse, color) VALUES ( :url, :content, :h, :w, :x, :y, :collapse, :color)");
                var insert = true;
            }
	    statement.params.url = this.url;
            statement.params.content = this.content;
            statement.params.h = this.height;
            statement.params.w = this.width;
            statement.params.x = this.x;
            statement.params.y = this.y;
            statement.params.collapse = this.collapsed;
            statement.params.color = this.color;

            var note = this;
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
                        note.id = note._db.lastInsertRowID;
			gFloatNotes.updateNumberOfNotes();
                    }
                }
            });
        }
        }
    },
    setUrl: function(url) {
	this.url = url;
	markChanged(this);
    }
}

function FloatNotes() {
    this._db = null;
    this.notes = {}
    this.converter = new Showdown.converter()
    this.status = {}
    this.notes = {}
}

FloatNotes.prototype = {
    init: function() {
        var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
        file.append("floatnotes.sqlite");

        var storageService = Components.classes["@mozilla.org/storage/service;1"]
                        .getService(Components.interfaces.mozIStorageService);
        this._db = storageService.openDatabase(file); // Will also create the file if it does not exist
        this._db.executeSimpleSQL('CREATE TABLE IF NOT EXISTS floatnotes (id INTEGER PRIMARY KEY, url TEXT, content TEXT, x INTEGER, y INTEGER, w INTEGER, h INTEGER, color TEXT, collapse INTEGER)')
        this._db.executeSimpleSQL('CREATE INDEX IF NOT EXISTS urls ON floatnotes (url)')
        this._select_statement = this._db.createStatement("SELECT * FROM floatnotes WHERE url = :url");
        var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

	this._deleteMenuItem = document.getElementById('floatnotes-delete-note');
	this._locationsMenu = document.getElementById('floatnotes-edit-note');
	this._editMenuItem = document.getElementById('floatnotes-edit-note');

        FloatNote.prototype.defaultHeight = prefManager.getIntPref('extensions.floatnotes.height');
        FloatNote.prototype.defaultWidth = prefManager.getIntPref('extensions.floatnotes.width');
        FloatNote.prototype.defaultColor = prefManager.getCharPref('extensions.floatnotes.color');
	this._defaultLocation = prefManager.getIntPref('extensions.floatnotes.location');

        FloatNote.prototype._db = this._db;

        var appcontent = document.getElementById("appcontent");   // browser
        if(appcontent)
            appcontent.addEventListener("DOMContentLoaded", function(e){gFloatNotes.onPageLoad(e)}, true);
        var messagepane = document.getElementById("messagepane"); // mail
        if(messagepane)
            messagepane.addEventListener("load", function () { myExtension.onPageLoad(); }, true);
    },

    onPageLoad: function(aEvent) {
        var doc = aEvent.originalTarget; // doc is document that triggered "onload" event
        var style = doc.getElementById("floatnotes-style");
        if(!style) {
            style = doc.createElement('link');
            style.id = 'floatnotes-style';
            style.rel = "stylesheet";
	    style.href = "chrome://floatnotes/skin/notes.css";
            style.type = "text/css";
	    doc.getElementsByTagName('head')[0].appendChild(style);
        }
        let statement = this._db.createStatement("SELECT * FROM floatnotes WHERE url = :url");
	var urls = this.getLocations(true);
	let params = statement.newBindingParamsArray();

	for each (let p in urls) {
	    let bp = params.newBindingParams();
	    bp.bindByName('url', p);
	    params.addParams(bp);
	}
        statement.bindParameters(params);
        statement.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    var a = new FloatNote(
                                  row.getResultByName("x"),
                                  row.getResultByName("y"),
                                  row.getResultByName("id"),
                                  row.getResultByName("url"),
                                  row.getResultByName("content"),
                                  row.getResultByName("w"),
                                  row.getResultByName("h"),
                                  row.getResultByName("collapse"),
                                  row.getResultByName("color"));
                    a.createNode(doc);
                }
		gFloatNotes.updateNumberOfNotes();
		var domain = window.content.document.location;
		if(gFloatNotes.status[domain] && gFloatNotes.status[domain]['hidden'] == true) {
	    gFloatNotes.updateContextText(true);
	}
	else {
	     gFloatNotes.updateContextText(false);
	}
            },

            handleError: function(aError) {
                print("Error: " + aError.message);
            },

            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
                print("Query canceled or aborted!");
            }
        });

    },

    _loadNotes: function() {

    },

    onContextMenuSelect: function() {
        var doc = window.content.document;
        var note = new FloatNote(this.X, this.Y);
        note.createNode(doc);
        note.edit(doc);
	document.getElementById('floatnotes-hide-note').hidden = false;
    },
    update: function(event) {
        if(event.floatnote) {
            this.contextNote = event.floatnote;
        }
        else {
            this.contextNote = null;
        }

         this.X = event.pageX;
         this.Y = event.pageY;
    },
    setContextNote: function(note) {
        this.contextNote = note;
    },
    getDefaultUrl: function() {
	var loc = this.getLocations();
	if(this._defaultLocation == 0) {
	    return loc[0];
	}
	if(window.content.document.location.search) {
	    return loc[loc.length + this._defaultLocation];
	}
	else {
	    return loc[loc.length + this._defaultLocation +1];
	}

    },
    deleteNote: function() {
        var statement = this._db.createStatement("DELETE FROM floatnotes WHERE id = :id");
        statement.params.id = this.contextNote.id;
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
		gFloatNotes.updateNumberOfNotes();
                jQuery(t.contextNote._node).remove();
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
	if(this.status[domain] && this.status[domain]['hidden'] == true) {
	    this.updateContextText(true);
	}
	else {
	     this.updateContextText(false);
	}
    },
    getLocations: function(search) {
	var location = window.content.document.location;
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
	    for each (let p in parts) {
	        path += p;
	        //if(!search)
	        //    urls.push(path);
	        urls.push( path + '*');
	        path += '/';
	    }
	    var last = urls[urls.length-1];
            last = last.substring(0,last.length-1);
            if(last.charAt(last.length-1) == '/')
                last = last.substring(0,last.length-1)
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
	var loc = this.getLocations();
	for each (let l in loc) {
	    let item = this._locationsMenu.appendItem(l, l);
	    item.setAttribute('type','radio');
	    item.setAttribute('name', 'floatnotes-menu-location');
	    item.setAttribute('checked', (this.contextNote.url == l));
	    item.setAttribute('oncommand', "gFloatNotes.contextNote.setUrl(this.value);");
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
	    this.status[domain] = {};
	    this.status[domain]['hidden'] = false;
	}
	if(!this.status[domain]['hidden']) {

	    this.status[domain]['hidden'] = true;
	    this.updateContextText(true);
	}
	else {

	    this.status[domain]['hidden'] = false;
	    this.updateContextText(false);
	}

    },
    updateContextText: function(hide) {
	var el = document.getElementById('floatnotes-hide-note');
	if(!hide) {
	    jQuery('.floatnotes-note', window.content.document).show();
	    el.setAttribute('label', 'Hide notes');
	    el.setAttribute('image', 'chrome://floatnotes/skin/hide_note_small.png');
	}
	else {
	    jQuery('.floatnotes-note', window.content.document).hide();
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
}

var gFloatNotes = new FloatNotes();

window.addEventListener("load", function(){gFloatNotes.init(); }, false);
window.addEventListener("contextmenu", function(e) {gFloatNotes.update(e)}, false);
window.addEventListener("popupshowing", function(e) {gFloatNotes.showHideMenu(e)}, false);
