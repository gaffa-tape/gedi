var Gedi = require('../'),
    test = require('grape');

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


});

test('expression multiple path setting relative', function(t) {
    var gedi = new Gedi({things: {stuff:[1,2,3,4,5]}});

    gedi.set('(filter [stuff] {thing (> thing 2)})', 'wat', '[things]');

    t.plan(1);

    t.deepEqual(
        gedi.get('[things/stuff]'),
        [1,2,'wat','wat','wat'],
        'set via filter'
    );


});

test('complex expression setting', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.set('(slice 3 (sort [stuff] {a b (- b a)}))', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        ['wat','wat',3,4,5],
        'set via sort and slice'
    );


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


});

test('complex expression setting 3', function(t) {
    var gedi = new Gedi({stuff:'things'});

    gedi.set('({stuff stuff} [stuff])', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        'wat',
        'set via anon function'
    );


});

test('complex expression setting 4', function(t) {
    var gedi = new Gedi({things:[0,1,2,3,4,5]});

    gedi.set('(findOne [things] {thing (== thing 3)})', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[things/3]'),
        'wat',
        'set via anon function'
    );


});

test('complex expression setting 5', function(t) {
    var gedi = new Gedi({things:[
            {prop:1},
            {prop:2},
            {prop:3},
            {prop:4}
        ]});

    gedi.set('(map [things] {thing thing.prop})', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[things]'),
        [
            {prop:'wat'},
            {prop:'wat'},
            {prop:'wat'},
            {prop:'wat'}
        ],
        'set via map'
    );


});

test('complex expression setting 6', function(t) {
    var gedi = new Gedi({things:[1,2,3], stuff:[4,5,6]});

    gedi.set('(concat (sort [things] {a b (- a b)}) [stuff])', 'wat');

    t.plan(2);

    t.deepEqual(
        gedi.get('[things]'),
        ['wat','wat','wat'],
        'set things via concat'
    );
    t.deepEqual(
        gedi.get('[stuff]'),
        ['wat','wat','wat'],
        'set stuff via concat'
    );


});

test('complex expression setting 7', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.set('(getValue [stuff] 2)', 'wat');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff/2]'),
        'wat',
        'set via getValue'
    );


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


});

test('complex expression removing 3', function(t) {
    var gedi = new Gedi({stuff:[]});

    gedi.remove('(last [stuff])');

    t.plan(1);

    t.deepEqual(
        gedi.get('[stuff]'),
        [],
        'nothing to remove'
    );

});

test('complex expression removing 4', function(t) {
    var gedi = new Gedi({stuff:[], things:{whatsits:2}});

    gedi.remove('[/stuff],[whatsits]', '[things]');

    t.plan(1);

    t.deepEqual(
        gedi.get('[]'),
        {things:{}},
        'removed data'
    );

});

test('expression removing with scope', function(t) {
    var gedi = new Gedi({a:{b:1}});

    gedi.remove('(getValue [a] b)', null, null, {b: 'b'});

    t.plan(1);

    t.deepEqual(
        gedi.get('[]'),
        {a:{}},
        'removed data'
    );

});

test('set explicit dirty expression', function(t) {
    var gedi = new Gedi({stuff:[1,2,3,4,5]});

    gedi.setDirtyState('(filter [stuff] {thing (> thing 2)})', true);

    t.plan(2);
    t.ok(gedi.isDirty('[stuff/4]'), 'model dirty as expected');
    t.ok(!gedi.isDirty('[stuff/1]'), 'model not dirty as expected');

});