var Gedi = require('../'),
    test = require('grape');

test('bind bubbled event.getValue()', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:10}}});

    t.plan(2);

    gedi.bind('[thing...]', function(evt){
        t.deepEqual(
            evt.getValue(),
            { stuff: { majigger: 20 } },
            'captured [thing...] change, getValue() matches expected'
        );
    });

    gedi.bind('[thing/stuff/majigger]', function(evt){
        t.equal(
            evt.getValue(),
            20,
            'captured [thing/stuff/majigger] change, getValue() matches expected'
        );
    });

    gedi.set('[thing/stuff/majigger]', 20);
    t.end();
});

test('bind bubbled event.getValue() remove', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:10}}});

    t.plan(2);

    gedi.bind('[thing...]', function(evt){
        t.deepEqual(
            evt.getValue(),
            { stuff: {} },
            'captured [thing...] change, getValue() matches expected'
        );
    });

    gedi.bind('[thing/stuff/majigger]', function(evt){
        t.notOk(evt.getValue(), 'captured [thing/stuff/majigger] change, getValue() result undefined');
    });

    gedi.remove('[thing/stuff/majigger]');
    t.end();
});

test('bind expression event.value', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:10}}});

    t.plan(1);

    gedi.bind('(/ [thing/stuff/majigger] 2)', function(evt){
        t.equal(
            evt.getValue(),
            10,
            'captured [thing/stuff/majigger] change, getValue() matches expression value'
        );
    });

    gedi.set('[thing/stuff/majigger]', 20);
    t.end();
});

test('bind expression event.getValue() complex', function(t) {
    var gedi = new Gedi({thing:{stuff:{majigger:[true,false,true]}}});

    t.plan(2);

    gedi.bind(
        '(length (filter [majigger] {item (!= item null)}))',
        function(evt) {
            t.equal(evt.getValue(), 4, 'binding triggered, got expected value');
        },
        '[thing/stuff]'
    );

    gedi.bind(
        '[thing/stuff...]',
        function(evt) {
            t.deepEqual(
                evt.getValue(),
                { majigger: [ true, false, true, 'hello' ]},
                'captured [thing/stuff...] update, value matched expected'
            );
        }
    );

    gedi.set('[thing/stuff/majigger/3]', 'hello');
    t.end();
});