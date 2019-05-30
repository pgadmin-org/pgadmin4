/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.misc.explain', [
  'sources/url_for', 'jquery', 'underscore', 'underscore.string',
  'sources/pgadmin', 'backbone', 'snapsvg', 'explain_statistics',
  'svg_downloader', 'image_maper',
], function(url_for, $, _, S, pgAdmin, Backbone, Snap, StatisticsModel,
  svgDownloader, imageMapper) {

  pgAdmin = pgAdmin || window.pgAdmin || {};
  svgDownloader = svgDownloader.default;
  var pgBrowser = pgAdmin.Browser;

  // Snap.svg plug-in to write multitext as image name
  Snap.plugin(function(Snap, Element, Paper) {
    Paper.prototype.multitext = function(x, y, txt, max_width, attributes) {
      var svg = Snap(),
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

  if (pgAdmin.Explain)
    return pgAdmin.Explain;

  var pgExplain = pgAdmin.Explain = {
    // Prefix path where images are stored
    prefix: url_for('misc.index') + 'static/explain/img/',
    totalNodes: 0,
    totalDownloadedNodes: 0,
    isDownloaded: false,
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
    parse: function(data) {
      var idx = 1,
        lvl = data.level = data.level || [idx],
        plans = [],
        node_type = data['Node Type'],
        // Calculating relative xpos of current node from top node
        xpos = data.xpos = data.xpos - pWIDTH,
        // Calculating relative ypos of current node from top node
        ypos = data.ypos,
        maxChildWidth = 0;

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

      if (S.startsWith(node_type, '(slice'))
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

      // Start calculating xpos, ypos, width and height for child plans if any
      if ('Plans' in data) {

        data['width'] += offsetX;

        _.each(data['Plans'], function(p) {
          var level = _.clone(lvl),
            plan = new PlanModel();

          level.push(idx);
          plan.set(plan.parse(_.extend(
            p, {
              'level': level,
              xpos: xpos - offsetX,
              ypos: ypos,
            })));

          if (maxChildWidth < plan.get('width')) {
            maxChildWidth = plan.get('width');
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

      // Final Width and Height of current node
      data['width'] += maxChildWidth;
      data['Plans'] = plans;

      return data;
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

    // Draw image, its name and its tooltip
    draw: function(s, xpos, ypos, pXpos, pYpos, graphContainer, toolTipContainer) {
      var g = s.g();
      var currentXpos = xpos + this.get('xpos'),
        currentYpos = ypos + this.get('ypos'),
        isSubPlan = (this.get('Parent Relationship') === 'SubPlan');

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

      this.draw_image(g, pgExplain.prefix + this.get('image'), currentXpos, currentYpos, graphContainer, toolTipContainer);

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
        p.draw(s, xpos, ypos, currentXpos, currentYpos, graphContainer, toolTipContainer);
      });
    },

    draw_image: function(g, image_content, currentXpos, currentYpos, graphContainer, toolTipContainer) {
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
        var toolTipY = ((currentYpos + pHEIGHT) * zoomFactor - graphContainer.scrollTop());

        // Recalculate x.y if tooltip is going out of screen
        if (graphContainer.width() < (toolTipX + toolTipContainer[0].clientWidth))
          toolTipX -= (toolTipContainer[0].clientWidth + (pWIDTH * zoomFactor));
        //if(document.children[0].clientHeight < (toolTipY + toolTipContainer[0].clientHeight))
        if (graphContainer.height() < (toolTipY + toolTipContainer[0].clientHeight))
          toolTipY -= (toolTipContainer[0].clientHeight + ((pHEIGHT / 2) * zoomFactor));

        toolTipX = toolTipX < 0 ? 0 : (toolTipX);
        toolTipY = toolTipY < 0 ? 0 : (toolTipY);

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
    // Draw image, its name and its tooltip
    parse: function(data) {
      var idx = 1,
        lvl = data.level = data.level || [idx],
        plans = [],
        node_type = data['Node Type'],
        // Calculating relative xpos of current node from top node
        xpos = data.xpos = data.xpos - pWIDTH,
        // Calculating relative ypos of current node from top node
        ypos = data.ypos,
        maxChildWidth = 0;

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

      if (S.startsWith(node_type, '(slice'))
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
      pgExplain.totalNodes++;

      // Start calculating xpos, ypos, width and height for child plans if any
      if ('Plans' in data) {

        data['width'] += offsetX;

        _.each(data['Plans'], function(p) {
          var level = _.clone(lvl),
            plan = new DownloadPlanModel({ 'parse': true });

          level.push(idx);
          plan.set(plan.parse(_.extend(
            p, {
              'level': level,
              xpos: xpos - offsetX,
              ypos: ypos,
            })));

          if (maxChildWidth < plan.get('width')) {
            maxChildWidth = plan.get('width');
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

      // Final Width and Height of current node
      data['width'] += maxChildWidth;
      data['Plans'] = plans;

      return data;
    },
    draw: function(s, xpos, ypos, pXpos, pYpos, graphContainer, toolTipContainer) {
      var g = s.g();
      var currentXpos = xpos + this.get('xpos'),
        currentYpos = ypos + this.get('ypos'),
        isSubPlan = (this.get('Parent Relationship') === 'SubPlan');

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

      /* Check the current browser, if it is Internet Explorer then we will not
       * embed the SVG files for download feature as we are not bale to figure
       * out the solution for IE.
       */

      var current_browser = pgAdmin.Browser.get_browser();
      if (current_browser.name === 'IE' ||
        (current_browser.name === 'Safari' && parseInt(current_browser.version) < 10)) {
        this.draw_image(g, pgExplain.prefix + this.get('image'), currentXpos, currentYpos, graphContainer, toolTipContainer);
      } else {
        /* This function is a callback function called when we load any svg file
         * using Snap. In this function we append the SVG binary data to the new
         * temporary Snap object and then embedded it to the original Snap() object.
         */
        var that = this;
        var onSVGLoaded = function(data) {
          var svg_image = Snap();
          svg_image.append(data);

          that.draw_image(g, svg_image.toDataURL(), currentXpos, currentYpos, graphContainer, toolTipContainer);
          pgExplain.totalDownloadedNodes++;

          // This attribute is required to download the file as SVG image.
          s.parent().attr({'xmlns:xlink':'http://www.w3.org/1999/xlink'});
          setTimeout(() => {
            pgBrowser.Events.trigger('pga:explain_plan:node_icon:fetched');
          }, 100);
        };

        var svg_file = pgExplain.prefix + this.get('image');
        // Load the SVG file for explain plan
        Snap.load(svg_file, onSVGLoaded);
      }

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
        p.draw(s, xpos, ypos, currentXpos, currentYpos, graphContainer, toolTipContainer);
      });
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
    parse: function(data) {
      if (data && 'Plan' in data) {
        var plan = this.get('Plan');
        plan.set(
          plan.parse(
            _.extend(
              data['Plan'], {
                xpos: 0,
                ypos: 0,
              })));

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

      return data;
    },
    toJSON: function() {
      var res = Backbone.Model.prototype.toJSON.apply(this, arguments);

      if (res.Plan) {
        res.Plan = res.Plan.toJSON();
      }

      return res;
    },
    draw: function(s, xpos, ypos, graphContainer, toolTipContainer) {
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
        g, xpos, ypos, undefined, undefined, graphContainer, toolTipContainer
      );

      //Set the Statistics as tooltip
      var statistics = this.get('Statistics');
      statistics.set_statistics(toolTipContainer);
    },
  });

  // Parse and draw full graphical explain
  _.extend(pgExplain, {
    // Assumption container is a jQuery object
    DrawJSONPlan: function(container, plan, isDownload) {
      pgExplain.totalNodes = 0;
      pgExplain.totalDownloadedNodes = 0;
      pgExplain.isDownloaded = false;
      container.empty();
      var orignalPlan = $.extend(true, [], plan);
      var curr_zoom_factor = 1.0;

      var zoomArea = $('<div></div>', {
          class: 'pg-explain-zoom-area btn-group',
          role: 'group',
        }).appendTo(container),
        zoomInBtn = $('<button></button>', {
          class: 'btn btn-secondary pg-explain-zoom-btn badge',
          title: 'Zoom in',
          tabindex: 0,
        }).appendTo(zoomArea).append(
          $('<i></i>', {
            class: 'fa fa-search-plus',
          })),
        zoomToNormal = $('<button></button>', {
          class: 'btn btn-secondary pg-explain-zoom-btn badge',
          title: 'Zoom to original',
          tabindex: 0,
        }).appendTo(zoomArea).append(
          $('<i></i>', {
            class: 'fa fa-arrows-alt',
          })),
        zoomOutBtn = $('<button></button>', {
          class: 'btn btn-secondary pg-explain-zoom-btn badge',
          title: 'Zoom out',
          tabindex: 0,
        }).appendTo(zoomArea).append(
          $('<i></i>', {
            class: 'fa fa-search-minus',
          }));

      var downloadArea = $('<div></div>', {
          class: 'pg-explain-download-area btn-group',
          role: 'group',
        }).appendTo(container),
        downloadBtn = $('<button></button>', {
          id: 'btn-explain-download',
          class: 'btn btn-secondary pg-explain-download-btn badge',
          title: 'Download',
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
        class: 'pg-explain-stats-area d-none',
        role: 'group',
      }).appendTo(container);

      $('<button></button>', {
        id: 'btn-explain-stats',
        class: 'btn btn-secondary pg-explain-stats-btn badge',
        title: 'Statistics',
        tabindex: 0,
      }).appendTo(statsArea).append(
        $('<i></i>', {
          class: 'fa fa-line-chart',
        }));

      // Main div to be drawn all images on
      var planDiv = $('<div></div>', {
          class: 'pgadmin-explain-container',
        }).appendTo(container),
        // Div to draw tool-tip on
        toolTip = $('<div></div>', {
          id: 'toolTip',
          class: 'pgadmin-explain-tooltip',
        }).appendTo(container);
      toolTip.empty();
      planDiv.data('zoom-factor', curr_zoom_factor);

      var w = 0,
        h = yMargin;

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
        main_plan.set(main_plan.parse(p));
        w = main_plan.get('width');
        h = main_plan.get('height');

        var s = Snap(w, h),
          $svg = $(s.node).detach();
        planDiv.append($svg);
        main_plan.draw(s, w - xMargin, yMargin, planDiv, toolTip);

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

          var zoomInMatrix = new Snap.matrix();
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
          var zoomInMatrix = new Snap.matrix();
          zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

          $svg.find('g').first().attr({
            transform: zoomInMatrix,
          });
          $svg.attr({
            'width': w * curr_zoom_factor,
            'height': h * curr_zoom_factor,
          });
          planDiv.data('zoom-factor', curr_zoom_factor);
          zoomInBtn.trigger('blur');
        });

        zoomOutBtn.on('click', function() {
          curr_zoom_factor = ((curr_zoom_factor - ZOOM_RATIO) < MIN_ZOOM_FACTOR) ? MIN_ZOOM_FACTOR : (curr_zoom_factor - ZOOM_RATIO);
          var zoomInMatrix = new Snap.matrix();
          zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

          $svg.find('g').first().attr({
            transform: zoomInMatrix,
          });
          $svg.attr({
            'width': w * curr_zoom_factor,
            'height': h * curr_zoom_factor,
          });
          planDiv.data('zoom-factor', curr_zoom_factor);
          zoomOutBtn.trigger('blur');
        });

        zoomToNormal.on('click', function() {
          curr_zoom_factor = INIT_ZOOM_FACTOR;
          var zoomInMatrix = new Snap.matrix();
          zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

          $svg.find('g').first().attr({
            transform: zoomInMatrix,
          });
          $svg.attr({
            'width': w * curr_zoom_factor,
            'height': h * curr_zoom_factor,
          });
          planDiv.data('zoom-factor', curr_zoom_factor);
          zoomToNormal.trigger('blur');
        });

        downloadBtn.on('click', function() {
          // Lets regenrate the plan with embedded images
          pgExplain.DrawJSONPlan(container, orignalPlan, true);
          pgBrowser.Events.on('pga:explain_plan:node_icon:fetched', function() {
            if (!pgExplain.isDownloaded && pgExplain.totalNodes === pgExplain.totalDownloadedNodes) {
              pgExplain.isDownloaded = true;
              var s = Snap('.pgadmin-explain-container svg');
              var today  = new Date();
              var filename = 'explain_plan_' + today.getTime() + '.svg';
              svgDownloader.downloadSVG(s.toString(), filename);
              downloadBtn.trigger('blur');
            }
          });
        });
      });
    },
  });

  return pgExplain;
});
