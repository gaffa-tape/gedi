var Gedi = require('../'),
    test = require('tape');

test('empty path', function(t) {
    var gedi = new Gedi(),
        path = new gedi.Path();

    t.plan(1);
    t.equal(path.length, 0, 'empty path has zero length');
});

test('root path', function(t) {
    var gedi = new Gedi(),
        path = new gedi.Path('[/]');

    t.plan(1);
    t.ok(path.length === 1 && path.isRoot(), 'path is root');
});

test('absolute path', function(t) {
    var gedi = new Gedi(),
        path = new gedi.Path('[/majigger]');

    t.plan(1);
    t.ok(path.length === 2 && path.isAbsolute(), 'path is absolute');
});

test('relative path', function(t) {
    var gedi = new Gedi(),
        path = new gedi.Path('[majigger]');

    t.plan(1);
    t.notOk(path.length === 1 && path.isAbsolute(), 'path is not absolute');
});

test('append path', function(t) {
    var gedi = new Gedi(),
        path = new gedi.Path('[majigger]');

    path = path.append('[../stuff]')

    t.plan(1);
    t.equal(path.toString(), '[majigger/../stuff]', 'path append works');
});