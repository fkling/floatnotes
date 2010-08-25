var window;
var priority = "never";


function warmUp() {
	utils.include("lib/loader.js");
}

function setUp() {
	db_file = utils.makeTempFile();
	utils.wait(utils.setUpTestWindow());
	//utils.wait(utils.loadURI("http://www.reblaus-kleinkunst.de"));
	window = utils.getTestWindow();
	
	var loader = new FloatNotesLoader(db_file);
	loader.createFloatNotesManager();
}

function tearDown() {
	utils.cleanUpTempFiles();
}


function testCreateNote() {
	action.rightClickAt(50,50);
	
}