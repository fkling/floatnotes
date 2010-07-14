// Wait that the testing window is completely loaded.
// After that, go forward
var priority = "must";
var window;
var db_file;

function warmUp() {
	utils.include("../content/loader.js");
	utils.include("../content/manager.js");
	utils.include("../content/database.js");
	utils.include("../resources/showdown/showdown.js");
}

function setUp() {
	db_file = utils.makeTempFile();
	utils.wait(utils.setUpTestWindow());
	//utils.wait(utils.loadURI("http://www.reblaus-kleinkunst.de"));
	window = utils.getTestWindow();
}

function tearDown() {
	utils.cleanUpTempFiles();
}

function testLoaderCreateFloatNotesManager() {
	var loader = new FloatNotesLoader(db_file);
	loader.createFloatNotesManager();
	assert.isDefined(window.gFloatNotesManager, "FloatNotes manager is globally available.")
}

function testLoaderCreatesDatabase() {
	var loader = new FloatNotesLoader(db_file);
	loader.createFloatNotesManager();
	assert.isDefined(window.gFloatNotesManager._db, "FloatNotes manager has database.")
}
