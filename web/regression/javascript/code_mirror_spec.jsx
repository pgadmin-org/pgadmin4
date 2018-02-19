/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import $ from 'jquery';
import CodeMirror from '../../pgadmin/static/jsx/history/detail/code_mirror';
import jasmineEnzyme from 'jasmine-enzyme';

import {shallow} from 'enzyme';
import './helper/enzyme.helper';

describe('CodeMirror', () => {
  beforeEach(() => {
    jasmineEnzyme();
  });

  describe('#hydrateWhenBecomesVisible', () => {
    let codeMirror, isVisibleSpy;

    beforeEach(() => {
      codeMirror = shallow(<CodeMirror />).instance();
      isVisibleSpy = spyOn($.fn, 'is');
      spyOn(codeMirror, 'hydrate');
    });

    describe('when component is visible', () => {
      beforeEach(() => {
        isVisibleSpy.and.returnValue(true);
      });

      it('should hydrate the codemirror element', () => {
        codeMirror.hydrateWhenBecomesVisible();
        expect(codeMirror.hydrate).toHaveBeenCalledTimes(1);
      });
    });

    describe('when component is not visible', () => {
      beforeEach(() => {
        isVisibleSpy.and.returnValue(false);
      });

      it('should not hydrate the codemirror element', () => {
        codeMirror.hydrateWhenBecomesVisible();
        expect(codeMirror.hydrate).not.toHaveBeenCalled();
      });

      describe('when becomes visible', () => {
        beforeEach(() => {
          isVisibleSpy.and.returnValue(true);
        });

        it('should hydrate the codemirror element', (done) => {
          setTimeout(() => {
            codeMirror.hydrateWhenBecomesVisible();
            expect(codeMirror.hydrate).toHaveBeenCalledTimes(1);
            done();
          }, 150);
        });
      });
    });
  });
});
