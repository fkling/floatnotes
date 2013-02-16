Components.utils.import("resource://floatnotes/util-Locale.js");
Components.utils.import("resource://floatnotes/preferences.js");
Components.utils.import("resource://floatnotes/util-Mozilla.js");
Components.utils.import("resource://floatnotes/Mediator.js");

EXPORTED_SYMBOLS = ['Dialog'];


function getNotifyBox() {
  var notifyBox = Mozilla.getRecentWindow().gBrowser.getNotificationBox(),
  note = notifyBox.getNotificationWithValue('floatnotes');
  if(note) {
    notifyBox.removeNotification(note);
  }
  return notifyBox;
}


var Dialog = {
  confirmDeletion: function(numberOfNotes) {
    var del = true;
    numberOfNotes = numberOfNotes || 1;

    if(FloatNotesPreferences.confirmDelete) {
      var msg = (numberOfNotes === 1) ? Locale.get('note.delete.popup.msg') :  Locale.get('note.delete.popup.msg_mult');
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"] .getService(Components.interfaces.nsIPromptService);
      var checkState = {value: !FloatNotesPreferences.confirmDelete};
      del = promptService.confirmCheck(null, Locale.get('note.delete.title'), msg, Locale.get('button.not_ask_again'), checkState);
      FloatNotesPreferences.confirmDelete = !checkState.value;
    }
    return del;
  },

  showNotSupportedNotification: function(msg) {
    var notifyBox = getNotifyBox(),
    loc = Locale;
    notifyBox.appendNotification(
      msg,
      'floatnotes',
      'chrome://floatnotes/skin/note_16.png',
      notifyBox.PRIORITY_WARNING_LOW,
      [
        {
          label: loc.get('button.not_show_again'),
          callback:function(note){ FloatNotesPreferences.showSiteNotSupported = false; }
        },
        {
          label: loc.get('button.ok'), 
          callback: function(note){}
        }
      ]
    );

  },

  showTamperDetectionAlert: function() {
    var notifyBox = getNotifyBox(), 
    loc = Locale;
    notifyBox.appendNotification(loc.get('messages.tamper_detection'), 
                                 'floatnotes', 
                                 'chrome://floatnotes/skin/note_16.png', 
                                   notifyBox.PRIORITY_CRITICAL_HIGH,
                                 [
                                   {
                                   label: loc.get('button.reload_notes'), 
                                   callback: function(note){
                                     Mediator.getCurrentWindow().reload(); 
                                   }
                                 } ]
                                );
  }
};
