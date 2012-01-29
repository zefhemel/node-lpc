var lpc = require('./lpc');

var counter = 0;

lpc.exportFunction("counter", function(args, callback) {
    counter++;
    if(counter % 2 === 0)
        callback("FAIL");
    else
        callback(null,  counter);
});

lpc.join(function() {
    console.log("Started");
});