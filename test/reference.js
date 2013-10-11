var Gedi = require('../'),
    test = require('tape');

test('reference bind', function(t) {
    var obj = {},
        gedi = new Gedi({
            foo: obj,
            bar: obj
        });

    t.plan(2);

    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });
    gedi.bind('[bar/things]', function(){
        t.pass('detected [bar/things] change');
    });

    gedi.set('[foo/things]', 'things');

    t.end();
});

test('removed reference bind', function(t) {
    var obj = {},
        gedi = new Gedi({
            foo: obj,
            bar: obj
        });

    t.plan(2);

    // Should fire once when [foo] is set
    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });

    // Should fire once when [bar/things] is set
    gedi.bind('[bar/things]', function(){
        t.pass('detected [bar/things] change');
    });

    gedi.set('[foo]', 'foo');

    gedi.set('[bar/things]', 'things');

    t.end();
});

test('late added reference bind', function(t) {
    var obj = {things:'stuff'},
        gedi = new Gedi();

    t.plan(4);

    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });
    gedi.bind('[bar/things]', function(){
        t.pass('detected [bar/things] change');
    });

    gedi.set('[foo]', obj);
    gedi.set('[bar]', obj);

    gedi.set('[foo/things]', 'things');

    t.end();
});

test('recursive added reference bind', function(t) {
    var obj = {things:'stuff'},
        gedi = new Gedi();

    t.plan(3);

    gedi.set('[foo]', obj);
    gedi.set('[foo/foo]', obj);

    gedi.bind('[foo/things]', function(){
        t.pass('detected [foo/things] change');
    });
    gedi.bind('[foo/foo/things]', function(){
        t.pass('detected [foo/foo/things] change');
    });
    gedi.bind('[foo/foo/foo/foo/foo/foo/foo/foo/things]', function(){
        t.pass('detected [foo/foo/foo/foo/foo/foo/foo/foo/things] change');
    });

    gedi.set('[foo/things]', 'things');

    t.end();
});