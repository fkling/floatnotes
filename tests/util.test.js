
function warmUp() {
	utils.wait(utils.setUpTestWindow());
	//utils.wait(utils.loadURI("http://www.reblaus-kleinkunst.de"));
	window = utils.getTestWindow();
	utils.include("lib/util.js",window);
}

function testSetCssProperty() {
    var element = document.createElement('div');

    util.css(element, {top: '5px', width: '100px'});

    assert.equals('5px', element.style.top);
    assert.equals('100px', element.style.width);
}

function testAddClass() {
    var element = document.createElement('div');
    var element2 = document.createElement('div');
    element.className = 'test';

    util.addClass(element, 'foo');
    util.addClass(element2, 'foo');

    assert.equals('test foo', element.className);
    assert.equals('foo', element2.className);
}

function testRemoveClass() {
    var element = document.createElement('div');
    var element2 = document.createElement('div');
    element.className = 'test foo bar';
    element2.className = 'foo';

    util.removeClass(element, 'foo');
    util.removeClass(element2, 'foo');

    assert.equals('test bar', element.className);
    assert.equals(' ', element2.className);
}

function testGetPreferenceService() {
    var pref = util.getPreferencesService();
    alert(pref);
    assert.equals(typeof pref, 'nsIPrefBranch');
}

function testGetCurrentVersion() {
    var version = utils.readFrom('../../version.txt');

    var wait = {value: false};
    util.getCurrentVersion(function(v) {
            wait.version = v;
            wait.value = true;
    });

    assert.equals(version.trim(), wait.version);
}

function testLogMessage() {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                         .getService(Components.interfaces.nsIConsoleService);

    util.log('test-floatnotes');
    var messages = {}, count = {};
    consoleService.getMessageArray(messages,count);
    
    messages = messages.value;
    count = count.value;
    for(var i=0;i<count;i++) {
        if(messages[i].message == 'test-floatnotes') {
            assert.isTrue(true);
            return;
        }
    }
    assert.isTrue(false);
}
    
