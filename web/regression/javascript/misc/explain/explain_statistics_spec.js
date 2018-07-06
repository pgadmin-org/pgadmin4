import StatisticsModel from '../../../../pgadmin/misc/static/explain/js/explain_statistics';
import $ from 'jquery';

describe('ExplainStatistics', () => {
  let statsModel;
  let statsDiv;
  let tooltipContainer;

  beforeEach(function() {
    statsModel = new StatisticsModel();
    statsDiv = '<div class="pg-explain-stats-area btn-group hidden"></div>';
    tooltipContainer = $('<div></div>', {
      id: 'toolTip',
      class: 'pgadmin-explain-tooltip',
    });
  });

  describe('No Statistics', () => {
    it('Statistics button should be hidden', () => {
      $('body').append(statsDiv);

      statsModel.set('JIT', []);
      statsModel.set('Triggers', []);
      statsModel.set_statistics(tooltipContainer);

      expect($('.pg-explain-stats-area').hasClass('hidden')).toBe(true);
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
      expect($('.pg-explain-stats-area').hasClass('hidden')).toBe(false);
    });

    it('Mouse over event should be trigger', () => {
      // Trigger mouse over event
      var hoverEvent = new $.Event('mouseover');
      $('.pg-explain-stats-area').trigger(hoverEvent);

      expect(tooltipContainer.css('opacity')).toBe('0.8');
    });

    it('Mouse out event should be trigger', () => {
      // Trigger mouse out event
      var hoverEvent = new $.Event('mouseout');
      $('.pg-explain-stats-area').trigger(hoverEvent);

      expect(tooltipContainer.css('opacity')).toBe('0');
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
      expect($('.pg-explain-stats-area').hasClass('hidden')).toBe(false);
    });

    it('Mouse over event should be trigger', () => {
      // Trigger mouse over event
      var hoverEvent = new $.Event('mouseover');
      $('.pg-explain-stats-area').trigger(hoverEvent);

      expect(tooltipContainer.css('opacity')).toBe('0.8');
    });

    it('Mouse out event should be trigger', () => {
      // Trigger mouse out event
      var hoverEvent = new $.Event('mouseout');
      $('.pg-explain-stats-area').trigger(hoverEvent);

      expect(tooltipContainer.css('opacity')).toBe('0');
    });
  });
});
