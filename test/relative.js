var Gedi = require('../'),
    test = require('tape');

test('relative get', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});
    
    t.plan(1);
    t.equal(
        gedi.get('[majigger]', '[thing/stuff]'),
        'stuff',
        'get [majigger] from using path [thing/stuff] ok'
    );
    t.end();
});

test('relative get root', function(t) {
    var model = {thing:{stuff:{majigger:'stuff'}}},
        gedi = new Gedi(model);

    t.plan(1);
    t.deepEqual(
        gedi.get('[/]', '[thing/stuff]'),
        model,
        'get [/] from path [thing/stuff] matches expected'
    );
    t.end();
});

test('relative set', function(t) {
    var gedi = new Gedi();

    t.plan(1);
    
    gedi.set('[majigger]', 'whatsit', '[thing/stuff]');

    t.equal(
        gedi.get('[thing/stuff/majigger]'),
        'whatsit',
        'successfully set [majigger] from with path [thing/stuff]'
    );
    t.end();
});

test('relative set root', function(t) {
    var model = {thing:{stuff:{majigger:'stuff'}}},
        gedi = new Gedi();

    t.plan(1);

    gedi.set('[/]', model, '[thing/stuff]');
    t.deepEqual(
        gedi.get('[]').thing,
        model.thing,
        'successfully set [/] from path [thing/stuff]'
    );
    t.end();
});

test('up a level get', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}, whatsits:'things'}});

    t.plan(1);
    t.equal(
        gedi.get('[../whatsits]', '[thing/stuff]'),
        'things',
        'can get [../whatsits] from path [thing/stuff]'
    );
    t.end();
});

test('up named levels get', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:{foo:{bar:{pants:'pants'}}}}, whatsits:'things'}});

    t.plan(1);
    t.equal(
        gedi.get('[..thing/whatsits]', '[thing/stuff/majigger/foo/bar/pants]'),
        'things',
        'can get [..thing/whatsits] from path [thing/stuff/majigger/foo/bar/pants]'
    );
    t.end();
});

test('get indexed item', function(t) {
    var gedi = new Gedi({
            things:[
                {
                    stuff:{
                        majigger:'stuff'
                    },
                    whatsits:'whatsits'
                }
            ]
        });

    t.plan(1);
    t.equal(
        gedi.get('[..things/#/whatsits]', '[things/0/stuff/majigger]'),
        'whatsits',
        'can get [..things/#/whatsits] from path [things/0/stuff/majigger]'
    );
    t.end();
});

test('up a level set', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[../whatsit]', 'whatsit', '[thing/stuff]');
    t.equal(
        gedi.get('[/thing/whatsit]'),
        'whatsit',
        'successfully set [../whatsit] from [thing/stuff]'
    );
    t.end();
});

test('up named levels get', function(t) {
    var gedi = new Gedi();

    t.plan(1);

    gedi.set('[..thing/whatsit]', 'whatsit', '[thing/stuff/majigger/foo/bar/pants]');
    t.equal(
        gedi.get('[/thing/whatsit]'),
        'whatsit',
        'can set [..thing/whatsit] from path [thing/stuff/majigger/foo/bar/pants]'
    );
});

test('root get', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}, whatsits:'hello'}});

    t.plan(1);
    t.equal(
        gedi.get('[/thing/whatsits]', '[thing/stuff]'),
        'hello',
        'successfully got value for [/thing/whatsits] using the path [thing/stuff]'
    );
    t.end();
});

test('root set', function(t) {
    var gedi = new Gedi();

    t.plan(1);
    
    gedi.set('[thing/stuff/majigger]', 'stuff');
    gedi.set('[/thing/whatsits]', 'hello', '[thing/stuff/majigger]');

    t.equal(
        gedi.get('[/thing/whatsits]'),
        'hello',
        'successfully set [/thing/whatsits] from path [thing/stuff/majigger]'
    );
    t.end();
});

test('same path get', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:'stuff'}}});

    t.plan(1);
    t.equal(
        gedi.get('[]', '[thing/stuff/majigger]'),
        'stuff',
        'successfully got value for [] from path [thing/stuff/majigger]'
    );
    t.end();
});

test('same path set', function(t) {
    var gedi = new Gedi();

    gedi.set('[]', 'stuff', '[thing/stuff/majigger]');

    t.plan(1);
    t.equal(
        gedi.get('[thing/stuff/majigger]'),
        'stuff',
        'successfully set value for [] from path [thing/stuff/majigger]'
    );
    t.end();
});