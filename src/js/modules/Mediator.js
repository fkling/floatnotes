Components.utils.import("resource://floatnotes/URLHandler.js");
Components.utils.import("resource://floatnotes/util-Mozilla.js");
Components.utils.import("resource://floatnotes/manager.js");

EXPORTED_SYMBOLS = ["Mediator"];


var manager = new FloatNotesManager();

var Mediator = (function() {

    var _window,
    _observe = true;

    var observer = {
        observe: function(subject, topic, value) {
            if(_window && _observe) {
                switch(topic) {
                    case 'floatnotes-note-update':  // value is the note ID
                        _window.display.updateNote(value);                    
                    break;
                    case 'floatnotes-note-delete':
                        _window.display.removeNote(value);
                    break;
                    case 'floatnotes-note-urlchange': // detach the note, "fallthrough" will add the note again if needed
                        _window.display.detachNote(value);
                    case 'floatnotes-note-add':
                        var locations =  URLHandler.getSearchUrls(_window.currentDocument.location);
                        var note = manager.notes[value];
                        if (locations.indexOf(note.url) > -1) {
                            _window.display.addNote(note);
                        }
                }
            }
        }};

        Mozilla.registerObserver(observer, 'floatnotes-note-update', 
                                            'floatnotes-note-delete', 
                                            'floatnotes-note-urlchange', 
                                            'floatnotes-note-add');


        return {
            getCurrentWindow: function() {
                return _window;
            },
            setCurrentWindow: function(window) {
                _window = window;
            },
            observe: function(observe) {
                _observe = !!observe;
            }
        };
}());
