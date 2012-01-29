var spawn = require('child_process').spawn;
var lpc = require('./lpc');
var assert = require("assert");

//lpc.DEBUG = true;

function spawnServer(callback) {
    var server = spawn('node', ['test_server1.js']);
    
    server.stdout.on("data", function() {
        server.stdout.removeListener("data", arguments.callee);
        server.stdout.on("data", function(buf) {
            console.log("Server: " + buf.toString("ascii"));
        });
        callback && callback();
    });
    
    server.on("error", function(err) {
        console.log("FAIL", err);
    });
    
    server.on("exit", function() {
        console.log("Server process stopped");
    });
    
    return server;
}

var server = spawnServer(test);

function test() {
    lpc.join(function() {
        console.log("Starting tests...");
        testRpcNoArgs(function() {
            testRpcArgs(function() {
                testFail(function() {
                    testRetry(function() {
                        server.kill();
                        lpc.close();
                        console.log("All tests completed!");
                    });
                });
            });
        });
    });
}

function testRpcNoArgs(callback) {
    console.log("Test RPC no arguments");
    lpc.invoke("counter", [], function(err, result) {
        assert.equal(err, null, "check no err");
        assert.equal(result, 1);
        lpc.invoke("counter", [], function(err) {
            assert.equal(err, "FAIL", "check err");
            callback();
        });
    });
}

function testRpcArgs(callback) {
    console.log("Test RPC with arguments");
    lpc.invoke("addNumbers", [10, 18], function(err, result) {
        assert.equal(err, null, "check no err");
        assert.equal(result, 28);
        callback();
    });
}

function testFail(callback) {
    console.log("Test slow RPC with server kill");
    lpc.invoke("slowResponse", [], function(err, result) {
        assert.equal(err, "call-failed", "check no err");
        server = spawnServer(callback);
    });
    server.kill();
}

function testRetry(callback) {
    console.log("Test server kill with retry.");
    lpc.invoke("retrySlowResponse", [], function(err, result) {
        assert.equal(err, null, "check no err");
        assert.equal(result, "ok");
        callback();
    });
    server.kill();
    setTimeout(function() {
        server = spawnServer();
    }, 100);
}
