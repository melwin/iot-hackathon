var express = require('express');
var expressWs = require('express-ws')(express());

var app = expressWs.app;

var iot = require('aws-iot-device-sdk');


//app.use(express.static('public'));

/*app.use(function (req, res, next) {
 console.log('middleware');
 req.testing = 'testing';
 return next();
 });*/

var thingShadows = iot.thingShadow({
    keyPath: 'private.pem.key',
    certPath: 'certificate.pem.crt',
    caPath: 'ca-root.pem',
    clientId: 'dev1',
    region: 'eu-west-1'
});


var sockets = {};

var rgbLedLampState = {"state":{"desired":{"red":187,"green":114,"blue":222}}};

//
// Client token value returned from thingShadows.update() operation
//
var clientTokenUpdate;

console.log('test');

thingShadows.on('connect', function() {
    console.log('connect');
    //
    // After connecting to the AWS IoT platform, register interest in the
    // Thing Shadow named 'RGBLedLamp'.
    //
    //thingShadows.register( 'RGBLedLamp' );
    //
    // 2 seconds after registering, update the Thing Shadow named
    // 'RGBLedLamp' with the latest device state and save the clientToken
    // so that we can correlate it with status or timeout events.
    //
    // Note that the delay is not required for subsequent updates; only
    // the first update after a Thing Shadow registration using default
    // parameters requires a delay.  See API documentation for the update
    // method for more details.
    //
    /*setTimeout( function() {
        clientTokenUpdate = thingShadows.update('RGBLedLamp', rgbLedLampState  );
    }, 2000 );*/
});

thingShadows.on('status',
                function(thingName, stat, clientToken, stateObject) {
                    console.log('received '+stat+' on '+thingName+': '+
                                JSON.stringify(stateObject));

                    /*var ws = sockets[thingName];
                    if(ws) {
                        ws.send(JSON.stringify(stateObject.state));
                    }*/
                });

thingShadows.on('delta',
                function(thingName, stateObject) {
                    console.log('received delta '+' on '+thingName+': '+
                                JSON.stringify(stateObject));

                    var ws = sockets[thingName];
                    if(ws) {
                        ws.send(JSON.stringify({"delta" : stateObject.state}));
                    }
                });

thingShadows.on('timeout',
                function(thingName, clientToken) {
                    console.log('received timeout '+' on '+operation+': '+
                                clientToken);
                });

thingShadows.on('error',
                function(error) {
                    console.log('error', error);
                });

thingShadows.on('reconnect',
                function() {
                    console.log('reconnect');
                });

thingShadows.on('offline',
                function() {
                    console.log('offline');
                });


app.param('thing', function (req, res, next, thing) {
    req.thing = thing;
    return next();
});

app.get('/', function(req, res, next){
    //console.log('get route', req.testing);
    console.log('get route');


    res.end();
    next();
});

app.ws('/:thing', function(ws, req, next) {
    console.log('id: ' + req.thing);

    sockets[req.thing] = ws;

    thingShadows.register(req.thing);

    ws.on('message', function(msg) {
        console.log('message', msg);
        var js = JSON.parse(msg);
        if(js.command == 'update') {
            console.log('update command');
            clientTokenUpdate = thingShadows.update(req.thing, {"state" : { "reported" : js.state }});
        }
        //ws.send(msg);
    });

    ws.on('close', function close() {
        console.log('disconnected');
        thingShadows.unregister(req.thing);
        sockets[req.thing] = null;
    });

    next();
});

app.listen(443);
