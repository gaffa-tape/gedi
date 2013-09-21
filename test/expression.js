var Gedi = require('../'),
    test = require('tape');

test('expression path resolving', function(t) {
    var gedi = new Gedi({stuff:{things:[1,2,3]}});

    t.plan(3);

    t.equal(
        gedi.get('(last [things])', '[stuff]'),
        3,
        'last item in [things] = 3'
    );

    t.equal(
        gedi.get('(length [/stuff].things)', '[stuff]'),
        3,
        '[/stuff].things contains 3 items'
    );

    t.equal(
        gedi.get('(length [/stuff/things])', '[stuff]'),
        3,
        '[/stuff/things] contains 3 items'
    );
    t.end();
});

test('expression path setting', function(t) {
    var gedi = new Gedi({stuff:{thing:'majigger'}});

    gedi.set('[stuff].thing', 'wat');

    t.plan(1);

    t.equal(
        gedi.get('[stuff/thing]'),
        'wat',
        'set via dot notation'
    );

    t.end();
});

test('deep expression path setting', function(t) {
    var gedi = new Gedi({stuff:{thing:{majigger:'whatsits'}}});

    gedi.set('[stuff].thing.majigger', 'wat');

    t.plan(1);

    t.equal(
        gedi.get('[stuff/thing/majigger]'),
        'wat',
        'set via multiple dot notations'
    );

    t.end();
});

test('expression multiple path setting', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.set('(filter [stuff] {thing (> thing 2)})', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        [1,2,'wat','wat','wat'],
        'set via filter'
    );

    t.end();
});

test('complex expression setting', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.set('(slice 3 (sort [stuff] {a b (< a b)}))', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        ['wat','wat',3,4,5],
        'set via sort and slice'
    );

    t.end();
});

test('complex expression setting 2', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.set('(last [stuff])', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        [1,2,3,4,'wat'],
        'set via last'
    );

    t.end();
});

test('expression path removing', function(t) {
    var gedi = new Gedi({stuff:{thing:'majigger'}});

    gedi.remove('[stuff].thing');

    t.plan(1);

    t.equal(
        gedi.get('[stuff/thing]'),
        undefined,
        'remove via dot notation'
    );

    t.end();
});

test('deep expression path removing', function(t) {
    var gedi = new Gedi({stuff:{thing:{majigger:'whatsits'}}});

    gedi.remove('[stuff].thing.majigger');

    t.plan(1);

    t.equal(
        gedi.get('[stuff/thing/majigger]'),
        undefined,
        'remove via multiple dot notations'
    );

    t.end();
});

test('expression multiple path removing', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.remove('(filter [stuff] {thing (> thing 2)})');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        [1,2],
        'remove via filter'
    );

    t.end();
});

test('complex expression removing', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.remove('(slice 3 (sort [stuff] {a b (< a b)}))');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        [3,4,5],
        'remove via sort and slice'
    );

    t.end();
});

test('complex expression removing 2', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.remove('(last [stuff])');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        [1,2,3,4],
        'remove via last'
    );

    t.end();
});


test('set explicit dirty expression', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.setDirtyState('(filter [stuff] {thing (> thing 2)})', true);

    t.plan(2);
    t.ok(gedi.isDirty('[stuff/4]'), 'model dirty as expected');
    t.ok(!gedi.isDirty('[stuff/1]'), 'model not dirty as expected');
    t.end();
});