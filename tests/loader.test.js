// Wait that the testing window is completely loaded.
// After that, go forward
var window;
var db_file;

function warmUp() {
	db_file = utils.makeTempFile();
	utils.wait(utils.setUpTestWindow());
	//utils.wait(utils.loadURI("http://www.reblaus-kleinkunst.de"));
	window = utils.getTestWindow();
	utils.include("../resources/showdown/showdown.js",window);
	utils.include("lib/loader.js",window);
	utils.include("lib//manager.js",window);
	utils.include("lib/database.js",window);
}

function setUp() {
}

function tearDown() {
	utils.cleanUpTempFiles();
}

function testLoaderCreateFloatNotesManager() {
	var loader = new window.FloatNotesLoader(db_file);
	loader.createFloatNotesManager();
	assert.isDefined(window.gFloatNotesManager, "FloatNotes manager is globally available.")
}

function testLoaderCreatesDatabase() {
	var loader = new window.FloatNotesLoader(db_file);
	loader.createFloatNotesManager();
	assert.isDefined(window.gFloatNotesManager._db, "FloatNotes manager has database.")
}
