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
});