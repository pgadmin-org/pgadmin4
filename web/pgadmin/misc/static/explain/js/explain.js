/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.misc.explain', [
  'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'backbone', 'explain_statistics',
  'svg_downloader', 'image_maper', 'sources/gettext', 'bootstrap',
], function(
  url_for, $, _, pgAdmin, Backbone, StatisticsModel,
  svgDownloader, imageMapper, gettext
) {

  pgAdmin = pgAdmin || window.pgAdmin || {};
  svgDownloader = svgDownloader.default;
  var Snap = null;

  var initSnap = function(snapModule) {
    Snap = snapModule;
    // Snap.svg plug-in to write multitext as image name
    Snap.plugin(function(_Snap, Element, Paper) {
      Paper.prototype.multitext = function(x, y, txt, max_width, attributes) {
        var svg = _Snap(),
          abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
          temp = svg.text(0, 0, abc);

        temp.attr(attributes);

        /*
         * Find letter width in pixels and
         * index from where the text should be broken
         */
        var letter_width = temp.getBBox().width / abc.length,
          word_break_index = Math.round((max_width / letter_width)) - 1;

        svg.remove();

        var words = txt.split(' '),
          width_so_far = 0,
          lines = [],
          curr_line = '',
          /*
           * Function to divide string into multiple lines
           * and store them in an array if it size crosses
           * the max-width boundary.
           */
          splitTextInMultiLine = function(leading, so_far, line) {
            var l = line.length,
              res = [];

            if (l == 0)
              return res;

            if (so_far && (so_far + (l * letter_width) > max_width)) {
              res.push(leading);
              res = res.concat(splitTextInMultiLine('', 0, line));
            } else if (so_far) {
              res.push(leading + ' ' + line);
            } else {
              if (leading)
                res.push(leading);
              if (line.length > word_break_index + 1)
                res.push(line.slice(0, word_break_index) + '-');
              else
                res.push(line);
              res = res.concat(splitTextInMultiLine('', 0, line.slice(word_break_index)));
            }

            return res;
          };

        for (var i = 0; i < words.length; i++) {
          var tmpArr = splitTextInMultiLine(
            curr_line, width_so_far, words[i]
          );

          if (curr_line) {
            lines = lines.slice(0, lines.length - 1);
          }
          lines = lines.concat(tmpArr);
          curr_line = lines[lines.length - 1];
          width_so_far = (curr_line.length * letter_width);
        }

        // Create multiple tspan for each string in array
        var t = this.text(x, y, lines).attr(attributes);
        t.selectAll('tspan:nth-child(n+2)').attr({
          dy: '1.2em',
          x: x,
        });
        return t;
      };
    });
  };

  if (pgAdmin.Explain)
    return pgAdmin.Explain;

  var pgExplain = pgAdmin.Explain = {
    // Prefix path where images are stored
    prefix: url_for('misc.index') + 'static/explain/img/',
  };

  // Some predefined constants used to calculate image location and its border
  var pWIDTH = 100.;
  var pHEIGHT = 100.;
  var IMAGE_WIDTH = 50;
  var IMAGE_HEIGHT = 50;
  var offsetX = 200,
    offsetY = 60;
  var ARROW_WIDTH = 10,
    ARROW_HEIGHT = 10,
    DEFAULT_ARROW_SIZE = 2;
  var TXT_ALIGN = 5,
    TXT_SIZE = '15px';
  var xMargin = 25,
    yMargin = 25;
  var MIN_ZOOM_FACTOR = 0.01,
    MAX_ZOOM_FACTOR = 2,
    INIT_ZOOM_FACTOR = 1;
  var ZOOM_RATIO = 0.05;

  var _createExplainTable = () => {
    return $([
      '<table class="backgrid table presentation table-bordered ',
      '       table-noouter-border table-hover">',
      ' <thead>',
      '  <tr>',
      '    <th class="renderable pga-ex-collapsible" rowspan="2"></th>',
      '    <th class="renderable" rowspan="2"><button disabled>',
      gettext('#'), '</button></th>',
      '    <th class="renderable" rowspan="2"><button disabled>',
      gettext('Node'), '</button></th>',
      '    <th class="renderable timings d-none" colspan="2"><button disabled>',
      gettext('Timings'), '</button></th>',
      '    <th class="renderable rowsx rows plan_rows d-none" colspan="3">',
      '<button disabled>', gettext('Rows') ,'</button></th>',
      '    <th class="renderable rows rowsx d-none" rowspan="2">',
      '<button disabled>', gettext('Loops') ,'</button></th>',
      /*
       * TODO:: Remove the 'd-none' class, when showing the extra info row
       * implemented.
       */
      '    <th class="renderable d-none" rowspan="2"><button disabled>',
      '  </tr>',
      '  <tr>',
      '    <th class="renderable timings d-none"><button disabled>',
      gettext('Exclusive') , '</button></th>',
      '    <th class="renderable timings d-none"><button disabled>',
      gettext('Inclusive') , '</button></th>',
      '    <th class="renderable rowsx d-none"><button disabled>',
      gettext('Rows X'), '</button></th>',
      '    <th class="renderable rows rowsx d-none"><button disabled>',
      gettext('Actual'), '</button></th>',
      '    <th class="renderable plan_rows rowsx d-none"><button disabled>',
      gettext('Plan'), '</button></th>',
      '  </tr>',
      ' </thead>',
      '</table>',
    ].join(''));
  };

  var _renderExplainTable = (_data, $_container) => {
    var $explainTableData = $('<tbody></tbody>');
    _.each(_data.rows, (_row) => {
      var $tblRow = $(_row);
      $tblRow.appendTo($explainTableData);
    });
    $explainTableData.appendTo($_container);

    if (_data.show_timings === true) {
      $_container.find('.timings').removeClass('d-none');
    }

    if (_data.show_rowsx === true) {
      $_container.find('.rowsx').removeClass('d-none');
    } else if (_data.show_rows === true) {
      $_container.find('.rows').removeClass('d-none');
      $_container.find('thead .rows[colspan=3]').attr('colspan', 1);
    } else if (_data.show_plan_rows === true) {
      $_container.find('.plan_rows').removeClass('d-none');
      $_container.find('thead .rows[colspan=3]').attr('colspan', 1);
    }
  };

  var _createStatisticsTables = () => {
    return $([
      '<div class="row row-eq-height">',
      ' <div class="col-sm-6 col-xs-6">',
      '  <div class="col-xs-12 badge">',
      gettext('Statistics per Node Type'),
      '  </div>',
      '  <table class="backgrid table presentation table-bordered ',
      '         table-hover" for="per_node_type">',
      '   <thead>',
      '    <tr>',
      '      <th class="renderable"><button disabled>',
      gettext('Node type') , '</button></th>',
      '      <th class="renderable"><button disabled>',
      gettext('Count'), '</button></th>',
      '      <th class="renderable timings d-none"><button disabled>',
      gettext('Time spent') ,'</button></th>',
      '      <th class="renderable timings d-none"><button disabled>',
      gettext('%% of query') ,'</button></th>',
      '    </tr>',
      '   </thead>',
      '  </table>',
      ' </div>',
      ' <div class="col-sm-6 col-xs-6">',
      '  <div class="col-xs-12 badge">',
      gettext('Statistics per Table'),
      '  </div>',
      '  <table class="backgrid table presentation table-bordered ',
      '         table-hover" for="per_table">',
      '   <thead>',
      '    <tr>',
      '      <th class="renderable"><button disabled>',
      gettext('Table name') , '</button></th>',
      '      <th class="renderable"><button disabled>',
      gettext('Scan count'), '</button></th>',
      '      <th class="renderable timings d-none"><button disabled>',
      gettext('Total time') ,'</button></th>',
      '      <th class="renderable timings d-none"><button disabled>',
      gettext('%% of query') ,'</button></th>',
      '    </tr>',
      '    <tr>',
      '      <th class="renderable"><button disabled>',
      gettext('Node type') , '</button></th>',
      '      <th class="renderable"><button disabled>',
      gettext('Count'), '</button></th>',
      '      <th class="renderable timings d-none"><button disabled>',
      gettext('Sum of times') ,'</button></th>',
      '      <th class="renderable timings d-none"><button disabled>',
      gettext('%% of table') ,'</button></th>',
      '    </tr>',
      '   </thead>',
      '  </table>',
      ' </div>',
      '</div>',
    ].join(''));
  };

  var _statisticRowTemplate = _.template([
    '<tr<% if (className) {%> class="<%=className%>"<%}%>>',
    ' <td class="renderable name"><%- data.name %></td>',
    ' <td class="renderable text-right"><%- data.count %></td>',
    ' <td class="renderable timings d-none text-right">',
    '<%=Math.ceil10(data.sum_of_times, -3)%> ms',
    '</td>',
    ' <td class="renderable timings d-none text-right">',
    '<%=Math.ceil10(((data.sum_of_times||0)/(total_time||1)) * 100, -2)%>%',
    '</td>',
    '</tr>',
  ].join(''));

  var _renderStatisticsTable = (_data, $_container) => {
    var $perTableTbl = $_container.find('table[for="per_table"]'),
      $perNodeTbl =  $_container.find('table[for="per_node_type"]');

    _.each(
      _.sortBy(_.values(_data.statistics.nodes), 'name'),
      (_node) => (
        $perNodeTbl.append(_statisticRowTemplate({
          'data': _node, 'total_time': _data.total_time,
          'className': '',
        }))
      )
    );

    _.each(
      _.sortBy(_.values(_data.statistics.tables), 'name'),
      (_table) => {
        _table.sum_of_times = 0;
        _.each(_table.nodes, (_node) => (
          _table.sum_of_times += _node.sum_of_times
        ));
        $perTableTbl.append(_statisticRowTemplate({
          'data': _table, 'total_time': _data.total_time,
          'className': 'table',
        }));

        _.each(
          _.sortBy(_.values(_table.nodes), 'name'),
          (_node) => {
            $perTableTbl.append(_statisticRowTemplate({
              'data': _node, 'total_time': _table.sum_of_times,
              'className': 'node',
            }));
          }
        );
      }
    );

    if (_data.show_timings) {
      $_container.find('.timings').removeClass('d-none');
    }
  };

  var _explainRowTemplate = _.template([
    '<tr class="pga-ex-row',
    '<% if (data["Plans"] && data["Plans"].length > 0) {%>',
    ' pga-ex-collapsible',
    '<%}%>',
    '<% if (data["exclusive_flag"] !== "undefined") {%>',
    ' pga-ex-exclusive-', '<%- data["exclusive_flag"] %>',
    '<%}%>',
    '<% if (data["inclusive_flag"] !== "undefined") {%>',
    ' pga-ex-inclusive-', '<%- data["inclusive_flag"] %>',
    '<%}%>',
    '<% if (data["rowsx_flag"] !== "undefined") {%>',
    ' pga-ex-rowsx-', '<%- data["rowsx_flag"] %>',
    '<%}%>',
    '"',
    '<% if (data["parent_node"]) {%>',
    ' data-parent="pga_ex_<%= data["parent_node"] %>"',
    '<%}%>',
    ' data-ex-id="pga_ex_<%= data["level"].join("_") %>">',
    ' <td class="renderable pg-ex-highlighter clickable">',
    '  <i class="fa fa-circle invisible"></i>',
    '</td>',
    ' <td class="renderable clickable serial text-right">',
    '<%= (data["_serial"]) %>.</td>',
    ' <td class="renderable clickable" style="padding-left: ',
    '<%= (data["level"].length) * 30%>px"',
    'title="<%= tooltip_text %>"',
    '>',
    '  <i class="pg-ex-subplans fa fa-long-arrow-right"></i>',
    '<%= display_text %>',
    '<%if (node_extra_info && node_extra_info.length > 0 ) {%>',
    '<ui>',
    '<%  for (var node_info_idx=0; ',
    ' node_info_idx<node_extra_info.length;node_info_idx++) {%>',
    ' <li>', '<%= node_extra_info[node_info_idx] %>', '</li>',
    '<% }%>',
    '</ui>',
    '<%}%>',
    ' </td>',
    ' <td class="renderable timings d-none text-right ',
    '<% if (data["exclusive_flag"] !== "undefined") {%>',
    'pga-ex-exclusive-', '<%- data["exclusive_flag"] %>',
    '<%}%>',
    '">',
    '<% if (typeof(data["exclusive"]) !== "undefined") {%>', '<%= data["exclusive"] %> ms', '<%}%>',
    ' </td>',
    ' <td class="renderable timings d-none text-right ',
    '<% if (data["inclusive_flag"] !== "undefined") {%>',
    'pga-ex-inclusive-', '<%- data["inclusive_flag"] %>',
    '<%}%>',
    '">',
    '<% if (typeof(data["inclusive"]) !== "undefined") {%>', '<%= data["inclusive"] %> ms', '<%}%>',
    ' </td>',
    ' <td class="renderable rowsx d-none text-right ',
    '<% if (data["rowsx_flag"] !== "undefined") {%>',
    'pga-ex-rowsx-', '<%- data["rowsx_flag"] %>',
    '<%}%>',
    '">',
    '<% if (data["rowsx_direction"] === "positive") {%>',
    '&uarr;',
    '<%} else {%>',
    '&darr;',
    '<%}%> ',
    '<% if (typeof(data["rowsx"]) !== "undefined") {%>',
    '<%- data["rowsx"] %>',
    '<%}%>  ',
    ' </td>',
    ' <td class="renderable rowsx rows d-none text-right">',
    '<% if (typeof(data["Actual Rows"]) !== "undefined") {%>',
    '<%= data["Actual Rows"] %>',
    '<%}%>',
    ' </td>',
    ' <td class="renderable rowsx plan_rows d-none text-right">',
    '<%= data["Plan Rows"] %>',
    ' </td>',
    ' <td class="renderable rows rowsx d-none text-right">',
    '<% if (typeof(data["Actual Loops"]) !== "undefined") {%>',
    '<%= data["Actual Loops"] %>',
    '<%}%>',
    ' </td>',
    ' <td class="renderable d-none">',
    '  <i class="fa fa-ellipsis-h"></i>',
    ' </td>',
    '</tr>',
  ].join(''));

  var _nodeExplainTableData = (_planData, _ctx) => {
    let node_info,
      display_text = ['<span class="pg-explain-text-name">'],
      tooltip = [],
      node_extra_info = [],
      info = _ctx._explainTable;

    // Display: <NODE>[ using <Index> ] [ on <Schema>.<Table>[ as <Alias>]]

    if (/Scan/.test(_planData['Node Type'])) {
      display_text.push(_planData['Node Type']);
      tooltip.push(_planData['Node Type']);
    } else {
      display_text.push(_planData['image_text']);
      tooltip.push(_planData['image_text']);
    }
    node_info = tooltip.join('');
    display_text.push('</span>');

    if (typeof(_planData['Index Name']) !== 'undefined') {
      display_text.push(' using ');
      tooltip.push(' using ');
      display_text.push('<span class="pg-explain-text-name">');
      display_text.push(_.escape(_planData['Index Name']));
      tooltip.push(_planData['Index Name']);
      display_text.push('</span>');
    }

    if (typeof(_planData['Relation Name']) !== 'undefined') {
      display_text.push(' on ');
      tooltip.push(' on ');
      if (typeof(_planData['Schema']) !== 'undefined') {
        display_text.push('<span class="pg-explain-text-name">');
        display_text.push(_.escape(_planData['Schema']));
        tooltip.push(_planData['Schema']);
        display_text.push('</span>');
        display_text.push('.');
        tooltip.push('.');
      }
      display_text.push('<span class="pg-explain-text-name">');
      display_text.push(_.escape(_planData['Relation Name']));
      tooltip.push(_planData['Relation Name']);
      display_text.push('</span>');

      if (typeof(_planData['Alias']) !== 'undefined') {
        display_text.push(' as ');
        tooltip.push(' as ');
        display_text.push('<span class="pg-explain-text-name">');
        display_text.push(_.escape(_planData['Alias']));
        tooltip.push(_.escape(_planData['Alias']));
        display_text.push('</span>');
      }
    }

    if (
      typeof(_planData['Plan Rows']) !== 'undefined' &&
      typeof(_planData['Plan Width']) !== 'undefined'
    ) {
      let cost = [
        ' (cost=',
        (typeof(_planData['Startup Cost']) !== 'undefined' ?
          _planData['Startup Cost'] : ''),
        '..',
        (typeof(_planData['Total Cost']) !== 'undefined' ?
          _planData['Total Cost'] : ''),
        ' rows=',
        _planData['Plan Rows'],
        ' width=',
        _planData['Plan Width'],
        ')',
      ].join('');
      display_text.push(cost);
      tooltip.push(cost);
    }

    if (
      typeof(_planData['Actual Startup Time']) !== 'undefined' ||
      typeof(_planData['Actual Total Time']) !== 'undefined' ||
      typeof(_planData['Actual Rows']) !== 'undefined'
    ) {
      let actual = [
        ' (',
        (typeof(_planData['Actual Startup Time']) !== 'undefined' ?
          ('actual=' + _planData['Actual Startup Time']) + '..' : ''
        ),
        (typeof(_planData['Actual Total Time']) !== 'undefined' ?
          _planData['Actual Total Time'] + ' ' : ''
        ),
        (typeof(_planData['Actual Rows']) !== 'undefined' ?
          ('rows=' + _planData['Actual Rows']) : ''
        ),
        (typeof(_planData['Actual Loops']) !== 'undefined' ?
          (' loops=' + _planData['Actual Loops']) : ''
        ),
        ')',
      ].join('');

      display_text.push(actual);
      tooltip.push(actual);
    }

    if ('Join Filter' in _planData) {
      node_extra_info.push(
        '<strong>' + gettext('Join Filter') + '</strong>: ' + _.escape(_planData['Join Filter'])
      );
    }

    if ('Filter' in _planData) {
      node_extra_info.push('<strong>' + gettext('Filter') + '</strong>: ' + _.escape(_planData['Filter']));
    }

    if ('Index Cond' in _planData) {
      node_extra_info.push('<strong>' + gettext('Index Cond') + '</strong>: ' + _.escape(_planData['Index Cond']));
    }

    if ('Hash Cond' in _planData) {
      node_extra_info.push('<strong>' + gettext('Hash Cond') + '</strong>: ' + _.escape(_planData['Hash Cond']));
    }

    if ('Rows Removed by Filter' in _planData) {
      node_extra_info.push(
        '<strong>' + gettext('Rows Removed by Filter') + '</strong>: ' +
          _.escape(_planData['Rows Removed by Filter'])
      );
    }

    if ('Peak Memory Usage' in _planData) {
      var buffer = [
        '<strong>' + gettext('Buckets') + '</strong>:', _.escape(_planData['Hash Buckets']),
        '<strong>' + gettext('Batches') + '</strong>:', _.escape(_planData['Hash Batches']),
        '<strong>' + gettext('Memory Usage') + '</strong>:', _.escape(_planData['Peak Memory Usage']), 'kB',
      ].join(' ');
      node_extra_info.push(buffer);
    }

    if ('Recheck Cond' in _planData) {
      node_extra_info.push('<strong>' + gettext('Recheck Cond') + '</strong>: ' + _planData['Recheck Cond']);
    }

    if ('Exact Heap Blocks' in _planData) {
      node_extra_info.push('<strong>' + gettext('Heap Blocks') + '</strong>: exact=' + _planData['Exact Heap Blocks']);
    }

    info.rows.push(_explainRowTemplate({
      data: _planData,
      display_text: display_text.join(''),
      tooltip_text: tooltip.join(''),
      node_extra_info: node_extra_info,
    }));

    if (typeof(_planData['exclusive_flag']) !== 'undefined') {
      info.show_timings = true;
    }

    if (typeof(_planData['rowsx_flag']) !== 'undefined') {
      info.show_rowsx = true;
    }

    if (typeof(_planData['Actual Loops']) !== 'undefined') {
      info.show_rows = true;
    }

    if (typeof(_planData['Plan Rows']) !== 'undefined') {
      info.show_plan_rows = true;
    }

    if (typeof(_planData['total_time']) !== 'undefined') {
      info.total_time = _planData['total_time'];
    }

    let node;

    if (typeof(_planData['Relation Name']) !== 'undefined') {
      let relationName = (
          typeof(_planData['Schema']) !== 'undefined' ?
            (_planData['Schema'] + '.') : ''
        ) + _planData['Relation Name'],
        table = info.statistics.tables[relationName] || {
          name: relationName,
          count: 0,
          sum_of_times: 0,
          nodes: {},
        };

      node = table.nodes[node_info] || {
        name: node_info,
        count: 0,
        sum_of_times: 0,
      };

      table.count++;
      table.sum_of_times += _planData['exclusive'];
      node.count++;
      node.sum_of_times += _planData['exclusive'];

      table.nodes[node_info] = node;
      info.statistics.tables[relationName] = table;
    }

    node = info.statistics.nodes[node_info] || {
      name: node_info,
      count: 0,
      sum_of_times: 0,
    };

    node.count++;
    node.sum_of_times += _planData['exclusive'];
    info.statistics.nodes[node_info] = node;
  };

  // Backbone model for each plan property of input JSON object
  var PlanModel = Backbone.Model.extend({
    defaults: {
      'Plans': [],
      level: [],
      'image': undefined,
      'image_text': undefined,
      xpos: undefined,
      ypos: undefined,
      width: pWIDTH,
      height: pHEIGHT,
    },

    _createSame: function() {
      return new PlanModel();
    },

    parse: function(data, _opt) {
      var idx = 1,
        lvl = data.level = data.level || [idx],
        plans = [],
        node_type = data['Node Type'],
        // Calculating relative xpos of current node from top node
        xpos = data.xpos = data.xpos - pWIDTH,
        // Calculating relative ypos of current node from top node
        ypos = data.ypos,
        maxChildWidth = 0;

      _opt.ctx.totalNodes++;
      _opt.ctx._explainTable.total_time = data['total_time'] || data['Actual Total Time'];

      data['_serial'] = _opt.ctx.totalNodes;
      data['width'] = pWIDTH;
      data['height'] = pHEIGHT;

      /*
       * calculating xpos, ypos, width and height if current node is a subplan
       */
      if (data['Parent Relationship'] === 'SubPlan') {
        data['width'] += (xMargin * 2) + (xMargin / 2);
        data['height'] += (yMargin * 2);
        data['ypos'] += yMargin;
        xpos -= xMargin;
        ypos += yMargin;
      }

      if (node_type.startsWith('(slice'))
        node_type = node_type.substring(0, 7);

      // Get the image information for current node
      let imageStore = imageMapper.default;
      var mappedImage = (_.isFunction(imageStore[node_type]) &&
          imageStore[node_type].apply(undefined, [data])) ||
        imageStore[node_type] || {
        'image': 'ex_unknown.svg',
        'image_text': node_type,
      };

      data['image'] = mappedImage['image'];
      data['image_text'] = mappedImage['image_text'];

      if ('Actual Total Time' in data && 'Actual Loops' in data) {
        data['inclusive'] = Math.ceil10(
          data['Actual Total Time'] * data['Actual Loops'], -3
        );
        data['exclusive'] = data['inclusive'];
        data['inclusive_factor'] =  data['inclusive'] / (
          data['total_time'] || data['Actual Total Time']
        );
        data['inclusive_flag'] = data['inclusive_factor'] <= 0.1 ? '1' :
          data['inclusive_factor'] < 0.5 ? '2' :
            data['inclusive_factor'] <= 0.9 ? '3' : '4';
      }

      if ('Actual Rows' in data && 'Plan Rows' in data) {
        if (
          data['Actual Rows'] === 0 || data['Actual Rows'] > data['Plan Rows']
        ) {
          data['rowsx'] = data['Plan Rows'] === 0 ? 0 :
            (data['Actual Rows'] / data['Plan Rows']);
          data['rowsx_direction'] = 'negative';
        } else {
          data['rowsx'] = data['Actual Rows'] === 0 ? 0 : (
            data['Plan Rows'] / data['Actual Rows']
          );
          data['rowsx_direction'] = 'positive';
        }
        data['rowsx_flag'] = data['rowsx'] <= 10 ? '1' : (
          data['rowsx'] <= 100 ? '2' : (data['rowsx'] <= 1000 ? '3' : '4')
        );
        data['rowsx'] = Math.ceil10(data['rowsx'], -2);
      }

      // Start calculating xpos, ypos, width and height for child plans if any
      if ('Plans' in data) {
        var obj = this,
          inclusive;

        data['width'] += offsetX;

        _.each(data['Plans'], function(p) {
          var level = _.clone(lvl),
            plan = obj._createSame();

          level.push(idx);
          plan.set(plan.parse(_.extend(
            p, {
              'level': level,
              xpos: xpos - offsetX,
              ypos: ypos,
              total_time: data['total_time'] || data['Actual Total Time'],
              parent_node: lvl.join('_'),
            }), _opt));

          if (maxChildWidth < plan.get('width')) {
            maxChildWidth = plan.get('width');
          }

          if ('exclusive' in data) {
            inclusive = plan.get('inclusive');
            if (inclusive) {
              data['exclusive'] -= inclusive;
            }
          }

          var childHeight = plan.get('height');

          if (idx !== 1) {
            data['height'] = data['height'] + childHeight + offsetY;
          } else if (childHeight > data['height']) {
            data['height'] = childHeight;
          }
          ypos += childHeight + offsetY;

          plans.push(plan);
          idx++;
        });
      }

      if ('exclusive' in data) {
        data['exclusive'] = Math.ceil10(data['exclusive'], -3);
        data['exclusive_factor'] = (
          data['exclusive'] / (data['total_time'] || data['Actual Total Time'])
        );
        data['exclusive_flag'] = data['exclusive_factor'] <= 0.1 ? '1' :
          data['exclusive_factor'] < 0.5 ? '2' :
            data['exclusive_factor'] <= 0.9 ? '3' : '4';
      }

      // Final Width and Height of current node
      data['width'] += maxChildWidth;
      data['Plans'] = plans;

      return data;
    },

    // Draw image, its name and its tooltip
    draw: function(
      s, xpos, ypos, pXpos, pYpos, graphContainer, toolTipContainer,
      _ctx
    ) {
      var g = s.g();
      var currentXpos = xpos + this.get('xpos'),
        currentYpos = ypos + this.get('ypos'),
        isSubPlan = (this.get('Parent Relationship') === 'SubPlan');

      var planData = this.toJSON();

      _nodeExplainTableData(planData, _ctx);

      // Draw the subplan rectangle
      if (isSubPlan) {
        g.rect(
          currentXpos - this.get('width') + pWIDTH + xMargin,
          currentYpos - this.get('height') + pHEIGHT + yMargin - TXT_ALIGN,
          this.get('width') - xMargin,
          this.get('height') + (currentYpos - yMargin),
          5
        ).attr({
          stroke: '#444444',
          'strokeWidth': 1.2,
          fill: 'gray',
          fillOpacity: 0.2,
        });

        // Provide subplan name
        g.text(
          currentXpos + pWIDTH - (this.get('width') / 2) - xMargin,
          currentYpos + pHEIGHT - (this.get('height') / 2) - yMargin,
          this.get('Subplan Name')
        ).attr({
          fontSize: TXT_SIZE,
          'text-anchor': 'start',
          fill: 'red',
        });
      }

      this._drawImage(
        s, g, pgExplain.prefix + this.get('image'), currentXpos, currentYpos,
        graphContainer, toolTipContainer, _ctx
      );


      // Draw text below the node
      var node_label = this.get('Schema') == undefined ?
        this.get('image_text') :
        (this.get('Schema') + '.' + this.get('image_text'));
      g.multitext(
        currentXpos + (pWIDTH / 2) + TXT_ALIGN,
        currentYpos + pHEIGHT - TXT_ALIGN,
        node_label,
        150, {
          'font-size': TXT_SIZE,
          'text-anchor': 'middle',
        }
      );

      // Draw Arrow to parent only its not the first node
      if (!_.isUndefined(pYpos)) {
        var startx = currentXpos + pWIDTH;
        var starty = currentYpos + (pHEIGHT / 2);
        var endx = pXpos - ARROW_WIDTH;
        var endy = pYpos + (pHEIGHT / 2);
        var start_cost = this.get('Startup Cost'),
          total_cost = this.get('Total Cost');
        var arrow_size = DEFAULT_ARROW_SIZE;

        // Calculate arrow width according to cost of a particular plan
        if (start_cost != undefined && total_cost != undefined) {
          arrow_size = Math.round(Math.log((start_cost + total_cost) / 2 + start_cost));
          arrow_size = arrow_size < 1 ? 1 : arrow_size > 10 ? 10 : arrow_size;
        }

        var arrow_view_box = [0, 0, 2 * ARROW_WIDTH, 2 * ARROW_HEIGHT];
        var opts = {
            stroke: '#000000',
            strokeWidth: arrow_size + 2,
          },
          subplanOpts = {
            stroke: '#866486',
            strokeWidth: arrow_size + 2,
          },
          arrowOpts = {
            viewBox: arrow_view_box.join(' '),
          };

        // Draw an arrow from current node to its parent
        this.drawPolyLine(
          g, startx, starty, endx, endy,
          isSubPlan ? subplanOpts : opts, arrowOpts
        );
      }

      var plans = this.get('Plans');

      // Draw nodes for current plan's children
      _.each(plans, function(p) {
        p.draw(
          s, xpos, ypos, currentXpos, currentYpos, graphContainer,
          toolTipContainer, _ctx
        );
      });
    },

    _drawImage: function(
      s, g, image_url, startX, startY, graphContainer, toolTipContainer /*,
      _ctx
      */
    ) {
      this.drawImage(
        g, image_url, startX, startY, graphContainer, toolTipContainer
      );
    },

    /*
     * Required to parse and include non-default params of
     * plan into backbone model
     */
    toJSON: function(non_recursive) {
      var res = Backbone.Model.prototype.toJSON.apply(this, arguments);

      if (non_recursive) {
        delete res['Plans'];
      } else {
        var plans = [];
        _.each(res['Plans'], function(p) {
          plans.push(p.toJSON());
        });
        res['Plans'] = plans;
      }
      return res;
    },

    // Draw an arrow to parent node
    drawPolyLine: function(g, startX, startY, endX, endY, opts, arrowOpts) {
      // Calculate end point of first starting straight line (startx1, starty1)
      // Calculate start point of 2nd straight line (endx1, endy1)
      var midX1 = startX + ((endX - startX) / 3),
        midX2 = startX + (2 * ((endX - startX) / 3));

      //create arrow head
      var arrow = g.polygon(
        [0, ARROW_HEIGHT,
          (ARROW_WIDTH / 2), ARROW_HEIGHT,
          (ARROW_HEIGHT / 4), 0,
          0, ARROW_WIDTH,
        ]
      ).transform('r90');
      var marker = arrow.marker(
        0, 0, ARROW_WIDTH, ARROW_HEIGHT, 0, (ARROW_WIDTH / 2)
      ).attr(arrowOpts);

      // First straight line
      g.line(
        startX, startY, midX1, startY
      ).attr(opts);

      // Diagonal line
      g.line(
        midX1 - 1, startY, midX2, endY
      ).attr(opts);

      // Last straight line
      var line = g.line(
        midX2, endY, endX, endY
      ).attr(opts);
      line.attr({
        markerEnd: marker,
      });
    },

    drawImage: function(
      g, image_content, currentXpos, currentYpos, graphContainer,
      toolTipContainer
    ) {
      // Draw the actual image for current node
      var image = g.image(
        image_content,
        currentXpos + (pWIDTH - IMAGE_WIDTH) / 2,
        currentYpos + (pHEIGHT - IMAGE_HEIGHT) / 2,
        IMAGE_WIDTH,
        IMAGE_HEIGHT
      );

      // Draw tooltip
      var image_data = this.toJSON();
      var title = '<title>';
      _.each(image_data, function(value, key) {
        if (key !== 'image' && key !== 'Plans' &&
          key !== 'level' && key !== 'image' &&
          key !== 'image_text' && key !== 'xpos' &&
          key !== 'ypos' && key !== 'width' &&
          key !== 'height') {
          title += `${key}: ${value}\n`;
        }
      });

      title += '</title>';

      image.append(Snap.parse(title));

      image.mouseover(() => {
        // Empty the tooltip content if it has any and add new data
        toolTipContainer.empty();

        // Remove the title content so that we can show our custom build tooltips.
        image.node.textContent = '';

        var tooltip = $('<table></table>', {
          class: 'pgadmin-tooltip-table',
        }).appendTo(toolTipContainer);
        _.each(image_data, function(value, key) {
          if (key !== 'image' && key !== 'Plans' &&
            key !== 'level' && key !== 'image' &&
            key !== 'image_text' && key !== 'xpos' &&
            key !== 'ypos' && key !== 'width' &&
            key !== 'height') {
            key = _.escape(key);
            value = _.escape(value);
            tooltip.append(`
              <tr>
                <td class="label explain-tooltip">${key}</td>
                <td class="label explain-tooltip-val">${value}</td>
              </tr>
            `);
          }
        });

        var zoomFactor = graphContainer.data('zoom-factor');

        // Calculate co-ordinates for tooltip
        var toolTipX = ((currentXpos + pWIDTH) * zoomFactor - graphContainer.scrollLeft());
        var toolTipY = ((currentYpos) * zoomFactor - graphContainer.scrollTop());

        toolTipX = toolTipX < 0 ? 0 : (toolTipX);
        toolTipY = toolTipY < 0 ? 0 : (toolTipY);

        toolTipX = toolTipX > graphContainer.width() - toolTipContainer[0].clientWidth ? toolTipX - (toolTipContainer[0].clientWidth+(pWIDTH* zoomFactor)) : toolTipX;
        toolTipY = toolTipY > graphContainer.height() - toolTipContainer[0].clientHeight ? graphContainer.height() - toolTipContainer[0].clientHeight : toolTipY;

        // Show toolTip at respective x,y coordinates
        toolTipContainer.css({
          'opacity': '0.8',
        });
        toolTipContainer.css('left', toolTipX);
        toolTipContainer.css('top', toolTipY);

        $('.pgadmin-explain-tooltip').css('padding', '5px');
        $('.pgadmin-explain-tooltip').css('border', '1px solid white');
      });

      // Remove tooltip when mouse is out from node's area
      image.mouseout(() => {
        /* Append the title again which we have removed on mouse over event, so
         * that our custom tooltip should be visible.
         */
        image.append(Snap.parse(title));
        toolTipContainer.empty();
        toolTipContainer.css({
          'opacity': '0',
        });
        toolTipContainer.css('left', 0);
        toolTipContainer.css('top', 0);
      });
    },
  });

  /*
   * NOTE: embedding using .toDataURL() method hits the performance of the
   * plan rendering a lot, that is why we have written seprate Model for the same
   * which is used only when downloading of SVG is called
   */
  // We override the PlanModel's draw() function so that we can embbed all the
  // svg in to main one SVG so that we can download it.
  let DownloadPlanModel = PlanModel.extend({
    _createSame: function() {
      return new DownloadPlanModel({parse: true});
    },

    _drawImage: function (
      s, g, image_url, startX, startY, graphContainer, toolTipContainer, _ctx
    ) {
      /* Check the current browser, if it is Internet Explorer then we will not
       * embed the SVG files for download feature as we are not bale to figure
       * out the solution for IE.
       */

      var current_browser = pgAdmin.Browser.get_browser();
      if (current_browser.name === 'IE' || (
        current_browser.name === 'Safari' &&
        parseInt(current_browser.version) < 10
      )) {
        this.drawImage(
          g, image_url, startX, startY, graphContainer, toolTipContainer
        );
      } else {
        /* This function is a callback function called when we load any svg
         * file using Snap. In this function we append the SVG binary data to
         * the new temporary Snap object and then embedded it to the original
         * Snap() object.
         */
        var that = this;
        var onSVGLoaded = function(data) {
          var svg_image = Snap();
          svg_image.append(data);

          that.drawImage(
            g, svg_image.toDataURL(), startX, startY, graphContainer,
            toolTipContainer
          );

          // This attribute is required to download the file as SVG image.
          s.parent().attr({
            'xmlns:xlink':'http://www.w3.org/1999/xlink',
          });
          setTimeout(() => {
            _ctx._onImageDownloaded();
          }, 100);
        };

        var svg_file = pgExplain.prefix + this.get('image');

        // Load the SVG file for explain plan
        Snap.load(svg_file, onSVGLoaded);
      }
    },
  });

  // Main backbone model to store JSON object
  var MainPlanModel = Backbone.Model.extend({
    defaults: {
      'Plan': undefined,
      xpos: 0,
      ypos: 0,
    },
    initialize: function() {
      this.set('Plan', new PlanModel());
      this.set('Statistics', new StatisticsModel());
    },

    // Parse the JSON data and fetch its children plans
    parse: function(data, _opt) {

      if (data && 'Plan' in data) {
        var plan = this.get('Plan');
        plan.set(plan.parse(
          _.extend(
            data['Plan'], {
              xpos: 0,
              ypos: 0,
            }), _opt
        ));

        data['xpos'] = 0;
        data['ypos'] = 0;
        data['width'] = plan.get('width') + (xMargin * 2);
        data['height'] = plan.get('height') + (yMargin * 4);

        delete data['Plan'];
      }

      var statistics = this.get('Statistics');
      if (data && 'JIT' in data) {
        statistics.set('JIT', data['JIT']);
        delete data ['JIT'];
      }

      if (data && 'Triggers' in data) {
        statistics.set('Triggers', data['Triggers']);
        delete data ['Triggers'];
      }

      if(data) {
        let summKeys = ['Planning Time', 'Execution Time'],
          summary = {};

        summKeys.forEach((key)=>{
          if (key in data) {
            summary[key] = data[key];
          }
        });

        statistics.set('Summary', summary);
      }
      if (data && 'Settings' in data) {
        statistics.set('Settings', data['Settings']);
        delete data ['Settings'];
      }

      return data;
    },

    toJSON: function() {
      var res = Backbone.Model.prototype.toJSON.apply(this, arguments);

      if (res.Plan) {
        res.Plan = res.Plan.toJSON();
      }

      return res;
    },

    draw: function(s, xpos, ypos, graphContainer, toolTipContainer, _ctx) {
      var g = s.g();

      //draw the border
      g.rect(
        0, 0, this.get('width') - 10, this.get('height') - 10, 5
      ).attr({
        fill: '#FFF',
      });

      var plan = this.get('Plan');

      // Draw explain graph
      plan.draw(
        g, xpos, ypos, undefined, undefined, graphContainer, toolTipContainer,
        _ctx
      );

      //Set the Statistics as tooltip
      var statistics = this.get('Statistics');
      statistics.set_statistics(toolTipContainer);
    },
  });

  var _createContainer = function() {
    _createContainer.cnt = (_createContainer.cnt || 0) + 1;
    let id = _createContainer.cnt,
      createTab = (_idx, _type, _label, _active) => {
        return [
          '   <li class="nav-item" role="presentation">',
          '    <a class="nav-link ', _active ? 'active' : '', '"',
          '       data-toggle="tab" tabindex="0"',
          `       data-tab-index="${_idx}"`,
          '       aria-selected="', _active ? 'true' : 'false', '"',
          `       role="tab" data-explain-role="${_type}"`,
          `       href="#pga_explain_${_type}_${id}"`,
          `       aria-controls="pga_explain_${_type}_${id}"`,
          `       id="pgah_explain_${_type}_${id}"> `,
          _label, '</a>', '</li>',
        ].join('');
      },
      createTabPanel = (_type, _active, _extraClasses) => {
        return [
          '   <div role="tabpanel" tabindex="0" class="tab-pane pg-el-sm-12',
          '        pg-el-md-12 pg-el-lg-12 pg-el-12 fade collapse',
          _active ? ' active show' : '', ` ${_extraClasses}"`,
          `        data-explain-tabpanel="${_type}"`,
          `        id="pga_explain_${_type}_${id}"`,
          `        aria-labelledby="pgah_explain_${_type}_${id}">`,
          '   </div>',
        ].join('');
      };
    return $([
      '<div class="obj_properties container-fluid">',
      ' <div tabindex="1" class="backform-tab pg-el-12" role="tabpanel">',
      '  <ul class="nav nav-tabs" role="tablist">',
      '   </li>',
      '   <li class="nav-item" role="presentation">',
      createTab(1, 'graphical', gettext('Graphical'), true),
      createTab(2, 'table', gettext('Analysis'), false),
      createTab(3, 'statistics', gettext('Statistics'), false),
      '  </ul>',
      '  <div class="tab-content pg-el-sm-12 pg-el-12">',
      createTabPanel('graphical', true, 'w-100 h-100 p-0'),
      createTabPanel('table', false, 'p-0'),
      createTabPanel('statistics', false, ''),
      '   </div>',
      '  </div>',
      ' </div>',
      '</div>',
    ].join(''));
  };

  // Parse and draw full graphical explain
  _.extend(pgExplain, {
    // Assumption container is a jQuery object
    DrawJSONPlan: function(container, plan, isDownload, _ctx) {
      let self = this;
      require.ensure(['snapsvg'], function(require) {
        var module = require('snapsvg');
        initSnap(module);
        self.goForDraw(container, plan, isDownload, _ctx);
      }, function(error){
        throw(error);
      }, 'snapsvg');
    },

    // Assumption container is a jQuery object
    goForDraw: function(container, plan, isDownload, _ctx) {
      var ctx = _.extend(_ctx || {}, {
        totalNodes: 0,
        totalDownloadedNodes: 0,
        isDownloaded: 0,
      });

      container.empty()
        .attr('el', 'sm').addClass('pg-no-overflow pg-el-container');

      var explainContainer = _createContainer(),
        explainTable = _createExplainTable(),
        statisticsTables = _createStatisticsTables(),
        graphicalContainer = explainContainer.find(
          '[data-explain-tabpanel=graphical]'
        ),
        tableContainer =  explainContainer.find(
          '[data-explain-tabpanel=table]'
        );

      ctx.currentTab = container.find(
        '.nav-link[aria-selected=true]'
      ).attr('data-explain-role');

      explainContainer.appendTo(container);
      explainTable.appendTo(tableContainer);
      statisticsTables.appendTo(explainContainer.find(
        '[data-explain-tabpanel=statistics]'
      ));

      var orignalPlan = $.extend(true, [], plan);
      var curr_zoom_factor = 1.0;

      var zoomArea = $('<div></div>', {
          class: 'pg-explain-zoom-area btn-group btn-group-sm',
          role: 'group',
        }).appendTo(graphicalContainer),
        zoomInBtn = $('<button></button>', {
          class: 'btn btn-primary-icon pg-explain-zoom-btn',
          title: gettext('Zoom in'),
          'aria-label': gettext('Zoom in'),
          tabindex: 0,
        }).appendTo(zoomArea).append(
          $('<i></i>', {
            class: 'fa fa-search-plus',
          })),
        zoomToNormal = $('<button></button>', {
          class: 'btn btn-primary-icon pg-explain-zoom-btn',
          title: gettext('Zoom to original'),
          'aria-label': gettext('Zoom to original'),
          tabindex: 0,
        }).appendTo(zoomArea).append(
          $('<i></i>', {
            class: 'fa fa-arrows-alt',
          })),
        zoomOutBtn = $('<button></button>', {
          class: 'btn btn-primary-icon pg-explain-zoom-btn',
          title: gettext('Zoom out'),
          'aria-label': gettext('Zoom out'),
          tabindex: 0,
        }).appendTo(zoomArea).append(
          $('<i></i>', {
            class: 'fa fa-search-minus',
          }));

      var downloadArea = $('<div></div>', {
          class: 'pg-explain-download-area btn-group btn-group-sm',
          role: 'group',
        }).appendTo(graphicalContainer),
        downloadBtn = $('<button></button>', {
          id: 'btn-explain-download',
          class: 'btn btn-primary-icon pg-explain-download-btn',
          title: gettext('Download'),
          'aria-label': gettext('Download'),
          tabindex: 0,
          disabled: function() {
            var current_browser = pgAdmin.Browser.get_browser();
            if (current_browser.name === 'IE') {
              this.title = 'Not supported for Internet Explorer';
              return true;
            }
            if (current_browser.name === 'Safari' &&
              parseInt(current_browser.version) < 10) {
              this.title = 'Not supported for Safari version less than 10.1';
              return true;
            }
            return false;
          },
        }).appendTo(downloadArea).append(
          $('<i></i>', {
            class: 'fa fa-download',
          }));

      var statsArea = $('<div></div>', {
        class: 'pg-explain-stats-area btn-group btn-group-sm d-none',
        role: 'group',
      }).appendTo(graphicalContainer);

      $('<button></button>', {
        id: 'btn-explain-stats',
        class: 'btn btn-primary-icon pg-explain-stats-btn',
        title: gettext('Statistics'),
        'aria-label': gettext('Statistics'),
        tabindex: 0,
      }).appendTo(statsArea).append(
        $('<i></i>', {
          class: 'fa fa-line-chart',
        }));

      // Main div to be drawn all images on
      var planDiv = $('<div></div>', {
          class: 'pgadmin-explain-container w-100 h-100 overflow-auto',
        }).appendTo(graphicalContainer),
        // Div to draw tool-tip on
        toolTip = $('<div></div>', {
          id: 'toolTip',
          class: 'pgadmin-explain-tooltip',
        }).appendTo(graphicalContainer);
      toolTip.empty();
      planDiv.data('zoom-factor', curr_zoom_factor);

      var w = 0,
        h = yMargin;

      ctx._explainTable = {
        rows: [],
        statistics: {
          tables: {},
          nodes: {},
        },
      };
      ctx._onImageDownloaded = () => {
        ctx.totalDownloadedNodes++;
        if (!ctx.isDownloaded && ctx.totalNodes === ctx.totalDownloadedNodes) {
          ctx.isDownloaded = true;
          var s = Snap(
            `#${graphicalContainer.attr('id')} .pgadmin-explain-container svg`
          );
          var today  = new Date();
          var filename = 'explain_plan_' + today.getTime() + '.svg';
          svgDownloader.downloadSVG(s.toString(), filename);
        }
      };

      // Lets regenrate the plan with embedded images
      _.each(plan, function(p) {
        var main_plan;
        if(isDownload) {
          // If user opt to download then we will use the DownloadPlanModel model
          // so that it will embed the images while regenrating the plan
          let DownloadMainPlanModel = MainPlanModel.extend({
            initialize: function() {
              this.set('Plan', new DownloadPlanModel({ parse: true }));
              this.set('Statistics', new StatisticsModel());
            },
          });
          main_plan = new DownloadMainPlanModel({ 'parse': true });
        } else {
          main_plan = new MainPlanModel();
        }

        // Parse JSON data to backbone model
        main_plan.set(main_plan.parse(p, {ctx: ctx}));
        w = main_plan.get('width');
        h = main_plan.get('height');

        var s = Snap(w, h),
          $svg = $(s.node).detach();
        planDiv.append($svg);
        main_plan.draw(s, w - xMargin, yMargin, planDiv, toolTip, ctx);

        var initPanelWidth = planDiv.width();

        /*
         * Scale graph in case its width is bigger than panel width
         * in which the graph is displayed
         */
        if (initPanelWidth < w) {
          var width_ratio = initPanelWidth / w;

          curr_zoom_factor = width_ratio;
          curr_zoom_factor = curr_zoom_factor < MIN_ZOOM_FACTOR ? MIN_ZOOM_FACTOR : curr_zoom_factor;
          curr_zoom_factor = curr_zoom_factor > INIT_ZOOM_FACTOR ? INIT_ZOOM_FACTOR : curr_zoom_factor;

          let zoomInMatrix = new Snap.matrix();
          zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

          $svg.find('g').first().attr({
            transform: zoomInMatrix,
          });
          $svg.attr({
            'width': w * curr_zoom_factor,
            'height': h * curr_zoom_factor,
          });
          planDiv.data('zoom-factor', curr_zoom_factor);
        }

        zoomInBtn.on('click', function() {
          curr_zoom_factor = ((curr_zoom_factor + ZOOM_RATIO) > MAX_ZOOM_FACTOR) ? MAX_ZOOM_FACTOR : (curr_zoom_factor + ZOOM_RATIO);
          let zoomInMatrix = new Snap.matrix();
          zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

          $svg.find('g').first().attr({
            transform: zoomInMatrix,
          });
          $svg.attr({
            'width': w * curr_zoom_factor,
            'height': h * curr_zoom_factor,
          });
          planDiv.data('zoom-factor', curr_zoom_factor);
        });

        zoomOutBtn.on('click', function() {
          curr_zoom_factor = ((curr_zoom_factor - ZOOM_RATIO) < MIN_ZOOM_FACTOR) ? MIN_ZOOM_FACTOR : (curr_zoom_factor - ZOOM_RATIO);
          let zoomInMatrix = new Snap.matrix();
          zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

          $svg.find('g').first().attr({
            transform: zoomInMatrix,
          });
          $svg.attr({
            'width': w * curr_zoom_factor,
            'height': h * curr_zoom_factor,
          });
          planDiv.data('zoom-factor', curr_zoom_factor);
        });

        zoomToNormal.on('click', function() {
          curr_zoom_factor = INIT_ZOOM_FACTOR;
          let zoomInMatrix = new Snap.matrix();
          zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

          $svg.find('g').first().attr({
            transform: zoomInMatrix,
          });
          $svg.attr({
            'width': w * curr_zoom_factor,
            'height': h * curr_zoom_factor,
          });
          planDiv.data('zoom-factor', curr_zoom_factor);
        });

        downloadBtn.on('click', function() {
          pgExplain.DrawJSONPlan(container, orignalPlan, true);
          planDiv.on('explain:svg:downloaded', function() {
            ctx.totalDownloadedNodes++;
            if (!ctx.isDownloaded && ctx.totalNodes === ctx.totalDownloadedNodes) {
              ctx.isDownloaded = true;
              var s = Snap('.pgadmin-explain-container svg');
              var today  = new Date();
              var filename = 'explain_plan_' + today.getTime() + '.svg';
              svgDownloader.downloadSVG(s.toString(), filename);
            }
          });
        });
      });

      _renderExplainTable(ctx._explainTable, explainTable);

      _renderStatisticsTable(ctx._explainTable, statisticsTables);

      container.on('shown.bs.tab', function() {
        ctx.currentTab = container.find(
          '.nav-link[aria-selected=true]'
        ).attr('data-explain-role');
      });
    },
  });

  $(document)
    .on('mouseenter', '.pga-ex-row.pga-ex-collapsible', function(ev) {
      let $target = $(ev.currentTarget);

      $target.parent().find(
        '[data-parent=' + $target.attr('data-ex-id') +
        '] > td.pg-ex-highlighter > i'
      ).removeClass('invisible');
    })
    .on('mouseleave', '.pga-ex-row.pga-ex-collapsible', function(ev) {
      let $target = $(ev.currentTarget);

      $target.parent().find(
        '.pga-ex-row[data-parent=' + $target.attr('data-ex-id') +
        '] > td.pg-ex-highlighter > i'
      ).addClass('invisible');
    })
    .on('click', '.pga-ex-row.pga-ex-collapsible', function(ev) {
      let $target = $(ev.currentTarget),
        collapsed = ($target.attr('data-collapsed') === 'true');

      if (collapsed) {
        $target.parent().find(
          '.pga-ex-row[data-parent^=' + $target.attr('data-ex-id') + ']'
        ).removeClass('d-none').filter('[data-collapsed=true]').each(
          function(idx, el) {
            var $el = $(el);
            $el.parent().find(
              '.pga-ex-row[data-parent^=' + $el.attr('data-ex-id') + ']'
            ).addClass('d-none');
          });
        $target.attr('data-collapsed', 'false');
      } else {
        $target.parent().find(
          '.pga-ex-row[data-parent^=' + $target.attr('data-ex-id') + ']'
        ).addClass('d-none');
        $target.attr('data-collapsed', 'true');
      }
    });

  return pgExplain;
});
