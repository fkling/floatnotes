EXPORTED_SYMBOLS = ['Mozilla'];

var Mozilla = {

    openAndReuseOneTabPerURL: function(url) {
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
                if (url == currentURL) {

                    // The URL is already opened. Select this tab.
                    tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];
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
                recentWindow.delayedOpenTab(url, null, null, null, null);
            }
            else {
                // No browser windows are open, so open a new one.
                var win = window.open(url);
            }
        }
    }
};
