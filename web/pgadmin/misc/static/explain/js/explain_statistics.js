/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import Backbone from 'backbone';
import gettext from 'sources/gettext';

// Backbone model for other statistics
let StatisticsModel = Backbone.Model.extend({
  defaults: {
    JIT: [],
    Triggers: [],
    Summary: {},
  },

  set_statistics: function(toolTipContainer) {
    var jit_stats = this.get('JIT'),
      triggers_stats = this.get('Triggers'),
      summary = this.get('Summary');

    if (Object.keys(jit_stats).length > 0 ||
        Object.keys(triggers_stats).length > 0 ||
        Object.keys(summary).length > 0) {
      $('.pg-explain-stats-area').removeClass('d-none');
    }

    var tooltip = $('<table></table>', {
      class: 'pgadmin-tooltip-table',
    });

    if (Object.keys(jit_stats).length > 0){
      tooltip.append('<tr><td class="label explain-tooltip">' + gettext('JIT:') + '</td></tr>');
      _.each(jit_stats, function(value, key) {
        key = _.escape(key);
        value = _.escape(value);
        tooltip.append(`
          <tr>
            <td class="label explain-tooltip">  ${key}</td>
            <td class="label explain-tooltip-val">${value}</td>
          </tr>
        `);
      });
    }

    if (Object.keys(triggers_stats).length > 0){
      tooltip.append('<tr><td class="label explain-tooltip">' + gettext('Triggers:') + '</td></tr>');
      _.each(triggers_stats, function(triggers, key_id) {
        if (triggers instanceof Object) {
          _.each(triggers, function(value, key) {
            if (key === 'Trigger Name') {
              key = _.escape(key);
              value = _.escape(value);
              tooltip.append(`
                <tr>
                  <td class="label explain-tooltip">  ${key}</td>
                  <td class="label explain-tooltip-val">${value}</td>
                </tr>
              `);
            } else {
              key = _.escape(key);
              value = _.escape(value);
              tooltip.append(`
                <tr>
                  <td class="label explain-tooltip">    ${key}</td>
                  <td class="label explain-tooltip-val">${value}</td>
                </tr>
              `);
            }
          });
        }
        else {
          key_id = _.escape(key_id);
          triggers = _.escape(triggers);
          tooltip.append(`
            <tr>
              <td class="label explain-tooltip">  ${key_id}</td>
              <td class="label explain-tooltip-val">${triggers}</td>
            </tr>
          `);
        }
      });
    }

    if (Object.keys(summary).length > 0){
      tooltip.append('<tr><td class="label explain-tooltip">' + gettext('Summary:') + '</td></tr>');
      _.each(summary, function(value, key) {
        key = _.escape(key);
        value = _.escape(value);
        tooltip.append(`
          <tr>
            <td class="label explain-tooltip">  ${key}</td>
            <td class="label explain-tooltip-val">${value}</td>
          </tr>
        `);
      });
    }

    $('.pg-explain-stats-area').off('mouseover').on('mouseover', () => {
      // Empty the tooltip content if it has any and add new data

      if (Object.keys(jit_stats).length == 0 &&
        Object.keys(triggers_stats).length == 0 &&
        Object.keys(summary).length == 0) {
        return;
      }

      toolTipContainer.empty();
      toolTipContainer.append(tooltip);

      // Show toolTip at respective x,y coordinates
      toolTipContainer.css({
        'opacity': '0.8',
        'left': '',
        'right': '65px',
        'top': '15px',
      });

      $('.pgadmin-explain-tooltip').css('padding', '5px');
      $('.pgadmin-explain-tooltip').css('border', '1px solid white');
    });

    // Remove tooltip when mouse is out from node's area
    $('.pg-explain-stats-area').off('mouseout').on('mouseout', () => {
      toolTipContainer.empty();
      toolTipContainer.css({
        'opacity': '0',
        'left': 0,
        'top': 0,
        'right': '',
      });
    });
  },
});

module.exports = StatisticsModel;
