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