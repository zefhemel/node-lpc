var spawn = require('child_process').spawn;
var server = spawn('node', ['servertest.js']);
var lpc = require('./lpc');
var assert = require("assert");

//lpc.DEBUG = true;

server.stdout.on("data", function() {
    server.stdout.removeListener("data", arguments.callee);
    test();
});

server.on("error", function(err) {
    console.log("FAIL", err);
});

server.on("end", function() {
    console.log("Ze end");
});

function test() {
    lpc.join(function() {
        console.log("Starting tests...");
        basicRpc(function() {
            server.kill();
            lpc.close();
            console.log("All tests completed!");
        });
    });
}

function basicRpc(callback) {
    lpc.invoke("counter", [], function(err, result) {
        assert.equal(err, null, "check no err");
        assert.equal(result, 1);
        lpc.invoke("counter", [], function(err) {
            assert.equal(err, "FAIL", "check err");
            callback();
        });
    });
}