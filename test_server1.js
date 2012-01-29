var lpc = require('./lpc');

var counter = 0;

lpc.exportFunction("counter", function(args, callback) {
    counter++;
    if(counter % 2 === 0)
        callback("FAIL");
    else
        callback(null,  counter);
});

lpc.exportFunction("addNumbers", function(args, callback) {
    callback(null, args[0] + args[1]);
});

lpc.exportFunction("slowResponse", function(args, callback) {
    setTimeout(function() {
        callback(null, "ok");
    }, 200);
});

lpc.exportFunction("retrySlowResponse", function(args, callback) {
    setTimeout(function() {
        callback(null, "ok");
    }, 200);
}, {retry: true});


lpc.join(function() {
    console.log("Started");
});