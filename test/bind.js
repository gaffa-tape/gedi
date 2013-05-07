var Gedi = require('../'),
    test = require('tape');

test('basic bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);
    
    gedi.set('[thing]', 'things');
    gedi.bind('[thing]', function(){
        t.pass('detected [thing] change');
    });

    gedi.set('[thing]', 'stuff');   
});

test('array bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);
    
    gedi.set('[things]', []);
    gedi.bind('[things]', function(){
        t.pass('detected [things] change');
    });

    gedi.set('[things/0]', 'stuff');
});

test('nested bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);
    
    gedi.set('[thing/stuff/majigger]', 'things');
    gedi.bind('[thing/stuff/majigger]', function(){
        t.pass('captured [thing/stuff/majigger] change');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
});

test('pre-allocated bind', function(t) {
    var gedi = new Gedi();
    
    t.plan(1);

    gedi.bind('[thing/stuff/majigger]', function(){
        t.pass('captured [thing/stuff/majigger] change');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
});

test('remove bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);
    
    gedi.set('[thing]', 'things');
    gedi.bind('[thing]', function(){
        t.pass('captured [thing] remove');
    });

    gedi.remove('[thing]');
});

test('scoped bind', function(t) {
    var gedi = new Gedi({thing:[1,2,3]});
        
    t.plan(2);
    
    // Root binding should NOT fire
    gedi.bind('[]', function(){
        t.pass('captured [] change');
    });
    
    // Array binding SHOULD fire
    gedi.bind('[thing]', function(){
        t.pass('captured [thing] change');
    });                        
    
    // child binding SHOULD fire
    gedi.bind('[thing/4]', function(){
        t.fail('captured [thing/4] change');
    });
    
    gedi.set('[thing/3]',4);
});

test('remove scoped bind', function(t) {
    var gedi = new Gedi({a:1,b:2,c:3});

    t.plan(2);        
    
    // Object binding SHOULD fire
    gedi.bind('[]', function(){
        t.pass('captured [] change');
    });
    
    // target binding SHOULD fire
    gedi.bind('[a]', function(){
        t.pass('captured [a] change');
    });
    
    // Sibling binding should NOT fire
    gedi.bind('[b]', function(){
        t.fail('captured [b] change (should not have fired)');
    });
    
    gedi.remove('[a]');
});