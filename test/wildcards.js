var Gedi = require('../'),
    test = require('grape');

test('wildcard callbacks get triggered', function(t) {
    var gedi = new Gedi({thing:{stuff:[{a:1}]}});

    gedi.bind('[thing/stuff/*/a]', function(){
        t.pass('received change');
    });

    t.plan(2);

    gedi.set('[thing/stuff/1/a]', 2);
    gedi.set('[thing/stuff/2/b]', 7);
    gedi.set('[thing/stuff/3/a]', 2);
    t.end();
});


test('wildcard callbacks get correct value', function(t) {
    var gedi = new Gedi({thing:{stuff:[{a:1}]}});

    gedi.bind('[thing/stuff/*/a]', function(event){
        t.equal(event.getValue(), 2);
    });

    t.plan(2);

    gedi.set('[thing/stuff/1/a]', 2);
    gedi.set('[thing/stuff/2/b]', 7);
    gedi.set('[thing/stuff/3/a]', 2);
    t.end();
});

test('relative wildcard callbacks', function(t) {
    var gedi = new Gedi({thing:{stuff:[{a:1}]}});

    gedi.bind('[*/a]', function(event){
        t.equal(event.getValue(), 2);
    }, '[thing/stuff]');

    t.plan(2);

    gedi.set('[thing/stuff/1/a]', 2);
    gedi.set('[thing/stuff/2/b]', 7);
    gedi.set('[thing/stuff/3/a]', 2);
    t.end();
});

test('multiple wildcards', function(t) {
    var gedi = new Gedi();

    gedi.bind('[thing/*/stuff/*/a]', function(event){
        t.pass('received change');
    });

    t.plan(3);

    gedi.set('[thing/1/stuff/1/a]', 2);
    gedi.set('[thing/2/stuff/2/b]', 2);
    gedi.set('[stuff/3/stuff/3/a]', 2);
    gedi.set('[thing/2/stuff/2/a]', 2);
    gedi.set('[stuff/3/stuff/3/a]', 2);
    gedi.set('[thing/3/stuff/3/a]', 2);
    t.end();
});