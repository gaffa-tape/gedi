var Gedi = require('../'),
    test = require('grape');

test('basic get', function(t) {
    var gedi = new Gedi({thing:'stuff'});

    t.plan(2);

    t.equal(
        gedi.get('[thing]'),
        'stuff',
        'found [thing]'
    );

    t.notOk(
        gedi.get('[thing/stuff]'),
        'deep get returning valid result on shallow object'
    );
    t.end();
});

test('nested gets', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});

    t.plan(1);
    t.equal(
        gedi.get('[thing/stuff/majigger]'),
        'stuff',
        'found [thing/stuff/majigger]'
    );
    t.end();
});

test('basic set', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing]', 'stuff');
    t.equal(
        gedi.get('[thing]'),
        'stuff',
        'successfully set [thing]'
    );
    t.end();
});

test('nested set', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});

    t.plan(1);

    gedi.set('[thing/stuff/majigger]', 'things');

    t.equal(
        gedi.get('[thing/stuff/majigger]'),
        'things',
        'successfully set [thing/stuff/majigger]'
    );
    t.end();
});

test('basic remove', function(t) {
    var gedi = new Gedi({thing:'stuff'});

    t.plan(1);

    gedi.remove('[thing]');
    t.notOk(gedi.get('[thing]'), 'removed [thing]');
    t.end();
});

test('nested remove', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});

    t.plan(1);

    gedi.remove('[thing/stuff/majigger]');
    t.notOk(gedi.get('[thing/stuff/majigger]'), 'removed [thing/stuff/majigger]');
    t.end();
});

test('tree creation', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[thing/stuff/majigger]', 'things');
    t.equal(
        gedi.get('[thing/stuff/majigger]'),
        'things',
        'created full tree [thing/stuff/majigger]'
    );
    t.end();
});