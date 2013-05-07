var Gedi = require('../'),
    test = require('tape');

test('set clean', function(t) {
    var gedi = new Gedi();
    
    gedi.set('[thing/stuff/majigger]', 'stuff', null, false);

    t.plan(1);
    t.notOk(gedi.isDirty('[thing/stuff/majigger]'), 'model is clean');
});

test('set implicit dirty', function(t) {
    var gedi = new Gedi();
    
    gedi.set('[thing/stuff/majigger]', 'stuff');

    t.plan(1);
    t.ok(gedi.isDirty('[thing/stuff/majigger]'), 'model dirty as expected');
});

test('set explicit dirty', function(t) {
    var gedi = new Gedi();
    
    gedi.set('[thing/stuff/majigger]', 'stuff', null, true);

    t.plan(1);
    t.ok(gedi.isDirty('[thing/stuff/majigger]'), 'model dirty as expected');
});

test('dirty expression', function(t) {
    var gedi = new Gedi();

    t.plan(2);
   
    gedi.set({things:'stuff'}, false);
    t.equal(gedi.get('(isDirty)'), false, 'expression ok, model not dirty');

    gedi.set({things:'stuff'});
    t.equal(gedi.get('(isDirty)'), true, 'expression ok, model dirty');
});

test('dirty expression - test target', function(t) {
    var gedi = new Gedi({things:{a:'a',b:'b',c:'c'},stuff:'b',majigger:'c'});
    
    gedi.set('[things/a]', 'nope', false);
    gedi.set('[things/b]', 'yerp');

    t.plan(2);

    t.equal(
        gedi.get('(isDirty [things/a])'),
        false,
        'expression ok, [things/a] not dirty'
    );

    t.equal(
        gedi.get('(isDirty [things/b])'),
        true,
        'expression ok, [things/b] dirty'
    );
});

test('get all dirty', function(t) {
    var gedi = new Gedi();

    gedi.set({things:'stuff'}, false);

    t.plan(1);
    t.notOk(
        gedi.get('(getAllDirty).things'),
        'things not in the list of dirty objects'
    );
});

test('get all dirty - multiple changes', function(t) {
    var gedi = new Gedi({things:{a:'a',b:'b',c:'c'},stuff:'b',majigger:'c'}),
        allDirty;

    gedi.set('[things/a]', 'nope', false);
    gedi.set('[things/b]', 'yerp');

    t.plan(1);
    t.deepEqual(
        gedi.get('(getAllDirty [things])'),
        { b: 'yerp' },
        'getAllDirty expression resolved ok'
    );
});