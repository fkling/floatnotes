
var    win;

function getNote(data, manager) {
	var data = data || {id: 5, url: "google.com", h : 100, w: 100, y : 10, x : 10, status : 0, color : "#AAA", content:"test"};
    manager = manager || mock.mock(ManagerStub); 
	return new FloatNote(data, manager);
}

function startUp() {
    utils.include('integrateMock.js');
    utils.include("../resources/showdown/showdown.js",window);
	utils.include("lib/note.js");
	utils.include("lib/loader.js");
    var loader = new FloatNotesLoader();
    loader.loadCSS();
}

function setUp() {
    var options = {
      name      : 'TEST',                               // default: _blank
      width     : 400,
      height    : 400,
    },
    ManagerStub = function() {
        this.saveNote = function(note, callback){};
    };
    utils.setUpTestWindow(options);
   	utils.wait(utils.loadURI("http://google.com"));
    this.origContent = window.content;
    window.content = content;
    this.managerMock = mock.mock(ManagerStub);
	this.note = getNote(null, managerMock);
}

function tearDown() {
    this.note = null;
    this.managerMock = null;
    window.content = this.origContent;
    //utils.tearDownTestWindow({name: 'TEST'});
}

function testCreateNote() {
	assert.isDefined(this.note, "A new note is created");
}

function testAttachToNode() {
	this.note.attachToDocument(gBrowser.contentDocument, gBrowser.contentDocument.body);
	
	assert.contained(gBrowser.contentDocument.body, this.note.dom, "Note DOM node is containd in page");
}

function testMinimizeNote() {
	this.note.attachToDocument(gBrowser.contentDocument);
    var that = this;
	
	this.note.minimize();


    verifyMock(function(){mock.verify(managerMock, mock.never()).saveNote(that.note, mock.func())});
	assert.matches(/small/, this.note.dom.className, "Note has CSS class small");
}

function testMinimizeNoteAndSave() {
    var that = this;
	this.note.attachToDocument(gBrowser.contentDocument);
	
	this.note.minimizeAndSave();

    verifyMock(function(){mock.verify(managerMock).saveNote(that.note, mock.func())});
    assert.equals(status.MINIMIZED, this.note.data.status, "Note has status minimized");
	assert.matches(/small/, this.note.dom.className, "Note has CSS class small");
}

function testMinimizeOnDblclick() {

    var that = this;
	this.note.attachToDocument(gBrowser.contentDocument);

    //window.setTimeout(function() {
        action.dblclickOn($(that.note.ele.drag));
    //}, 100);
    utils.waitDOMEvent('dblclick', this.note.ele.drag);
    assert.equals(status.MINIMIZED, this.note.data.status, "Note has status minimized");
	assert.matches(/small/, this.note.dom.className, "Note has CSS class small");
    verifyMock(function(){mock.verify(managerMock).saveNote(that.note, mock.func())});
}

function testFix() {
    var that = this;
	this.note.attachToDocument(gBrowser.contentDocument);

    window.setTimeout(function() {
        action.mousedownOn(that.note.ele.fixer);
    }, 100);

    utils.waitDOMEvent('mousedown', this.note.ele.fixer);
    
    assert.equals(status.FIXED, this.note.data.status, "Note has status fixed");
	assert.matches(/fixed/, this.note.dom.className, "Note has CSS class fixed");
    verifyMock(function(){mock.verify(managerMock).saveNote(that.note, mock.func())});
}

function testUnMinimizeNote() {
    var that = this;
	this.note.attachToDocument(gBrowser.contentDocument);
    this.note.data.status |= status.MINIMIZED;

	this.note.unminimize();

    verifyMock(function(){mock.verify(managerMock, mock.never()).saveNote(that.note, mock.func())});
	assert.notMatches(/small/, this.note.dom.className, "Note has CSS class small");
}

function testUnMinimizeNoteAndSave() {
    var that = this;
	this.note.attachToDocument(gBrowser.contentDocument);
    this.note.data.status |= status.MINIMIZED;

	this.note.unminimizeAndSave();

    verifyMock(function(){mock.verify(managerMock).saveNote(that.note, mock.func())});
	assert.isFalse(this.note.data.status, "Note has not status minimized");
	assert.notMatches(/small/, this.note.dom.className, "Note has CSS class small");
}

function testSave() {
    var that = this;
	
	this.note.data.status |= status.NEEDS_SAVE;
	this.note.save();
	
    verifyMock(function(){mock.verify(managerMock).saveNote(that.note, mock.func())});
}

function testNoSaveIfNotNeeded() {
    var that = this;
	
	this.note.save();
	
    verifyMock(function(){mock.verify(managerMock, mock.never()).saveNote(that.note, mock.func())});
}

function testNoSaveOnEdit() {
    var that = this;
	
	this.note.data.status |= status.EDIT;
	this.note.save();
	
    verifyMock(function(){mock.verify(managerMock, mock.never()).saveNote(that.note, mock.func())});
}

function testUpdateLocation() {
    var that = this;
    var location = "www.example.com";

    this.note.updateLocation(location);

    verifyMock(function(){mock.verify(managerMock).saveNote(that.note, mock.func())});
    assert.equals(this.note.data.url, location, "Location is changed");
}
