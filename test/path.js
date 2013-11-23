var Gedi = require('../'),
    test = require('grape');

test('root path', function(t) {
    var gedi = new Gedi(),
        path = '[/]';

    t.plan(1);
    t.ok(gedi.paths.isRoot(path), 'path is root');

});

test('absolute path', function(t) {
    var gedi = new Gedi(),
        path = '[/majigger]';

    t.plan(1);
    t.ok(gedi.paths.isAbsolute(path), 'path is absolute');

});

test('relative path', function(t) {
    var gedi = new Gedi(),
        path = '[majigger]';

    t.plan(1);
    t.notOk(gedi.paths.isAbsolute(path), 'path is not absolute');

});

test('append path', function(t) {
    var gedi = new Gedi(),
        path = '[majigger]';

    path = gedi.paths.append(path ,'[../stuff]');

    t.plan(1);
    t.equal(path, '[majigger/../stuff]', 'path append works');

});