"use strict";
Components.utils['import']("resource://floatnotes/URLHandler.js");
Components.utils['import']("resource://floatnotes/util-Mozilla.js");
Components.utils['import']("resource://floatnotes/Manager.js");
/*global Mozilla, FloatNotesManager, FloatNotesURLHandler*/


var EXPORTED_SYMBOLS = ["FloatNotesMediator"];

var manager = FloatNotesManager.getInstance();

var FloatNotesMediator = (function() {

  var current_main_ui;
  var locks = 0;

  var observer = {
    observe: function(subject, topic, guid) {
      if(current_main_ui && locks === 0) {
        switch(topic) {
          case 'floatnotes-note-update':
            manager.getNote(guid).then(function(note_data) {
              var data = {};
              data[guid] = note_data;
              current_main_ui.getNoteContainer().updateNotes(data);
            });
            break;

          case 'floatnotes-note-delete':
            current_main_ui.getNoteContainer().detachNote(guid);
            break;

          case 'floatnotes-note-urlchange':
            // detach the note, "fallthrough" will add
            // the note again if needed
            current_main_ui.getNoteContainer().detachNote(guid);

          case 'floatnotes-note-add':
            var locations = FloatNotesURLHandler.getSearchUrls(
              current_main_ui.getCurrentDocument().location
            );

            manager.getNote(guid).then(function(note_data) {
              if (locations.indexOf(note_data.url) > -1) {
                current_main_ui.getNoteContainer().addNote(note_data);
              }
            });
        }
      }
    }};

    Mozilla.registerObserver(
      observer,
      'floatnotes-note-update',
      'floatnotes-note-delete',
      'floatnotes-note-urlchange',
      'floatnotes-note-add'
    );

    return {
      getCurrentMainUI: function() {
        return current_main_ui;
      },
      setCurrentMainUI: function(main_ui) {
        current_main_ui = main_ui;
        locks = 0;
      },
      observe: function(observe) {
        locks += observe ? 1 : -1;
      }
    };
}());
