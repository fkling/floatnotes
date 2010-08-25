var managerMock;
function warmUp() {
	utils.include("lib/util.js");
	utils.include("lib/note.js");
	utils.wait(utils.setUpTestWindow());
}

function testCreateNote() {
	var data = {url: "test.com", height : 100, width : 20, positionY : 50, positionX : 100, collapse : 0, color : "#AAA", content:"test"};
	var converter = {makeHTML: function(text) {return text;}};
	var note = getNote(data);
	/*
	assert.isDefined(note, "A new note is created");
	assert.equals(data.url, note.url, "URL correctly set");
	assert.equals(data.height, note.height, "height correctly set");
	assert.equals(data.width, note.width, "width correctly set");
	assert.equals(data.positionY, note.positionY, "Y position correctly set");
	assert.equals(data.positionX, note.postionX, "X position correctly set");
	assert.equals(data.collapse, note.collapse, "collapse correctly set");
	assert.equals(data.color, note.color, "color correctly set");
	assert.equals(data.content, note.content, "content correctly set");
	*/
}

function testAttachToNode() {
	utils.wait(utils.loadURI("http://google.com"));
	var note = getNote();
	
	note.attachToDocument(gBrowser.contentDocument);
	
	assert.contained(gBrowser.contentDocument.body, note.domNode, "Note DOM node is containd in page");
}

function testMinimizeNote() {
	utils.wait(utils.loadURI("http://google.com"));
	var note = getNote();
	note.attachToDocument(gBrowser.contentDocument);
	
	note.minimize();

	assert.matches(/small/, note.dom.className, "Note has CSS class small");
	assert.isNull(managerMock.note, "Collapse was not saved");
}

function testMinimizeNoteAndSave() {
	utils.wait(utils.loadURI("http://google.com"));
	var note = getNote();
	note.attachToDocument(gBrowser.contentDocument);
	
	note.minimizeAndSave();

	assert.isTrue(note.status & status.MINIMIZED, "Note has status collpased");
	assert.matches(/small/, note.dom.className, "Note has CSS class small");
	assert.isNotNull(managerMock.note, "Collapse was not saved");
}

function testUnMinimizeNote() {
	utils.wait(utils.loadURI("http://google.com"));
	var note = getNote();
	note.attachToDocument(gBrowser.contentDocument);
	
	note.unminimize();

	assert.notMatches(/small/, note.dom.className, "Note has CSS class small");
	assert.isNull(managerMock.note, "Collapse was not saved");
}

function testUnMinimizeNoteandSave() {
	utils.wait(utils.loadURI("http://google.com"));
	var note = getNote();
	note.attachToDocument(gBrowser.contentDocument);
	
	note.unminimizeAndSave();

	assert.isTrue(note.status & status.MINIMIZED, "Note has status collpased");
	assert.notMatches(/small/, note.dom.className, "Note has CSS class small");
	assert.isNotNull(managerMock.note, "Collapse was not saved");
}

function testSave() {
	var note = getNote();
	
	note.status |= status.NEEDS_SAVE;
	note.save();
	
	assert.isNotNull(managerMock.note, "Note gets saved");
}

function testNoSaveIfNotNeeded() {
	var note = getNote();
	
	note.save();
	
	assert.isNull(managerMock.note, "No save on edit");
}

function testNoSaveOnEdit() {
	var note = getNote();
	
	note.status |= status.EDIT;
	note.save();
	
	assert.isNull(managerMock.note, "No save on edit");
}

function getNote(data) {
	var converter = {makeHtml: function(text) {return text;}};
	managerMock = {
			note: null,
			saveNote: function(note) {this.note = note;}
	};
	var data = data || {id: 5, url: "google.com", height : 100, width : 20, positionY : 50, positionX : 100, collapse : 0, color : "#AAA", content:"test"};
	return new FloatNote(data, managerMock, converter);
}