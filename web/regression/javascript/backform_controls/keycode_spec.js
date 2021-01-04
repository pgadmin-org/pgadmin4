//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
define([
  'backbone',
  'pgadmin.backform',
], function (Backbone, Backform) {
  describe('keyCodeControl', function () {
    let field, control, model, event;

    beforeEach(() => {
      model = new Backbone.Model({
        'key': {
          'key_code': 65,
          'char': 'A',
        },
      });

      field = new Backform.Field({
        id: 'key',
        name: 'key',
        control: 'keyCode',
        label: 'Key',
      });

      control = new (field.get('control')) ({
        field: field,
        model: model,
      });

      control.render();

      event = {
        which: -1,
        keyCode: -1,
        key: '',
        preventDefault: jasmine.createSpy('preventDefault'),
      };

    });

    describe('onkeyDown', function () {

      beforeEach((done) => {

        spyOn(model, 'set').and.callThrough();

        spyOn(control, 'onkeyDown').and.callThrough();

        done();
      });

      it('when key with escapeKeyCode is pressed model should not update', function (done) {
        event.which = 16;
        event.keyCode = 16;
        event.key = 'Shift';

        control.onkeyDown(event);

        expect(control.onkeyDown).toHaveBeenCalled();

        expect(model.set).not.toHaveBeenCalled();

        expect(event.preventDefault).not.toHaveBeenCalled();

        expect(model.get('key')).toEqual({
          'key_code': 65,
          'char': 'A',
        });

        // wait until UI updates.
        setTimeout(function() {
          expect(control.$el.find('input')[0].value).toEqual('A');
          done();
        }, 100);

      });

      it('when key other than escapeKeyCode is pressed model should update', function (done) {
        event.which = 66;
        event.keyCode = 66;
        event.key = 'B';

        control.onkeyDown(event);

        expect(control.onkeyDown).toHaveBeenCalled();

        expect(model.set).toHaveBeenCalled();

        expect(event.preventDefault).toHaveBeenCalled();

        expect(model.get('key')).toEqual({
          'key_code': 66,
          'char': 'B',
        });

        // wait until UI updates.
        setTimeout(function() {
          expect(control.$el.find('input')[0].value).toEqual('B');
          done();
        }, 100);

      });

    });

    describe('onkeyUp', function () {

      beforeEach((done) => {
        spyOn(control, 'preventEvent').and.callThrough();

        event.stopPropagation = jasmine.createSpy('stopPropagation');

        event.stopImmediatePropagation = jasmine.createSpy('stopImmediatePropagation');

        done();

      });

      it('when key with escapeKeyCode is pressed and released event should be propagated', function (done) {
        event.which = 17;
        event.keyCode = 17;
        event.key = 'Ctrl';

        control.preventEvent(event);

        expect(control.preventEvent).toHaveBeenCalled();

        expect(event.preventDefault).not.toHaveBeenCalled();

        expect(event.stopPropagation).not.toHaveBeenCalled();

        expect(event.stopImmediatePropagation).not.toHaveBeenCalled();

        // wait until UI updates.
        setTimeout(function() {
          expect(control.$el.find('input')[0].value).toEqual('A');
          done();
        }, 100);

      });

      it('when key other than escapeKeyCode is pressed and released event should not be propagated', function (done) {
        event.which = 66;
        event.keyCode = 66;
        event.key = 'B';

        control.preventEvent(event);

        expect(control.preventEvent).toHaveBeenCalled();

        expect(event.preventDefault).toHaveBeenCalled();

        expect(event.stopPropagation).toHaveBeenCalled();

        expect(event.stopImmediatePropagation).toHaveBeenCalled();

        // wait until UI updates.
        setTimeout(function() {
          expect(control.$el.find('input')[0].value).toEqual('A');
          done();
        }, 100);

      });
    });

    describe('onModelChange', function () {
      beforeEach((done) => {

        done();

      });

      it('when model changes UI should update', function (done) {

        expect(control.$el.find('input')[0].value).toEqual('A');

        model.set('key', {
          'key_code': 67,
          'char': 'C',
        });

        // wait until UI updates.
        setTimeout(function() {
          expect(control.$el.find('input')[0].value).toEqual('C');
          done();
        }, 100);

      });

    });

  });
});
