/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import StatisticsModel from '../../../../pgadmin/misc/static/explain/js/explain_statistics';
import $ from 'jquery';

describe('ExplainStatistics', () => {
  let statsModel;
  let statsDiv;
  let tooltipContainer;

  beforeEach(function() {
    statsModel = new StatisticsModel();
    statsDiv = '<div class="pg-explain-stats-area btn-group d-none"></div>';
    tooltipContainer = $(
      `<div class="pgadmin-explain-details d-none">
       <div class="details-header">
         <div class="details-title"></div>
       </div>
       <div class="details-body"></div>
     </div>`
    );
  });

  describe('No Statistics', () => {
    it('Statistics button should be hidden', () => {
      $('body').append(statsDiv);

      statsModel.set('JIT', []);
      statsModel.set('Triggers', []);
      statsModel.set('Summary', {});
      statsModel.set_statistics(tooltipContainer);

      expect($('.pg-explain-stats-area').hasClass('d-none')).toEqual(true);
    });
  });

  describe('JIT Statistics', () => {
    beforeEach(function() {
      $('body').append(statsDiv);
      statsModel.set('JIT', [{'cost': '100'}]);
      statsModel.set('Triggers', []);
      statsModel.set_statistics(tooltipContainer);
    });

    it('Statistics button should be visible', () => {
      expect($('.pg-explain-stats-area').hasClass('d-none')).toEqual(false);
    });

    it('Mouse click event should be trigger', () => {
      // Trigger mouse over event
      var clickEvent = new $.Event('click');
      $('.pg-explain-stats-area').trigger(clickEvent);

      expect(tooltipContainer.hasClass('d-none')).toBe(false);
    });
  });

  describe('Triggers Statistics', () => {
    beforeEach(function() {
      $('body').append(statsDiv);
      statsModel.set('JIT', []);
      statsModel.set('Triggers', [{'name': 'test_trigger'}]);
      statsModel.set_statistics(tooltipContainer);
    });

    it('Statistics button should be visible', () => {
      expect($('.pg-explain-stats-area').hasClass('d-none')).toEqual(false);
    });

    it('Mouse click event should be trigger', () => {
      // Trigger mouse over event
      var clickEvent = new $.Event('click');
      $('.pg-explain-stats-area').trigger(clickEvent);

      expect(tooltipContainer.hasClass('d-none')).toBe(false);
    });
  });

  describe('Summary', () => {
    beforeEach(function() {
      $('body').append(statsDiv);
      statsModel.set('JIT', []);
      statsModel.set('Triggers', []);
      statsModel.set('Summary', {
        'Planning Time': 0.12,
        'Execution Time': 2.34,
      });
      statsModel.set_statistics(tooltipContainer);
    });

    it('Statistics button should be visible', () => {
      expect($('.pg-explain-stats-area').hasClass('d-none')).toEqual(false);
    });

    it('Mouse click event should be trigger', () => {
      // Trigger mouse over event
      var clickEvent = new $.Event('click');
      $('.pg-explain-stats-area').trigger(clickEvent);

      expect(tooltipContainer.hasClass('d-none')).toBe(false);
    });
  });
});
