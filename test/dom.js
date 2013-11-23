var Gedi = require('../'),
    test = require('grape');

if(typeof window !== 'undefined'){

    test('add DOM node', function(t) {
        var element = document.createElement('span'),
            gedi = new Gedi({
                element: element
            });

        t.plan(1);

        t.equal(
            gedi.get('[element]'),
            element
        );


    });

    test('reference DOM node', function(t) {
        var element = document.createElement('span'),
            gedi = new Gedi({
                element1: element,
                element2: element
            });

        t.plan(1);

        gedi.bind('[element2/className]', function(event){
            t.equal(
                event.getValue(),
                'thing',
                'changes to a DOM node via reference worked somehow even though it shouldnt'
            );
        })

        t.pass('references are not supported on DOM nodes');

        gedi.set('[element1/className]', 'thing');


    });

}