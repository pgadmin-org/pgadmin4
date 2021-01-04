//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
define([
  'jquery',
  'backbone',
  'pgadmin.backform',
], function ($, Backbone, Backform) {
  describe('KeyboardshortcutControl', function () {
    let field, innerFields, control, model;

    beforeEach(() => {

      innerFields = [
        {'name': 'key', 'type': 'keyCode', 'label': 'Key'},
        {'name': 'alt_option', 'type': 'checkbox',
          'label': 'Alt/Option'},
        {'name': 'control', 'type': 'checkbox',
          'label': 'Ctrl'},
        {'name': 'shift', 'type': 'checkbox', 'label': 'Shift'},
      ];

      model = new Backbone.Model({
        'shortcut': {
          'control': true,
          'shift': false,
          'alt_option': true,
          'key': {
            'key_code': 73,
            'char': 'I',
          },
        },
      });

      field = new Backform.Field({
        id: 'shortcut',
        name: 'shortcut',
        control: 'keyboardShortcut',
        label: 'Keyboard shortcut',
        fields: innerFields,
      });

      control = new (field.get('control')) ({
        field: field,
        model: model,
      });

      control.render();

    });

    describe('keyboardShortcut UI setup', function () {

      it('keyboard shortcut control should be rendered with inner fields', function () {

        expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');

        expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();

        expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();

        expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();

      });
    });

    describe('onModelChange', function () {
      beforeEach((done) => {

        done();

      });

      it('when model "key" value changes UI and innerModel should update new "key" value', function (done) {

        expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');
        expect(control.innerModel.get('key')).toEqual({
          'key_code': 73,
          'char': 'I',
        });

        var val = $.extend(true, {}, model.get(field.get('name')));

        model.set(field.get('name'),
          $.extend(true, val, {
            'key': {
              'key_code': 65,
              'char': 'A',
            },
          })
        );

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('A');
          expect(control.innerModel.get('key')).toEqual({
            'key_code': 65,
            'char': 'A',
          });

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();
          expect(control.innerModel.get('alt_option')).toBeTruthy();

          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();
          expect(control.innerModel.get('control')).toBeTruthy();

          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();
          expect(control.innerModel.get('shift')).toBeFalsy();

          done();
        }, 100);

      });

      it('when model "control" value changes UI and innerModel should update new "control" value', function (done) {

        expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();
        expect(control.innerModel.get('control')).toBeTruthy();

        var val = $.extend(true, {}, model.get(field.get('name')));

        model.set(field.get('name'),
          $.extend(true, val, {
            'control': false,
          })
        );

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeFalsy();
          expect(control.innerModel.get('control')).toBeFalsy();

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();
          expect(control.innerModel.get('alt_option')).toBeTruthy();

          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');
          expect(control.innerModel.get('key')).toEqual({
            'key_code': 73,
            'char': 'I',
          });

          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();
          expect(control.innerModel.get('shift')).toBeFalsy();

          done();
        }, 100);

      });

      it('when model "shift" value changes UI and innerModel should update new "shift" value', function (done) {

        expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();
        expect(control.innerModel.get('shift')).toBeFalsy();

        var val = $.extend(true, {}, model.get(field.get('name')));

        model.set(field.get('name'),
          $.extend(true, val, {
            'shift': true,
          })
        );

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeTruthy();
          expect(control.innerModel.get('shift')).toBeTruthy();

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();
          expect(control.innerModel.get('alt_option')).toBeTruthy();

          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');
          expect(control.innerModel.get('key')).toEqual({
            'key_code': 73,
            'char': 'I',
          });

          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();
          expect(control.innerModel.get('control')).toBeTruthy();

          done();
        }, 100);

      });

      it('when model "alt_option" value changes UI and innerModel should update new "alt_option" value', function (done) {

        expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();
        expect(control.innerModel.get('alt_option')).toBeTruthy();

        var val = $.extend(true, {}, model.get(field.get('name')));

        model.set(field.get('name'),
          $.extend(true, val, {
            'alt_option': false,
          })
        );

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeFalsy();
          expect(control.innerModel.get('alt_option')).toBeFalsy();

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();
          expect(control.innerModel.get('shift')).toBeFalsy();

          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');
          expect(control.innerModel.get('key')).toEqual({
            'key_code': 73,
            'char': 'I',
          });

          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();
          expect(control.innerModel.get('control')).toBeTruthy();

          done();
        }, 100);

      });

    });

    describe('onInnerModelChange', function () {
      beforeEach((done) => {

        done();

      });

      it('when innerModel "key" value changes UI and model should update new "key" value', function (done) {

        expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');
        expect(model.get(field.get('name'))).toEqual({
          'control': true,
          'shift': false,
          'alt_option': true,
          'key': {
            'key_code': 73,
            'char': 'I',
          },
        });

        control.innerModel.set('key',
          {
            'key_code': 65,
            'char': 'A',
          }
        );

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('A');
          expect(model.get(field.get('name'))).toEqual({
            'control': true,
            'shift': false,
            'alt_option': true,
            'key': {
              'key_code': 65,
              'char': 'A',
            },
          });

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();

          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();

          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();

          done();
        }, 100);

      });

      it('when innerModel "control" value changes UI and model should update new "control" value', function (done) {

        expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();
        expect(model.get(field.get('name'))).toEqual({
          'control': true,
          'shift': false,
          'alt_option': true,
          'key': {
            'key_code': 73,
            'char': 'I',
          },
        });

        control.innerModel.set('control', false);

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeFalsy();
          expect(model.get(field.get('name'))).toEqual({
            'control': false,
            'shift': false,
            'alt_option': true,
            'key': {
              'key_code': 73,
              'char': 'I',
            },
          });

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();

          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');

          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();

          done();
        }, 100);

      });

      it('when innerModel "shift" value changes UI and model should update new "shift" value', function (done) {

        expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();
        expect(model.get(field.get('name'))).toEqual({
          'control': true,
          'shift': false,
          'alt_option': true,
          'key': {
            'key_code': 73,
            'char': 'I',
          },
        });

        control.innerModel.set('shift', true);

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeTruthy();
          expect(model.get(field.get('name'))).toEqual({
            'control': true,
            'shift': true,
            'alt_option': true,
            'key': {
              'key_code': 73,
              'char': 'I',
            },
          });

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();

          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');

          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();

          done();
        }, 100);

      });

      it('when innerModel "alt_option" value changes UI and model should update new "alt_option" value', function (done) {

        expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeTruthy();
        expect(model.get(field.get('name'))).toEqual({
          'control': true,
          'shift': false,
          'alt_option': true,
          'key': {
            'key_code': 73,
            'char': 'I',
          },
        });

        control.innerModel.set('alt_option', false);

        // wait until UI updates.
        setTimeout(function() {
          // this should change
          expect(control.$el.find('input:checkbox[name="alt_option"]')[0].checked).toBeFalsy();
          expect(model.get(field.get('name'))).toEqual({
            'control': true,
            'shift': false,
            'alt_option': false,
            'key': {
              'key_code': 73,
              'char': 'I',
            },
          });

          // below three should not change.
          expect(control.$el.find('input:checkbox[name="shift"]')[0].checked).toBeFalsy();

          expect(control.$el.find('input:text[name="key"]')[0].value).toEqual('I');

          expect(control.$el.find('input:checkbox[name="control"]')[0].checked).toBeTruthy();

          done();
        }, 100);

      });

    });

    describe('remove keyboardShortcut control', function () {

      beforeEach(function() {

        spyOn(control, 'cleanup').and.callThrough();

      });

      it('when removed it should remove all of it\' controls', function () {

        control.remove();

        expect(control.cleanup).toHaveBeenCalled();

        expect(control.controls.length).toEqual(0);

      });

    });

  });
});
