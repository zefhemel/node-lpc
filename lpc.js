"use strict";

var net = require('net');

// Port range to use
var FROM_RANGE = 1330;
var TO_RANGE = 1339;

/**
 * {<id>: {
 *    sock: <socket>,
 *    messagesAwaitingReply: {<id>: {name: <name>, args: <args>, callback: <callback fn>}, ...},
 *    supported: {<name>: <options>}
 * }
 */
var connections = {};

/**
 * {<name>: {fn: <fn>, options: <options>}}
 */
var exportFunctions = {};

// To ensure unique IDs
var socketId = 0;
var messageId = 0;

exports.DEBUG = false;

function debug() {
    if(exports.DEBUG)
        console.log.apply(console, arguments);
}

var server = net.createServer(function(sock) {
    debug('Client connected');
    setupClient(sock);
    registerConnection(sock);
});

function connectToPeers(callback) {
    var availablePorts = [];
    var portsToTry = TO_RANGE - FROM_RANGE;
    var finishedPorts = 0;
    
    function finishedOne() {
        finishedPorts++;
        if(finishedPorts === portsToTry) {
            debug("Available ports:", availablePorts);
            callback(availablePorts);
        }
    }
    
    for (var p = FROM_RANGE; p < TO_RANGE; p++) {
        (function() {
            var port = p;
            var sock = new net.Socket();
            setupClient(sock, finishedOne);
            sock.on("error", function(err) {
                if(err.code === 'ECONNREFUSED') {
                    availablePorts.push(port);
                    finishedOne();
                }
            });
            sock.connect(port, function() {
                registerConnection(sock);
            });
        })();
    }
}

function registerConnection(sock) {
    connections[sock.id] = {
        sock: sock,
        messagesAwaitingReply: {},
        supported: []
    };
    // Advertise exposed functions
    var supported = {};
    for(var name in exportFunctions) {
        supported[name] = exportFunctions[name].options;
    }
    sock.write(JSON.stringify({supported: supported}));
}

function setupClient(sock, establishedCallback) {
    sock.id = socketId++;
    sock.on("end", function() {
        var conn = connections[sock.id];
        for(var id in conn.messagesAwaitingReply)
            handleMessageFail(conn, id);
        delete connections[sock.id];
    });
    sock.on("data", function(buf) {
        var conn = connections[sock.id];
        var json = JSON.parse(buf.toString("ascii"));
        debug("Got JSON:", json);
        if(json.name) { // RPC Call
            var message = exportFunctions[json.name];
            var id = json.id;
            if(!message)
                return sock.write(JSON.stringify({status: "not-supported", replyTo: id}));
            message.fn(json.args, function(err, data) {
                sock.write(JSON.stringify({replyTo: id, err: err, data: data}));
            });
        } else if(json.replyTo) { // RPC reply
            var id = json.replyTo;
            if(conn.messagesAwaitingReply[id]) {
                conn.messagesAwaitingReply[id].callback(json.err, json.data);
                delete conn.messagesAwaitingReply[id];
            }
            else
                debug("Nobody's waiting for", id);
        } else if(json.supported) { // Supported methods advertisement
            connections[sock.id].supported = json.supported;
            establishedCallback && establishedCallback();
            establishedCallback = null; // To ensure it's not called twice
        }
    });
}

function handleMessageFail(conn, id) {
    var messageRec = conn.messagesAwaitingReply[id];
    if(conn.supported[messageRec.name].retry) {
        setTimeout(function() {
            invoke(messageRec.name, messageRec.args, messageRec.callback);
        }, 250);
    }
    else
        messageRec.callback("call-failed");
}

function listen(ports, callback) {
    var port = ports[0];
    server.listen(port, function(err) {
        if (err && err.code == 'EADDRINUSE')
            debug('Address in use');
        else
            callback && callback(port);
    });
}

var join = exports.join = function(callback) {
    connectToPeers(function(availablePorts) {
        listen(availablePorts, callback);
    });
};

var invoke = exports.invoke = function(name, args, callback) {
    var conn = null;
    // TODO: This could be optimized
    for(var id in connections) {
        if(connections[id].supported[name]) {
            conn = connections[id];
            break;
        }
    }
    if(!conn)
        return callback("not-supported");
    messageId++;
    conn.messagesAwaitingReply[messageId] = {
        name: name,
        args: args,
        callback: callback
    };
    conn.sock.write(JSON.stringify({id: messageId, name: name, args: args}));
};

var exportFunction = exports.exportFunction = function(name, fn, options) {
    exportFunctions[name] = {fn: fn, options: options || {}};
};

exportFunction("ping", function(args, callback) {
    callback(null, "ok");
});

exports.close = function() {
    server.close();
    for(var id in connections) {
        connections[id].sock.end();
    }
};

exports.debugConnections = function() {
    console.log(connections);
};