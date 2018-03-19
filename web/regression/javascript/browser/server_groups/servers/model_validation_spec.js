/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {ModelValidation} from 'sources/browser/server_groups/servers/model_validation';

describe('Server#ModelValidation', () => {
  describe('When validating a server parameters', () => {
    let model;
    let modelValidation;
    beforeEach(() => {
      model = {
        errorModel: jasmine.createSpyObj('errorModel', ['set', 'unset']),
        allValues: {},
        get: function (key) {
          return this.allValues[key];
        },
        set: function (key, value) {
          this.key = value;
        },
        sessAttrs: {},
      };
      model.isNew = jasmine.createSpy('isNew');
      modelValidation = new ModelValidation(model);
    });

    describe('When all parameters are valid', () => {
      beforeEach(() => {
        model.isNew.and.returnValue(true);
        model.allValues['name'] = 'some name';
        model.allValues['username'] = 'some username';
        model.allValues['port'] = 12345;
      });

      describe('No service id', () => {
        it('does not set any error in the model', () => {
          model.allValues['host'] = 'some host';
          model.allValues['db'] = 'some db';
          model.allValues['hostaddr'] = '1.1.1.1';
          expect(modelValidation.validate()).toBeNull();
          expect(model.errorModel.set).toHaveBeenCalledWith({});
        });
      });

      describe('Service id present', () => {
        it('does not set any error in the model', () => {
          model.allValues['service'] = 'asdfg';
          expect(modelValidation.validate()).toBeNull();
          expect(model.errorModel.set).toHaveBeenCalledWith({});
        });
      });

      describe('Service id present', () => {
        it('sets empty service name which should throw an error', () => {
          model.allValues['service'] = '';
          expect(modelValidation.validate()).toBe('Either Host name, Address or Service must be specified.');
          expect(model.errorModel.set).toHaveBeenCalledWith({
            host: 'Either Host name, Address or Service must be specified.',
            hostaddr: 'Either Host name, Address or Service must be specified.',
            db: 'Maintenance database must be specified.'
          });
        });
      });


    });

    describe('When no parameters are valid', () => {
      describe('Service id not present', () => {
        it('does not set any error in the model', () => {
          expect(modelValidation.validate()).toBe('Name must be specified.');
          expect(model.errorModel.set).toHaveBeenCalledTimes(1);
          expect(model.errorModel.set).toHaveBeenCalledWith({
            name: 'Name must be specified.',
            host: 'Either Host name, Address or Service must be specified.',
            hostaddr: 'Either Host name, Address or Service must be specified.',
            db: 'Maintenance database must be specified.',
            username: 'Username must be specified.',
            port: 'Port must be specified.'
          });
        });
      });

      describe('Host address is not valid', () => {
        it('sets the "Host address must be a valid IPv4 or IPv6 address" error', () => {
          model.allValues['hostaddr'] = 'something that is not an ip address';
          expect(modelValidation.validate()).toBe('Host address must be valid IPv4 or IPv6 address.');
          expect(model.errorModel.set).toHaveBeenCalledTimes(1);
          expect(model.errorModel.set).toHaveBeenCalledWith({
            name: 'Name must be specified.',
            hostaddr: 'Host address must be valid IPv4 or IPv6 address.',
            db: 'Maintenance database must be specified.',
            username: 'Username must be specified.',
            port: 'Port must be specified.'
          });
        });
      });

      describe('Service id present', () => {
        it('does not set any error in the model', () => {
          model.allValues['service'] = 'asdfg';
          expect(modelValidation.validate()).toBe('Name must be specified.');
          expect(model.errorModel.set).toHaveBeenCalledTimes(1);
          expect(model.errorModel.set).toHaveBeenCalledWith({
            name: 'Name must be specified.',
            username: 'Username must be specified.',
            port: 'Port must be specified.'
          });
        });
      });
    });
  });
});
