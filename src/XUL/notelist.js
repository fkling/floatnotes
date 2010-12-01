Components.utils.import("resource://floatnotes/database.js");
Components.utils.import("resource://floatnotes/manager.js");
Components.utils.import("resource://floatnotes/preferences.js");
Components.utils.import("resource://floatnotes/util-Locale.js");
Components.utils.import("resource://floatnotes/URLHandler.js");

var textBox = document.getElementById('text');
var colorPicker = document.getElementById('color');
var inputBrdcast = document.getElementById('isEnabled');
var deleteButton = document.getElementById('delete');
var saveSearchButton = document.getElementById('saveSearch');
var searchBox = document.getElementById('search');
var searchList = document.getElementById('searches');
var tree = document.getElementById('notes');

var observer = {
    doObserve: true,
    registerObserver: function() {
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService);
        obsService.addObserver(this, 'floatnotes-note-update', false);
        obsService.addObserver(this, 'floatnotes-note-delete', false);
        obsService.addObserver(this, 'floatnotes-note-urlchange', false);
        obsService.addObserver(this, 'floatnotes-note-add', false);
        var that = this;
        function remove() {
            that.removeObserver();
        }
        window.addEventListener('unload',remove , true);
        this._removeUnloadListener = function() { window.removeEventListener('unload', remove, true);};
    },

    removeObserver: function() {
        this._removeUnloadListener();
        var obsService = Components.classes["@mozilla.org/observer-service;1"]
                        .getService(Components.interfaces.nsIObserverService);
        obsService.removeObserver(this, 'floatnotes-note-update');
        obsService.removeObserver(this, 'floatnotes-note-delete');
        obsService.removeObserver(this, 'floatnotes-note-urlchange');
        obsService.removeObserver(this, 'floatnotes-note-add');
    },

    observe: function(subject, topic, data) {
        if(this.doObserve) {
            var selection = treeView.selection;
            search();
            if(selection && selection.count === 1) {
                selection.select(selection.currentIndex);
            }
        }
    }
}



var dragHandler = {
    dragStart: function dragStart(event) {
        var index = searchList.getIndexOfItem(event.target);
        if(index > 0) { 
            event.dataTransfer.setData('text/plain', index);
        }
        event.stopPropagation();
    },

    dragOver: function dragOver(event) {
        event.preventDefault();
        event.target.style.borderBottom = "2px solid black";
    },

    dragLeave: function dragLeave(event) {
        event.preventDefault();
        event.target.style.borderBottom = "";
    },

    onDrop: function onDrop(event) {
        var sourceIndex = +event.dataTransfer.getData("text/plain");
        var targetIndex = searchList.getIndexOfItem(event.target);
        if(targetIndex >= 0 && sourceIndex !== targetIndex) {
            var source = searchList.removeItemAt(sourceIndex);
            var target = event.target.nextElementSibling;
            if(target) {
                searchList.insertBefore(source, target);
            }
            else {
                searchList.appendChild(source);
            } 
            searchManager.move(sourceIndex, targetIndex);
        }
    }
};

function openEditDiag() {
    var item = searchList.selectedItem;
    if(item && searchList.selectedIndex > 0) {
        window.openDialog("chrome://floatnotes/content/editSearch.xul", "Edit Search", "modal", searchList, searchManager);
    }
}

function deleteSearch() {
    var index = searchList.selectedIndex;
    if(index !== null && index > 0) {
        searchManager.delete(index);
        searchList.removeItemAt(index);
        searchList.selectItem(searchList.getItemAtIndex(index - 1));
    }
}

function loadPage() {
    if(treeView.selection.count == 1) {
        var note = treeView.data[treeView.selection.currentIndex];
        if(note) {
            var url =  URLHandler.getNoteUrl(note);
            if(url.lastIndexOf('*') === url.length - 1) {
                var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                    .getService(Components.interfaces.nsIPromptService);
                promptService.alert(window, '',Locale.get('notelist.notify_multiple_pages'));
                return;
            }
            openAndReuseOneTabPerURL(url, note.guid);
        }
    }
}

function openAndReuseOneTabPerURL(url, guid) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    .getService(Components.interfaces.nsIWindowMediator);
    var browserEnumerator = wm.getEnumerator("navigator:browser");

    // Check each browser instance for our URL
    var found = false;
    while (!found && browserEnumerator.hasMoreElements()) {
        var browserWin = browserEnumerator.getNext();
        var tabbrowser = browserWin.gBrowser;

        // Check each tab of this browser instance
        var numTabs = tabbrowser.browsers.length;
        for (var index = 0; index < numTabs; index++) {
            var currentBrowser = tabbrowser.getBrowserAtIndex(index);
            var currentURL = currentBrowser.currentURI.spec;
            if(currentURL.charAt(currentURL.length - 1) === '/') {
                currentURL = currentURL.substring(0, currentURL.length -1);
            }
            if (url == currentURL) {

                // The URL is already opened. Select this tab.
                tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];

                browserWin.gFloatNotesView.scroll_to_note = guid;
                // Focus *this* browser-window
                browserWin.focus();

                found = true;
                break;
            }
        }
    }

    // Our URL isn't open. Open it now.
    if (!found) {
        var recentWindow = wm.getMostRecentWindow("navigator:browser");
        if (recentWindow) {
            // Use an existing browser window
            recentWindow.gFloatNotesView.scroll_to_note = guid;
            recentWindow.delayedOpenTab(url, null, null, null, null);
        }
        else {
            // No browser windows are open, so open a new one.
            var win = window.open(url);
        }
    }
}


function saveSearch() {
    var keywords = searchBox.value;
    if(keywords) {
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]  
        .getService(Components.interfaces.nsIPromptService);  

        var check = {value: false};
        var input = {value: ""};
        var result = true;
        while(!input.value && result) {
            result = prompts.prompt(null, Locale.get('notelist.save_search.title'), Locale.get('notelist.save_search.name'),input, null, check);
        } 
        if(result) {
            searchManager.addSearch(input.value, keywords);
        }
    }
}

function search() {
    var words = searchBox.value;
    var selectedSearch = searchList.selectedItem;
    if(selectedSearch && selectedSearch.value) {
        words = selectedSearch.value + ' ' + words;
    }
    clear();
    if(words) {
        db.getNotesContaining(words.split(' '),function(notes) {
            treeView.data = notes;
            tree.boxObject.invalidate();
            updateCounter();
            if(searchBox.value) {
                saveSearchButton.style.display = 'inline';
            }
            else {
                saveSearchButton.style.display = 'none';
            }
            sort();
        });
    }
    else {
        db.getAllNotes(function(notes) {
            treeView.data = notes;
            tree.view = treeView;
            updateCounter();
            document.getElementById('saveSearch').style.display = 'none';
            sort();
        });
    }
}

function getTitle(text) {
    var index = text.indexOf("\n");
    if (index >= 0) {
        return " " + text.substring(0, index);
    }
    else {
        return " " + text;
    }
}

function updateCounter() {
    var str = treeView.rowCount;
    if(str === 1) {
        str += ' ' + Locale.get('singularNote');
    }
    else {
        str += ' ' + Locale.get('pluralNote');
    }
    document.getElementById('counter').value = str;
}

function saveNote(value, attr) {
    if(treeView.selection.count == 1) {
        var selection = treeView.selection.currentIndex,
            note = treeView.data[selection];

        if(value != note[attr]) {
            note[attr] = value
            observer.doObserve = false;
            manager.saveNote(note, function(id, guid){
                observer.doObserve=true;
                note.modification_date = manager.notes[guid].modification_date;
                tree.boxObject.invalidateRow(selection);
            });
        }
    }
}

function deleteNote() {
    var selection = treeView.selection;
    if(selection && selection.count >=1) {
        if(selection.count == 1) {
            manager.deleteNote(treeView.data[selection.currentIndex], function() {});
            search();
        }
        else {
            var start = new Object();
            var end = new Object();
            var numRanges = tree.view.selection.getRangeCount();
            var data = treeView.data;
            for (var t = 0; t < numRanges; t++){
                tree.view.selection.getRangeAt(t,start,end);
                for (var v = start.value; v <= end.value; v++){
                    manager.deleteNote(data[v], function() {});
                }
            } 
            search();
        }
    }
}

function clear() {
    if(treeView.selection) {
        treeView.selection.clearSelection();     
    }
    inputBrdcast.setAttribute('disabled', true);
    textBox.value="";
    colorPicker.color = "";
}

function sort(column) {
	var columnName;
	var order = tree.getAttribute("sortDirection") == "ascending" ? 1 : -1;
	//if the column is passed and it's already sorted by that column, reverse sort
	if (column) {
		columnName = column.id;
		if (tree.getAttribute("sortResource") == columnName) {
			order *= -1;
		}
	} else {
		columnName = tree.getAttribute("sortResource");
	}

	function columnSort(a, b) {
		if (prepareForComparison(a[columnName]) > prepareForComparison(b[columnName])) return 1 * order;
		if (prepareForComparison(a[columnName]) < prepareForComparison(b[columnName])) return -1 * order;
		//tie breaker: name ascending is the second level sort
		if (columnName != "url") {
			if (prepareForComparison(a["url"]) > prepareForComparison(b["url"])) return 1;
			if (prepareForComparison(a["url"]) < prepareForComparison(b["url"])) return -1;
		}
		return 0;
	}
	treeView.data = treeView.data.sort(columnSort);
	//setting these will make the sort option persist
	tree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
	tree.setAttribute("sortResource", columnName);
	tree.view = treeView;
	//set the appropriate attributes to show to indicator
	var cols = tree.getElementsByTagName("treecol");
	for (var i = 0; i < cols.length; i++) {
		cols[i].removeAttribute("sortDirection");
	}
	document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
}

//prepares an object for easy comparison against another. for strings, lowercases them
function prepareForComparison(o) {
	if (typeof o == "string") {
		return o.toLowerCase();
	}
	return o;
}


var db = getDatabase();
var manager = getManager();
var pref = Preferences;

var searchManager = {
    searches: [['All notes','']].concat(pref.savedSearches),
    buildList: function() {
        var selectedIndex = (searchList.selectedIndex > 0) ? searchList.selectedIndex : 0;
        this.empty();
        for(var i = 0, l = this.searches.length;i<l;i++) {
            searchList.appendItem(this.searches[i][0], this.searches[i][1]);
        }
        searchList.selectedIndex = selectedIndex;
    },
    addSearch: function(name, keywords) {
        this.searches.push([name,keywords]);
        this.save();
        this.buildList();
    },
    empty: function() {
        for(var i = searchList.itemCount -1;i >=0;i--) {
            searchList.removeItemAt(i);
        }
    },
    move: function(which, to) {
        var removed = this.searches.splice(which, 1);
        this.searches.splice(to + 1, 0, removed[0]);
        this.save();
    },
    delete: function(index) {
        this.searches.splice(index, 1);
        this.save();
    },
    save: function() {
        pref.savedSearches = this.searches.slice(1);
    },
    update: function(index, name, keywords) {
        this.searches[index] = [name, keywords];
        this.save();
    },
    updateButtons: function() {
        document.getElementById('searchListButtons').setAttribute('disabled', (searchList.selectedIndex === 0));
    }
};


var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
                     .getService(Components.interfaces.nsIFaviconService);
var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);

var treeView = {
    data: [],
    get rowCount() {
        return this.data.length;
    },  
    getCellText : function(row,column){ 
        if (column.id == "content") return getTitle(this.data[row].content);  
        if (column.id == "url") return this.data[row].url;
        if (column.id == "modification_date") return this.data[row].modification_date.toLocaleString();
        if (column.id == "creation_date") return this.data[row].creation_date.toLocaleString();
    },  
    setTree: function(treebox){ this.treebox = treebox; },  
    isContainer: function(row){ return false; },  
    isSeparator: function(row){ return false; },  
    isSorted: function(){ return false; },  
    getLevel: function(row){ return 0; },  
    getImageSrc: function(row,column){
        if (column.id == "content") {
            var note = this.data[row];
            var url =  URLHandler.getNoteUrl(note);
            if(url.charAt(url.length - 1) === '*') {
                url = url.substring(0, url.length);
            }
            return faviconService.getFaviconImageForPage(ioService.newURI(url, null, null)).spec;
        }
        return null; 
    },  
    getRowProperties: function(row,props){},  
    getCellProperties: function(row,col,props){},  
    getColumnProperties: function(colid,col,props){},
    selectionChanged: function() {
        var count = this.selection.count;
        if(count === 0) {
            inputBrdcast.setAttribute('disabled', true);
            textBox.value = "";
            colorPicker.value = "";
        }
        else if(count == 1) {
            inputBrdcast.setAttribute('disabled', false);
            textBox.disabled = false;
            textBox.value = this.data[this.selection.currentIndex].content;
            colorPicker.color = this.data[this.selection.currentIndex].color;
        }
        else {
            textBox.value = "";
            colorPicker.color = "";
            inputBrdcast.setAttribute('disabled', true);
            deleteButton.disabled = false;
        }
    },

    cycleHeader: function(col) {

    }
};

searchManager.buildList();
observer.registerObserver();
