define (
  'pgadmin.misc.explain',
  ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'backbone', 'snap.svg'],
  function($, _, S, pgAdmin, Backbone, Snap) {

pgAdmin = pgAdmin || window.pgAdmin || {};
var pgExplain = pgAdmin.Explain;

// Snap.svg plug-in to write multitext as image name
Snap.plugin(function (Snap, Element, Paper, glob) {
  Paper.prototype.multitext = function (x, y, txt, max_width, attributes) {
    var svg = Snap(),
        abc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        isWordBroken = false,
        temp = svg.text(0, 0, abc);

    temp.attr(attributes);

    /*
     * Find letter width in pixels and
     * index from where the text should be broken
     */
    var letter_width = temp.getBBox().width / abc.length,
        word_break_index = Math.round((max_width / letter_width)) - 1;

    svg.remove();

    var words = txt.split(" "),
        width_so_far = 0,
        lines=[], curr_line = '',
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
        lines = lines.slice(0, lines.length - 2);
      }
      lines = lines.concat(tmpArr);
      curr_line = lines[lines.length - 1];
      width_so_far = (curr_line.length * letter_width);
    }

    // Create multiple tspan for each string in array
    var t = this.text(x,y,lines).attr(attributes);
    t.selectAll("tspan:nth-child(n+2)").attr({
      dy: "1.2em",
      x: x
    });
    return t;
  };
});

if (pgAdmin.Explain)
    return pgAdmin.Explain;

var pgExplain = pgAdmin.Explain = {
   // Prefix path where images are stored
   prefix: '{{ url_for('misc.static', filename='explain/img') }}/'
};

/*
 * A map which is used to fetch the image to be drawn and
 * text which will appear below it
 */
var imageMapper = {
    "Aggregate" : {
        "image":"ex_aggregate.png", "image_text":"Aggregate"
    },
    'Append' : {
        "image":"ex_append.png","image_text":"Append"
    },
    "Bitmap Index Scan" : function(data) {
        return {
            "image":"ex_bmp_index.png", "image_text":data['Index Name']
        };
    },
    "Bitmap Heap Scan" : function(data) {
  return {"image":"ex_bmp_heap.png","image_text":data['Relation Name']};
},
"BitmapAnd" : {"image":"ex_bmp_and.png","image_text":"Bitmap AND"},
"BitmapOr" : {"image":"ex_bmp_or.png","image_text":"Bitmap OR"},
"CTE Scan" : {"image":"ex_cte_scan.png","image_text":"CTE Scan"},
"Function Scan" : {"image":"ex_result.png","image_text":"Function Scan"},
"Foreign Scan" : {"image":"ex_foreign_scan.png","image_text":"Foreign Scan"},
"Gather" : {"image":"ex_gather_motion.png","image_text":"Gather"},
"Group" : {"image":"ex_group.png","image_text":"Group"},
"GroupAggregate": {"image":"ex_aggregate.png","image_text":"Group Aggregate"},
"Hash" : {"image":"ex_hash.png","image_text":"Hash"},
"Hash Join": function(data) {
  if (!data['Join Type']) return {"image":"ex_join.png","image_text":"Join"};
  switch(data['Join Type']) {
    case 'Anti': return {"image":"ex_hash_anti_join.png","image_text":"Hash Anti Join"};
    case 'Semi': return {"image":"ex_hash_semi_join.png","image_text":"Hash Semi Join"};
    default: return {"image":"ex_hash.png","image_text":String("Hash " + data['Join Type'] + " Join" )};
  }
},
"HashAggregate" : {"image":"ex_aggregate.png","image_text":"Hash Aggregate"},
"Index Only Scan" : function(data) {
  return {"image":"ex_index_only_scan.png","image_text":data['Index Name']};
},
"Index Scan" : function(data) {
  return {"image":"ex_index_scan.png","image_text":data['Index Name']};
},
"Index Scan Backword" : {"image":"ex_index_scan.png","image_text":"Index Backward Scan"},
"Limit" : {"image":"ex_limit.png","image_text":"Limit"},
"LockRows" : {"image":"ex_lock_rows.png","image_text":"Lock Rows"},
"Materialize" : {"image":"ex_materialize.png","image_text":"Materialize"},
"Merge Append": {"image":"ex_merge_append.png","image_text":"Merge Append"},
"Merge Join": function(data) {
  switch(data['Join Type']) {
    case 'Anti': return {"image":"ex_merge_anti_join.png","image_text":"Merge Anti Join"};
    case 'Semi': return {"image":"ex_merge_semi_join.png","image_text":"Merge Semi Join"};
    default: return {"image":"ex_merge.png","image_text":String("Merge " + data['Join Type'] + " Join" )};
  }
},
"ModifyTable" : function(data) {
  switch (data['Operaton']) {
    case "insert": return { "image":"ex_insert.png",
                            "image_text":"Insert"
                           };
    case "update": return {"image":"ex_update.png","image_text":"Update"};
    case "Delete": return {"image":"ex_delete.png","image_text":"Delete"};
  }
},
'Nested Loop' : function(data) {
  switch(data['Join Type']) {
    case 'Anti': return {"image":"ex_nested_loop_anti_join.png","image_text":"Nested Loop Anti Join"};
    case 'Semi': return {"image":"ex_nested_loop_semi_join.png","image_text":"Nested Loop Semi Join"};
    default: return {"image":"ex_nested.png","image_text":"Nested Loop " + data['Join Type'] + " Join"};
  }
},
"Recursive Union" : {"image":"ex_recursive_union.png","image_text":"Recursive Union"},
"Result" : {"image":"ex_result.png","image_text":"Result"},
"Sample Scan" : {"image":"ex_scan.png","image_text":"Sample Scan"},
"Scan" : {"image":"ex_scan.png","image_text":"Scan"},
"Seek" : {"image":"ex_seek.png","image_text":"Seek"},
"SetOp" : function(data) {
  var strategy = data['Strategy'],
      command = data['Command'];

  if(strategy == "Hashed") {
    if(S.startsWith(command, "Intersect")) {
      if(command == "Intersect All")
        return {"image":"ex_hash_setop_intersect_all.png","image_text":"Hashed Intersect All"};
      return {"image":"ex_hash_setop_intersect.png","image_text":"Hashed Intersect"};
    }
    else if (S.startsWith(command, "Except")) {
      if(command == "Except All")
        return {"image":"ex_hash_setop_except_all.png","image_text":"Hashed Except All"};
      return {"image":"ex_hash_setop_except.png","image_text":"Hash Except"};
    }
    return {"image":"ex_hash_setop_unknown.png","image_text":"Hashed SetOp Unknown"};
  }
  return {"image":"ex_setop.png","image_text":"SetOp"};
},
"Seq Scan": function(data) {
  return {"image":"ex_scan.png","image_text":data['Relation Name']};
},
"Subquery Scan" : {"image":"ex_subplan.png","image_text":"SubQuery Scan"},
"Sort" : {"image":"ex_sort.png","image_text":"Sort"},
"Tid Scan" : {"image":"ex_tid_scan.png","image_text":"Tid Scan"},
"Unique" : {"image":"ex_unique.png","image_text":"Unique"},
"Values Scan" : {"image":"ex_values_scan.png","image_text":"Values Scan"},
"WindowAgg" : {"image":"ex_window_aggregate.png","image_text":"Window Aggregate"},
"WorkTable Scan" : {"image":"ex_worktable_scan.png","image_text":"WorkTable Scan"},
"Undefined" : {"image":"ex_unknown.png","image_text":"Undefined"},
}

// Some predefined constants used to calculate image location and its border
var pWIDTH = pHEIGHT = 100.
    IMAGE_WIDTH = IMAGE_HEIGHT = 50;
var offsetX = 200,
    offsetY = 60;
var ARROW_WIDTH = 10,
    ARROW_HEIGHT = 10,
    DEFAULT_ARROW_SIZE = 2;
var TXT_ALLIGN = 5,
    TXT_SIZE = "15px";
var TOTAL_WIDTH = undefined,
    TOTAL_HEIGHT = undefined;
var xMargin = 25,
    yMargin = 25;
var MIN_ZOOM_FACTOR = 0.01,
    MAX_ZOOM_FACTOR = 2,
    INIT_ZOOM_FACTOR = 1;
    ZOOM_RATIO = 0.05;


// Backbone model for each plan property of input JSON object
var PlanModel = Backbone.Model.extend({
    defaults: {
        "Plans": [],
        level: [],
        "image": undefined,
        "image_text": undefined,
        xpos: undefined,
        ypos: undefined,
        width: pWIDTH,
        height: pHEIGHT
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
        if (data['Parent Relationship'] === "SubPlan") {
            data['width'] += (xMargin * 2) + (xMargin / 2);
            data['height'] += (yMargin * 2);
            data['ypos'] += yMargin;
            xpos -= xMargin;
            ypos += yMargin;
        }

        if(S.startsWith(node_type, "(slice"))
            node_type = node_type.substring(0,7);

        // Get the image information for current node
        var mapperObj = (_.isFunction(imageMapper[node_type]) &&
                imageMapper[node_type].apply(undefined, [data])) ||
                imageMapper[node_type] || 'Undefined';

        data["image"] = mapperObj["image"];
        data["image_text"] = mapperObj["image_text"];

        // Start calculating xpos, ypos, width and height for child plans if any
        if ('Plans' in data) {

            data['width'] += offsetX;

            _.each(data['Plans'], function(p) {
                var level = _.clone(lvl),
                    plan = new PlanModel();

                level.push(idx);
                plan.set(plan.parse(_.extend(
                    p, {
                        "level": level,
                        xpos: xpos - offsetX,
                        ypos: ypos
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
                    (ARROW_WIDTH / 2),ARROW_HEIGHT,
                    (ARROW_HEIGHT / 4), 0,
                    0, ARROW_WIDTH]
                    ).transform("r90");
      var marker = arrow.marker(
                         0, 0, ARROW_WIDTH, ARROW_HEIGHT, 0, (ARROW_WIDTH / 2)
                         ).attr(arrowOpts);

      // First straight line
      g.line(
        startX, startY, midX1, startY
        ).attr(opts);

      // Diagonal line
      g.line(
        midX1-1, startY, midX2, endY
        ).attr(opts);

      // Last straight line
      var line = g.line(
                   midX2, endY, endX, endY
                   ).attr(opts);
      line.attr({markerEnd: marker})
    },

    // Draw image, its name and its tooltip
    draw: function(s, xpos, ypos, pXpos, pYpos, graphContainer, toolTipContainer) {
        var g = s.g();
        var currentXpos = xpos + this.get('xpos') ,
            currentYpos = ypos + this.get('ypos'),
            isSubPlan = (this.get('Parent Relationship') === "SubPlan");

        // Draw the subplan rectangle
        if (isSubPlan) {
          g.rect(
            currentXpos - this.get('width') + pWIDTH + xMargin,
            currentYpos - yMargin,
            this.get('width') - xMargin,
            this.get('height'), 5
          ).attr({
              stroke: '#444444',
              'strokeWidth': 1.2,
              fill: 'gray',
              fillOpacity: 0.2
          });

          //provide subplan name
          var text = g.text(
            currentXpos  + pWIDTH - ( this.get('width') / 2) - xMargin,
            currentYpos + pHEIGHT  - (this.get('height') / 2) - yMargin,
            this.get('Subplan Name')
          ).attr({
            fontSize: TXT_SIZE, "text-anchor":"start",
            fill: 'red'
          });
        }

        // Draw the actual image for current node
        var image = g.image(
            pgExplain.prefix + this.get('image'),
            currentXpos + (pWIDTH - IMAGE_WIDTH) / 2,
            currentYpos + (pHEIGHT - IMAGE_HEIGHT) / 2,
            IMAGE_WIDTH,
            IMAGE_HEIGHT
        );

        // Draw tooltip
        var image_data = this.toJSON();
        image.mouseover(function(evt){

          // Empty the tooltip content if it has any and add new data
          toolTipContainer.empty();
          var tooltip = $('<table></table>',{
                           class: "pgadmin-tooltip-table"
                        }).appendTo(toolTipContainer);
          _.each(image_data, function(value,key) {
            if(key !== 'image' && key !== 'Plans' &&
               key !== 'level' && key !== 'image' &&
               key !== 'image_text' && key !== 'xpos' &&
               key !== 'ypos' && key !== 'width' &&
               key !== 'height') {
              tooltip.append( '<tr><td class="label explain-tooltip">' + key + '</td><td class="label explain-tooltip-val">' + value + '</td></tr>' );
            };
          });

          var zoomFactor = graphContainer.data('zoom-factor');

          // Calculate co-ordinates for tooltip
          var toolTipX = ((currentXpos + pWIDTH) * zoomFactor - graphContainer.scrollLeft());
          var toolTipY = ((currentYpos + pHEIGHT) * zoomFactor - graphContainer.scrollTop());

          // Recalculate x.y if tooltip is going out of screen
          if(graphContainer.width() < (toolTipX + toolTipContainer[0].clientWidth))
            toolTipX -= (toolTipContainer[0].clientWidth + (pWIDTH*zoomFactor));
          //if(document.children[0].clientHeight < (toolTipY + toolTipContainer[0].clientHeight))
          if(graphContainer.height() < (toolTipY + toolTipContainer[0].clientHeight))
            toolTipY -= (toolTipContainer[0].clientHeight + ((pHEIGHT/2)*zoomFactor));

          toolTipX = toolTipX < 0 ? 0 : (toolTipX);
          toolTipY = toolTipY < 0 ? 0 : (toolTipY);

          // Show toolTip at respective x,y coordinates
          toolTipContainer.css({'opacity': '0.8'});
          toolTipContainer.css('left', toolTipX);
          toolTipContainer.css( 'top', toolTipY);
        });

        // Remove tooltip when mouse is out from node's area
        image.mouseout(function() {
          toolTipContainer.empty();
          toolTipContainer.css({'opacity': '0'});
          toolTipContainer.css('left', 0);
          toolTipContainer.css( 'top', 0);
        });

        // Draw text below the node
        var node_label = (this.get('Schema') == undefined ?
                            this.get('image_text') :
                            this.get('Schema')+"."+this.get('image_text'));
        var label = g.g();
        g.multitext(
          currentXpos + (pWIDTH / 2),
          currentYpos + pHEIGHT - TXT_ALLIGN,
          node_label,
          150,
          {"font-size": TXT_SIZE ,"text-anchor":"middle"}
        );

        // Draw Arrow to parent only its not the first node
        if (!_.isUndefined(pYpos)) {
            var startx = currentXpos + pWIDTH;
            var starty = currentYpos + (pHEIGHT / 2);
            var endx = pXpos - ARROW_WIDTH;
            var endy = pYpos + (pHEIGHT / 2);
            var start_cost = this.get("Startup Cost"),
                total_cost = this.get("Total Cost");
            var arrow_size = DEFAULT_ARROW_SIZE;
            // Calculate arrow width according to cost of a particular plan
            if(start_cost != undefined && total_cost != undefined) {
              var arrow_size = Math.round(Math.log((start_cost+total_cost)/2 + start_cost));
              arrow_size = arrow_size < 1 ? 1 : arrow_size > 10 ? 10 : arrow_size;
            }


            var arrow_view_box = [0, 0, 2*ARROW_WIDTH, 2*ARROW_HEIGHT];
            var opts = {stroke: "#000000", strokeWidth: arrow_size + 1},
                subplanOpts = {stroke: "#866486", strokeWidth: arrow_size + 1},
                arrowOpts = {viewBox: arrow_view_box.join(" ")};

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
    }
});

// Main backbone model to store JSON object
var MainPlanModel = Backbone.Model.extend({
    defaults: {
        "Plan": undefined,
        xpos: 0,
        ypos: 0,
    },
    initialize: function() {
        this.set("Plan", new PlanModel());
    },

    // Parse the JSON data and fetch its children plans
    parse: function(data) {
        if (data && 'Plan' in data) {
           var plan = this.get("Plan");
           plan.set(
             plan.parse(
               _.extend(
                 data['Plan'], {
                   xpos: 0,
                   ypos: 0
                 })));

           data['xpos'] = 0;
           data['ypos'] = 0;
           data['width'] = plan.get('width') + (xMargin * 2);
           data['height'] = plan.get('height') + (yMargin * 2);

           delete data['Plan'];
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
            fill: '#FFF'
        });

        //Fetch total width, height
        TOTAL_WIDTH = this.get('width');
        TOTAL_HEIGHT = this.get('height');
        var plan = this.get('Plan');

        //Draw explain graph
        plan.draw(g, xpos, ypos, undefined, undefined, graphContainer, toolTipContainer);
    }
});

// Parse and draw full graphical explain
_.extend(
    pgExplain, {
        // Assumption container is a jQuery object
        DrawJSONPlan: function(container, plan) {
          var my_plans = [];
          container.empty();
          var curr_zoom_factor = 1.0;

          var zoomArea =$('<div></div>', {
                class: 'pg-explain-zoom-area btn-group',
                role: 'group'
                }).appendTo(container),
              zoomInBtn = $('<button></button>', {
                class: 'btn pg-explain-zoom-btn badge',
                title: 'Zoom in'
                }).appendTo(zoomArea).append(
                  $('<i></i>',{
                    class: 'fa fa-search-plus'
                  })),
              zoomToNormal = $('<button></button>', {
                class: 'btn pg-explain-zoom-btn badge',
                title: 'Zoom to original'
                }).appendTo(zoomArea).append(
                  $('<i></i>',{
                    class: 'fa fa-arrows-alt'
                  }))
              zoomOutBtn = $('<button></button>', {
                class: 'btn pg-explain-zoom-btn badge',
                title: 'Zoom out'
                }).appendTo(zoomArea).append(
                  $('<i></i>', {
                    class: 'fa fa-search-minus'
                  }));

          // Main div to be drawn all images on
          var planDiv = $('<div></div>',
                           {class: "pgadmin-explain-container"}
                         ).appendTo(container),
              // Div to draw tool-tip on
              toolTip = $('<div></div>',
                           {id: "toolTip",
                           class: "pgadmin-explain-tooltip"
                           }
                         ).appendTo(container);
          toolTip.empty();
          planDiv.data('zoom-factor', curr_zoom_factor);

          var w = 0, h = 0,
              x = xMargin, h = yMargin;

          _.each(plan, function(p) {
            var main_plan = new MainPlanModel();

            // Parse JSON data to backbone model
            main_plan.set(main_plan.parse(p));
            w = main_plan.get('width');
            h = main_plan.get('height');

            var s = Snap(w, h),
                $svg = $(s.node).detach();
            planDiv.append($svg);
            main_plan.draw(s, w - xMargin, yMargin, planDiv, toolTip);

            var initPanelWidth = planDiv.width(),
                initPanelHeight = planDiv.height();

             /*
              * Scale graph in case its width is bigger than panel width
              * in which the graph is displayed
              */
            if(initPanelWidth < w) {
              var width_ratio = initPanelWidth / w;

              curr_zoom_factor = width_ratio;
              curr_zoom_factor = curr_zoom_factor < MIN_ZOOM_FACTOR ? MIN_ZOOM_FACTOR : curr_zoom_factor;
              curr_zoom_factor = curr_zoom_factor > INIT_ZOOM_FACTOR ? INIT_ZOOM_FACTOR : curr_zoom_factor;

              var zoomInMatrix = new Snap.matrix();
              zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

              $svg.find('g').first().attr({transform: zoomInMatrix});
              $svg.attr({'width': w * curr_zoom_factor, 'height': h * curr_zoom_factor});
              planDiv.data('zoom-factor', curr_zoom_factor);
            }

            zoomInBtn.on('click', function(e){
              curr_zoom_factor = ((curr_zoom_factor + ZOOM_RATIO) > MAX_ZOOM_FACTOR) ? MAX_ZOOM_FACTOR : (curr_zoom_factor + ZOOM_RATIO);
              var zoomInMatrix = new Snap.matrix();
              zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

              $svg.find('g').first().attr({transform: zoomInMatrix});
              $svg.attr({'width': w * curr_zoom_factor, 'height': h * curr_zoom_factor});
              planDiv.data('zoom-factor', curr_zoom_factor);
              zoomInBtn.blur();
            });

            zoomOutBtn.on('click', function(e) {
              curr_zoom_factor = ((curr_zoom_factor - ZOOM_RATIO) < MIN_ZOOM_FACTOR) ? MIN_ZOOM_FACTOR : (curr_zoom_factor - ZOOM_RATIO);
              var zoomInMatrix = new Snap.matrix();
              zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

              $svg.find('g').first().attr({transform: zoomInMatrix});
              $svg.attr({'width': w * curr_zoom_factor, 'height': h * curr_zoom_factor});
              planDiv.data('zoom-factor', curr_zoom_factor);
              zoomOutBtn.blur();
            });

            zoomToNormal.on('click', function(e) {
              curr_zoom_factor = INIT_ZOOM_FACTOR;
              var zoomInMatrix = new Snap.matrix();
              zoomInMatrix.scale(curr_zoom_factor, curr_zoom_factor);

              $svg.find('g').first().attr({transform: zoomInMatrix});
              $svg.attr({'width': w * curr_zoom_factor, 'height': h * curr_zoom_factor});
              planDiv.data('zoom-factor', curr_zoom_factor);
              zoomToNormal.blur();
            });
          });

        }
    });

    return pgExplain;
});
