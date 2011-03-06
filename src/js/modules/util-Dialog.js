Components.utils.import("resource://floatnotes/util-Locale.js");
Components.utils.import("resource://floatnotes/preferences.js");
Components.utils.import("resource://floatnotes/util-Mozilla.js");

EXPORTED_SYMBOLS = ['Dialog'];

var Dialog = {
    confirmDeletion: function(numberOfNotes) {
        var del = true;
        numberOfNotes = numberOfNotes || 1;

        if(Preferences.confirmDelete) {
            var msg = (numberOfNotes === 1) ? Locale.get('note.delete.popup.msg') :  Locale.get('note.delete.popup.msg_mult');
            var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"] .getService(Components.interfaces.nsIPromptService);
            var checkState = {value: !Preferences.confirmDelete};
            del = promptService.confirmCheck(null, Locale.get('note.delete.title'), msg, Locale.get('button.not_ask_again'), checkState);
            Preferences.confirmDelete = !checkState.value;
        }
        return del;
    },

    showNotSupportedNotification: function(msg) {
        var notifyBox = Mozilla.getRecentWindow().gBrowser.getNotificationBox(),
        note = notifyBox.getNotificationWithValue('floatnotes'),
        loc = Locale;
        if(note) {
            notifyBox.removeNotification(note);
        } 
        notifyBox.appendNotification(msg, 
                                     'floatnotes', 
                                     'chrome://floatnotes/skin/note_16.png', 
                                         notifyBox.PRIORITY_WARNING_LOW, 
                                     [
                                         {
                                         label: loc.get('button.not_show_again'), 
                                         callback:function(note){ Preferences.showSiteNotSupported = false; }
                                     }, 
                                     {
                                         label: loc.get('button.ok'), 
                                         callback: function(note){}
                                     } ]
                                    );

    }
};
