var Gedi = require('../'),
    test = require('grape');

test('escaped braces', function(t) {
    var model = {},
        gedi = new Gedi(model);

    model['[]'] = 'things';

    t.plan(1);
    t.equal(
        gedi.get('[\\[\\]]'),
        'things',
        'ok'
    );
    t.end();
});

test('escaped braces resolution', function(t) {
    var model = {},
        gedi = new Gedi(model);

    model['[]'] = {};
    model['[]'][']['] = 'things';

    t.plan(1);
    t.equal(
        gedi.get('[\\]\\[]', '[\\[\\]]'),
        'things',
        'ok'
    );
    t.end();
});

// http://knowyourmeme.com/memes/xzibit-yo-dawg
test('escaped escapes', function(t) {
    var model = {},
        gedi = new Gedi(model);

    model['\\'] = 'things';

    t.plan(1);
    t.equal(gedi.get('[\\\\]'), 'things', 'ok');
    t.end();
});

test('escaped escapes resolution', function(t) {
    var model = {},
        gedi = new Gedi(model);

    model['\\'] = {};
    model['\\']['\\'] = 'things';

    t.plan(1);
    t.equal(gedi.get('[\\\\]', '[\\\\]'), 'things', 'ok');
    t.end();
});

test('escaped braces and escaped escapes', function(t) {
    var model = {},
        gedi = new Gedi(model);

    model['\\[]\\'] = 'things';

    t.plan(1);
    t.equal(gedi.get('[\\\\[\\]\\\\]'), 'things', 'ok');
    t.end();
});