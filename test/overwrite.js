var Gedi = require('../'),
    test = require('tape');

test('set root (overwrite model)', function(t) {
    var gedi = new Gedi();

    gedi.set({things:'stuff'});

    t.plan(1);
    t.equal(
        gedi.get('[things]'),
        'stuff',
        'retrieved [things] ok'
    );
    t.end();
});

test('get root (return model)', function(t) {
    var gedi = new Gedi('stuff');

    t.plan(1);
    t.equal(
        gedi.get(),
        'stuff',
        'root model retrieval ok'
    );
    t.end();
});

test('overwrite dirty state', function(t) {
    var gedi = new Gedi();

    gedi.set({things:'stuff'});

    t.plan(1);
    t.ok(gedi.isDirty(), 'model dirty - as expected');
    t.end();
});

test('overwrite but flag not dirty', function(t) {
    var gedi = new Gedi();
    
    gedi.set({things:'stuff'}, false);

    t.plan(1);
    t.equal(
        gedi.isDirty(),
        false,
        'model not dirty'
    );
    t.end();
});