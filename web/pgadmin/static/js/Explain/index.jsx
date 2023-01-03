/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box, Tab, Tabs } from '@material-ui/core';
import React from 'react';
import _ from 'lodash';
import Graphical from './Graphical';
import TabPanel from '../components/TabPanel';
import gettext  from 'sources/gettext';
import ImageMapper from './ImageMapper';
import { makeStyles } from '@material-ui/styles';
import Analysis from './Analysis';
import ExplainStatistics from './ExplainStatistics';
import PropTypes from 'prop-types';
import EmptyPanelMessage from '../components/EmptyPanelMessage';

const useStyles = makeStyles((theme)=>({
  tabPanel: {
    padding: 0,
    backgroundColor: theme.palette.background.default,
  },
}));

// Some predefined constants used to calculate image location and its border
let pWIDTH = 100.;
let pHEIGHT = 100.;
let offsetX = 200,
  offsetY = 60;
let xMargin = 25,
  yMargin = 25;

const DEFAULT_ARROW_SIZE = 2;

function nodeExplainTableData(_planData, _ctx) {
  let node_info,
    display_text = [],
    tooltip = [],
    node_extra_info = [],
    info = _ctx.explainTable;

  // Display: <NODE>[ using <Index> ] [ on <Schema>.<Table>[ as <Alias>]]

  if (/Scan/.test(_planData['Node Type'])) {
    display_text.push(_planData['Node Type']);
    tooltip.push(_planData['Node Type']);
  } else {
    display_text.push(_planData['image_text']);
    tooltip.push(_planData['image_text']);
  }
  node_info = tooltip.join('');

  if (typeof(_planData['Index Name']) !== 'undefined') {
    display_text.push(' using ');
    tooltip.push(' using ');
    display_text.push(_.escape(_planData['Index Name']));
    tooltip.push(_planData['Index Name']);
  }

  if (typeof(_planData['Relation Name']) !== 'undefined') {
    display_text.push(' on ');
    tooltip.push(' on ');
    if (typeof(_planData['Schema']) !== 'undefined') {
      display_text.push(_.escape(_planData['Schema']));
      tooltip.push(_planData['Schema']);
      display_text.push('.');
      tooltip.push('.');
    }
    display_text.push(_.escape(_planData['Relation Name']));
    tooltip.push(_planData['Relation Name']);

    if (typeof(_planData['Alias']) !== 'undefined') {
      display_text.push(' as ');
      tooltip.push(' as ');
      display_text.push(_.escape(_planData['Alias']));
      tooltip.push(_.escape(_planData['Alias']));
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
    let buffer = [
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

  info.rows.push({
    data: _planData,
    display_text: display_text.join(''),
    tooltip_text: tooltip.join(''),
    node_extra_info: node_extra_info,
  });

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
}

function parseExplainTableData(plan, ctx) {
  nodeExplainTableData(plan, ctx);

  plan['Plans']?.map((p)=>{
    parseExplainTableData(p, ctx);
  });
}

function parsePlan(data, ctx) {
  let idx = 1,
    lvl = data.level = data.level || [idx],
    plans = [],
    nodeType = data['Node Type'],
    // Calculating relative xpos of current node from top node
    xpos = data.xpos = data.xpos - pWIDTH,
    // Calculating relative ypos of current node from top node
    ypos = data.ypos,
    maxChildWidth = 0;

  ctx.totalNodes++;
  ctx.explainTable.total_time = data['total_time'] || data['Actual Total Time'];

  data['_serial'] = ctx.totalNodes;
  data['width'] = pWIDTH;
  data['height'] = pHEIGHT;

  // Calculate arrow width according to cost of a particular plan
  let arrowSize = DEFAULT_ARROW_SIZE;
  let startCost = data['Startup Cost'],
    totalCost = data['Total Cost'];
  if (startCost != undefined && totalCost != undefined) {
    arrowSize = Math.round(Math.log((startCost + totalCost) / 2 + startCost));
    if (arrowSize < 1) {
      arrowSize = 1;
    } else if (arrowSize > 10) {
      arrowSize = 10;
    }
  }
  data['arr_id'] = _.uniqueId('arr');
  ctx.arrows[data['arr_id']] = arrowSize;
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

  if (nodeType.startsWith('(slice'))
    nodeType = nodeType.substring(0, 7);

  // Get the image information for current node
  let mappedImage = (_.isFunction(ImageMapper[nodeType]) &&
      ImageMapper[nodeType].apply(undefined, [data])) ||
    ImageMapper[nodeType] || {
    'image': 'ex_unknown.svg',
    'image_text': nodeType,
  };

  data['image'] = mappedImage['image'];
  data['image_text'] = mappedImage['image_text'];

  if ('Actual Total Time' in data && 'Actual Loops' in data) {
    data['inclusive'] = Math.ceil10(
      data['Actual Total Time'], -3
    );
    data['exclusive'] = data['inclusive'];
    data['inclusive_factor'] =  data['inclusive'] / (
      data['total_time'] || data['Actual Total Time']
    );
    if (data['inclusive_factor'] <= 0.1) {
      data['inclusive_flag'] = '1';
    } else if (data['inclusive_factor'] < 0.5) {
      data['inclusive_flag'] = '2';
    } else if (data['inclusive_factor'] <= 0.9) {
      data['inclusive_flag'] = '3';
    } else {
      data['inclusive_flag'] = '4';
    }
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
    if (data['rowsx'] <= 10) {
      data['rowsx_flag'] = '1';
    } else if (data['rowsx'] <= 100 ) {
      data['rowsx_flag'] = '2';
    } else if (data['rowsx'] <= 1000 ) {
      data['rowsx_flag'] = '3';
    } else {
      data['rowsx_flag'] = '4';
    }
    if('loops' in data) {
      data['rowsx'] = Math.ceil10(data['rowsx'] / data['loops'] || 1, -2);
    } else {
      data['rowsx'] = Math.ceil10(data['rowsx'], -2);
    }
  }

  // Start calculating xpos, ypos, width and height for child plans if any
  if ('Plans' in data) {
    data['width'] += offsetX;

    data['Plans'].forEach(function(p) {
      let level = _.clone(lvl);
      level.push(idx);

      let plan = parsePlan({
        ...p,
        'level': level,
        xpos: xpos - offsetX,
        ypos: ypos,
        total_time: data['total_time'] || data['Actual Total Time'],
        parent_node: lvl.join('_'),
        loops: data['Actual Loops']
      }, ctx);

      if (maxChildWidth < plan.width) {
        maxChildWidth = plan.width;
      }

      if ('exclusive' in data) {
        if (plan.inclusive < data['exclusive']) {
          data['exclusive'] -= plan.inclusive;
        }
      }

      let childHeight = plan.height;

      if (idx !== 1) {
        data['height'] = data['height'] + childHeight + offsetY;
      } else if (childHeight > data['height']) {
        data['height'] = childHeight;
      }
      ypos += childHeight + offsetY;

      plans.push(plan);
      idx++;
    });
  } else{
    if('loops' in data && 'exclusive' in data) {
      data['inclusive'] = Math.ceil10(data['Actual Total Time'] / data['loops'] || 1, -3);
      data['exclusive'] = data['inclusive'];
    }
  }

  if ('exclusive' in data) {
    data['exclusive'] = Math.ceil10(data['exclusive'], -3);
    data['exclusive_factor'] = (
      data['exclusive'] / (data['total_time'] || data['Actual Total Time'])
    );
    if (data['exclusive_factor'] <= 0.1) {
      data['exclusive_flag'] = '1';
    } else if (data['exclusive_factor'] < 0.5) {
      data['exclusive_flag'] = '2';
    } else if (data['exclusive_factor'] <= 0.9) {
      data['exclusive_flag'] = '3';
    } else {
      data['exclusive_flag'] = '4';
    }
  }

  // Final Width and Height of current node
  data['width'] += maxChildWidth;
  data['Plans'] = plans;

  return data;
}

function parsePlanData(data, ctx) {
  let retPlan = {};
  if(data) {
    if ('Plan' in data) {
      let plan = parsePlan({
        ...data['Plan'],
        xpos: 0,
        ypos: 0,
        loops: 1,
      }, ctx);
      retPlan['Plan'] = plan;
      retPlan['xpos'] = 0;
      retPlan['ypos'] = 0;
      retPlan['width'] = plan.width + (xMargin * 2);
      retPlan['height'] = plan.height + (yMargin * 4);
    }

    retPlan['Statistics'] = {
      'JIT': [],
      'Triggers': [],
      'Summary': {},
    };
    if ('JIT' in data) {
      retPlan['Statistics']['JIT'] = retPlan['JIT'];
    }
    if ('Triggers' in data) {
      retPlan['Statistics']['Triggers'] = retPlan['JITriggersT'];
    }
    if ('Settings' in data) {
      retPlan['Statistics']['Settings'] = data['Settings'];
    }
    let summKeys = ['Planning Time', 'Execution Time'],
      summary = {};

    summKeys.forEach((key)=>{
      if (key in data) {
        summary[key] = data[key];
      }
    });

    retPlan['Statistics']['Summary'] = summary;

    parseExplainTableData(retPlan['Plan'], ctx);
  }
  return retPlan;
}

export default function Explain({plans=[]}) {
  const classes = useStyles();
  const [tabValue, setTabValue] = React.useState(0);

  let ctx = React.useRef({});
  let planData = React.useMemo(()=>{
    ctx.current = {
      totalNodes: 0,
      totalDownloadedNodes: 0,
      isDownloaded: 0,
      explainTable: {
        rows: [],
        statistics: {
          tables: {},
          nodes: {},
        },
      },
      arrows: {},
    };
    return plans && parsePlanData(plans[0], ctx.current);
  }, [plans]);

  if(_.isEmpty(plans)) {
    return <Box height="100%" display="flex" flexDirection="column">
      <EmptyPanelMessage text={gettext('Use Explain/Explain analyze button to generate the plan for a query. Alternatively, you can also execute "EXPLAIN (FORMAT JSON) [QUERY]".')} />
    </Box>;
  }
  return (
    <Box height="100%" display="flex" flexDirection="column">
      <Box>
        <Tabs
          value={tabValue}
          onChange={(_e, selTabValue) => {
            setTabValue(selTabValue);
          }}
          // indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          action={(ref)=>ref && ref.updateIndicator()}
        >
          <Tab label="Graphical" />
          <Tab label="Analysis" />
          <Tab label="Statistics" />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0} classNameRoot={classes.tabPanel}>
        <Graphical planData={planData} ctx={ctx.current}/>
      </TabPanel>
      <TabPanel value={tabValue} index={1} classNameRoot={classes.tabPanel}>
        <Analysis explainTable={ctx.current.explainTable} />
      </TabPanel>
      <TabPanel value={tabValue} index={2} classNameRoot={classes.tabPanel}>
        <ExplainStatistics explainTable={ctx.current.explainTable} />
      </TabPanel>
    </Box>
  );
}

Explain.propTypes = {
  plans: PropTypes.array,
};
