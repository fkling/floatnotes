utils.include("jshamcrest.js");
utils.include("jsmockito.js");

var mock = {};
JsHamcrest.Integration.copyMembers(mock);
JsMockito.Integration.importTo(mock);

function verifyMock(callback, msg) {
    var val = true;
    try {
        callback();
    }
    catch(err) {
        msg = err;
        val = false;
    }
    assert.isTrue(val, msg);
}
