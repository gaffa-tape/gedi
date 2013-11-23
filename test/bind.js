var Gedi = require('../'),
    test = require('grape');

test('basic bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing]', 'things');
    gedi.bind('[thing]', function(){
        t.pass('detected [thing] change');
    });

    gedi.set('[thing]', 'stuff');
    t.end();
});

test('array bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[things]', []);
    gedi.bind('[things]', function(){
        t.pass('detected [things] change');
    });

    gedi.set('[things/0]', 'stuff');
    t.end();
});

test('nested bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing/stuff/majigger]', 'things');
    gedi.bind('[thing/stuff/majigger]', function(){
        t.pass('captured [thing/stuff/majigger] change');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
    t.end();
});

test('pre-allocated bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.bind('[thing/stuff/majigger]', function(){
        t.pass('captured [thing/stuff/majigger] change');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
    t.end();
});

test('remove bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing]', 'things');
    gedi.bind('[thing]', function(){
        t.pass('captured [thing] remove');
    });

    gedi.remove('[thing]');
    t.end();
});

test('scoped bind', function(t) {
    var gedi = new Gedi({thing:[1,2,3]});

    t.plan(2);

    // Root binding should NOT fire
    gedi.bind('[]', function(){
        t.fail('captured [] change');
    });

    // Root bubble binding SHOULD fire
    gedi.bind('[...]', function(){
        t.pass('captured [...] change');
    });

    // Array binding SHOULD fire
    gedi.bind('[thing...]', function(){
        t.pass('captured [thing...] change');
    });

    // child binding should NOT fire
    gedi.bind('[thing/4]', function(){
        t.fail('captured [thing/4] change');
    });

    gedi.set('[thing/3]',4);
    t.end();
});

test('remove scoped bind', function(t) {
    var gedi = new Gedi({a:1,b:2,c:3});

    t.plan(1);

    // Object binding should NOT fire
    gedi.bind('[]', function(){
        t.fail('captured [] change');
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
    t.end();
});

test('up levels bind', function(t) {
    var gedi = new Gedi();

    t.plan(0);

    gedi.bind('[thing]', function(){
        t.fail('captured bubbled event on [thing] but shouldn\'t have');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
    t.end();
});

test('bubbled bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.bind('[thing...]', function(){
        t.pass('captured bubbled event on [thing]');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
    t.end();
});

test('up levels bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.bind('[thing]', function(){
        t.fail('captured bubbled event on [thing] but shouldn\'t have');
    });
    gedi.bind('[thing/stuff/majigger]', function(){
        t.pass('captured event on [thing/stuff/majigger]');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
    t.end();
});

test('bubbled bind', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.bind('[thing...]', function(){
        t.pass('captured bubbled event on [thing]');
    });

    gedi.set('[thing/stuff/majigger]', 'stuff');
    t.end();
});