var lpc = require('./lpc');

lpc.DEBUG = true;

lpc.connect(function() {
    console.log("This is it!");
    lpc.invoke("counter", [], function(err, result) {
        if(err) throw err;
        console.log(result);
        lpc.close();
    });
});