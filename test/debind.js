var Gedi = require('../'),
    test = require('tape');

test('debind all', function(t) {
    var model = {},
        gedi = new Gedi(model);       
    
    t.plan(1);
    gedi.bind('[things]', function() {
        t.pass('captured change of [things]');
    });
    
    gedi.set('[things]', 'stuff');
    gedi.debind();
    gedi.set('[things]', 'majigger');
    t.end();
});

test('debind callback', function(t) {
    var model = {},
        gedi = new Gedi(model),
        handleChange = function() {
            t.pass('received change');
        };

    t.plan(2);
        
    gedi.bind('[things]', handleChange);
    gedi.bind('[]', handleChange);
    gedi.set('[things]', 'stuff');
    
    gedi.debind(handleChange);
    gedi.set('[things]', 'majigger');
    t.end();
});

test('debind path', function(t) {
    var model = {},
        gedi = new Gedi(model);

    t.plan(2);
        
    gedi.bind('[things]', function() {
        t.pass('received change 1');
    });

    gedi.bind('[things]', function() {
        t.pass('received change 2');
    });

    gedi.set('[things]', 'stuff');
    
    gedi.debind('[things]');   
    gedi.set('[things]', 'majigger');
    t.end();
});

test('debind callback at path', function(t) {
    var model = {},
        gedi = new Gedi(model),
        callback = function() {
            t.pass('received change');
        };
        
    t.plan(3);

    gedi.bind('[things]', callback);
    gedi.bind('[]', callback);   
    gedi.set('[things]', 'stuff');
    
    gedi.debind('[things]', callback);
    gedi.set('[things]', 'majigger');
    t.end();
});

test('debind expression', function(t) {
    var model = {},
        gedi = new Gedi(model),
        callback = function() {
            t.pass('received change');
        };
        
    t.plan(1);    
    gedi.bind('(concat [things][stuff])', callback);
    gedi.set('[things]', 'stuff');
    
    gedi.debind('(concat [things][things])', callback);
    gedi.set('[things]', 'majigger');
    t.end();
});

test('debind expression by callback', function(t) {
    var model = {},
        gedi = new Gedi(model),
        callback = function(){
            t.pass('received change');
        };

    t.plan(1);        
    gedi.bind('(concat [things][stuff])', callback);  
    gedi.set('[things]', 'stuff');
    
    gedi.debind(callback);
    gedi.set('[things]', 'majigger');
    gedi.set('[things]', 'whatsits');
    t.end();
});

test('debind relative expressions by callback', function(t) {
    var model = {thing:{}},
        gedi = new Gedi(model),
        callback = function() {
            t.pass('received change');
        };
    
    t.plan(1);
    gedi.bind('(concat [a][b])', callback, '[thing]');
    gedi.set('[thing/a]', 'stuff');
    
    gedi.debind(callback);
    gedi.set('[thing/b]', 'stuff');
    gedi.set('[thing/c]', 'stuff');
    t.end();
});

test('debind relative named all', function(t) {
    var model = {
            things: {
                stuff: {
                    majigger: "majigger"
                },
                whatsits: "whatsits"
            }
        },
        gedi = new Gedi(model);
    
    t.plan(1);
    gedi.bind('[..things/whatsits]', function() {
        t.pass('captured change of [..things/whatsits]');
    },'[things/stuff/majigger]');
    
    gedi.set('[things/whatsits]', 'stuff');
    gedi.debind();
    gedi.set('[things/whatsits]', 'majigger');
    t.end();
});

test('debind relative named keyed all', function(t) {
    var model = {
            things: [{
                stuff: {
                    majigger: "majigger"
                },
                whatsits: "whatsits"
            }]
        },
        gedi = new Gedi(model);
    
    t.plan(1);
    gedi.bind('[..things/#/whatsits]', function() {
        t.pass('captured change of [..things/#/whatsits]');
    },'[things/0/stuff/majigger]');
    
    gedi.set('[things/0/whatsits]', 'stuff');
    gedi.debind();
    gedi.set('[things/0/whatsits]', 'majigger');
    t.end();
});