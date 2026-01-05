/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/*
 * A map which is used to fetch the image to be drawn and
 * text which will appear below it
 */

const ImageMapper = {
  'Aggregate': {
    'image': 'ex_aggregate.svg',
    'image_text': 'Aggregate',
  },
  'Append': {
    'image': 'ex_append.svg',
    'image_text': 'Append',
  },
  'Bitmap Index Scan': function(data) {
    return {
      'image': 'ex_bmp_index.svg',
      'image_text': data['Index Name'],
    };
  },
  'Bitmap Heap Scan': function(data) {
    return {
      'image': 'ex_bmp_heap.svg',
      'image_text': data['Relation Name'],
    };
  },
  'BitmapAnd': {
    'image': 'ex_bmp_and.svg',
    'image_text': 'Bitmap AND',
  },
  'BitmapOr': {
    'image': 'ex_bmp_or.svg',
    'image_text': 'Bitmap OR',
  },
  'Citus Job': function(data) {
    // A 'Citus Job' represents a distributed query operation.
    // The details of the distributed operation are in the sub-plans,
    // but this node contains task count information, showing how many shards
    // the query is being distributed to.

    const taskCount = data['Task Count'];
    const tasksShown = data['Tasks Shown'];
    
    // "Task Count" is the number of shard operations being run.
    // "Tasks Shown" is either "All" or "One of N" depending on whether the returned query plan
    // contains one sample task or all of them.

    // We show single-shard or multi-shard with different images, and we show the
    // literal value of 'Tasks Shown' as the image text.

    const image = (taskCount === 1)
      ? 'ex_citus_distributed_one_of_one.svg'
      : 'ex_citus_distributed_one_of_many.svg';

    return {
      'image': image,
      'image_text': tasksShown
    };
  },
  'Citus Task': function(data) {
    // A 'Citus Task' represents a Task executed on a particular worker node.
    // The details of the Task are in the sub-plans, so for this node we just show
    // some details of the worker node.

    const node = data['Node'];
    // "Node" has a value like "host=citus-worker-7 port=8394 dbname=postgres"
    // That's a bit long to display, so we shrink it to 'citus-worker-7:8394 postgres'
    const hostMatch = node.match(/host=(\S+)/);
    const portMatch = node.match(/port=(\S+)/);
    const dbnameMatch = node.match(/dbname=(\S+)/);

    const host = hostMatch ? hostMatch[1] : '';
    let port = portMatch ? portMatch[1] : '';
    if (port === '5432') {
      // Default port. Don't bother showing.
      port = '';
    }
    const dbname = dbnameMatch ? dbnameMatch[1] : '';

    let imageText = `Task ${host}`;
    if (port) {
      imageText += `:${port}`;
    }
    if (dbname) {
      imageText += ` ${dbname}`;
    }
    return {
      'image': 'ex_citus_worker_task.svg',
      'image_text': imageText
    };
  },
  'CTE Scan': {
    'image': 'ex_cte_scan.svg',
    'image_text': 'CTE Scan',
  },
  'Custom Scan': function(data) {
    const customPlanProvider = data['Custom Plan Provider'];

    let image;

    switch (customPlanProvider) {
    case 'Citus Adaptive':
      image = 'ex_citus.svg';
      break;
    default:
      image = 'ex_unknown.svg';
      break;
    }

    return {
      'image': image,
      'image_text': data['Custom Plan Provider']
    };
  },
  'Function Scan': {
    'image': 'ex_result.svg',
    'image_text': 'Function Scan',
  },
  'Foreign Scan': {
    'image': 'ex_foreign_scan.svg',
    'image_text': 'Foreign Scan',
  },
  'Gather': {
    'image': 'ex_gather_motion.svg',
    'image_text': 'Gather',
  },
  'Gather Merge': {
    'image': 'ex_gather_merge.svg',
    'image_text': 'Gather Merge',
  },
  'Group': {
    'image': 'ex_group.svg',
    'image_text': 'Group',
  },
  'GroupAggregate': {
    'image': 'ex_aggregate.svg',
    'image_text': 'Group Aggregate',
  },
  'Hash': {
    'image': 'ex_hash.svg',
    'image_text': 'Hash',
  },
  'Hash Join': function(data) {
    if (!data['Join Type']) return {
      'image': 'ex_join.svg',
      'image_text': 'Join',
    };
    switch (data['Join Type']) {
    case 'Anti':
      return {
        'image': 'ex_hash_anti_join.svg',
        'image_text': 'Hash Anti Join',
      };
    case 'Semi':
      return {
        'image': 'ex_hash_semi_join.svg',
        'image_text': 'Hash Semi Join',
      };
    default:
      return {
        'image': 'ex_hash.svg',
        'image_text': String('Hash ' + data['Join Type'] + ' Join'),
      };
    }
  },
  'HashAggregate': {
    'image': 'ex_aggregate.svg',
    'image_text': 'Hash Aggregate',
  },
  'Index Only Scan': function(data) {
    return {
      'image': 'ex_index_only_scan.svg',
      'image_text': data['Index Name'],
    };
  },
  'Index Scan': function(data) {
    return {
      'image': 'ex_index_scan.svg',
      'image_text': data['Index Name'],
    };
  },
  'Index Scan Backword': {
    'image': 'ex_index_scan.svg',
    'image_text': 'Index Backward Scan',
  },
  'Limit': {
    'image': 'ex_limit.svg',
    'image_text': 'Limit',
  },
  'LockRows': {
    'image': 'ex_lock_rows.svg',
    'image_text': 'Lock Rows',
  },
  'Materialize': {
    'image': 'ex_materialize.svg',
    'image_text': 'Materialize',
  },
  'Merge Append': {
    'image': 'ex_merge_append.svg',
    'image_text': 'Merge Append',
  },
  'Merge Join': function(data) {
    switch (data['Join Type']) {
    case 'Anti':
      return {
        'image': 'ex_merge_anti_join.svg',
        'image_text': 'Merge Anti Join',
      };
    case 'Semi':
      return {
        'image': 'ex_merge_semi_join.svg',
        'image_text': 'Merge Semi Join',
      };
    default:
      return {
        'image': 'ex_merge.svg',
        'image_text': String('Merge ' + data['Join Type'] + ' Join'),
      };
    }
  },
  'ModifyTable': function(data) {
    switch (data['Operation']) {
    case 'Insert':
      return {
        'image': 'ex_insert.svg',
        'image_text': 'Insert',
      };
    case 'Update':
      return {
        'image': 'ex_update.svg',
        'image_text': 'Update',
      };
    case 'Delete':
      return {
        'image': 'ex_delete.svg',
        'image_text': 'Delete',
      };
    case 'Merge':
      return {
        'image': 'ex_merge.svg',
        'image_text': 'Merge',
      };
    }
  },
  'Named Tuplestore Scan': {
    'image': 'ex_named_tuplestore_scan.svg',
    'image_text': 'Named Tuplestore Scan',
  },
  'Nested Loop': function(data) {
    switch (data['Join Type']) {
    case 'Anti':
      return {
        'image': 'ex_nested_loop_anti_join.svg',
        'image_text': 'Nested Loop Anti Join',
      };
    case 'Semi':
      return {
        'image': 'ex_nested_loop_semi_join.svg',
        'image_text': 'Nested Loop Semi Join',
      };
    default:
      return {
        'image': 'ex_nested.svg',
        'image_text': 'Nested Loop ' + data['Join Type'] + ' Join',
      };
    }
  },
  'ProjectSet': {
    'image': 'ex_projectset.svg',
    'image_text': 'ProjectSet',
  },
  'Recursive Union': {
    'image': 'ex_recursive_union.svg',
    'image_text': 'Recursive Union',
  },
  'Result': {
    'image': 'ex_result.svg',
    'image_text': 'Result',
  },
  'Sample Scan': {
    'image': 'ex_scan.svg',
    'image_text': 'Sample Scan',
  },
  'Scan': {
    'image': 'ex_scan.svg',
    'image_text': 'Scan',
  },
  'Seek': {
    'image': 'ex_seek.svg',
    'image_text': 'Seek',
  },
  'SetOp': function(data) {
    let strategy = data['Strategy'],
      command = data['Command'];

    if (strategy == 'Hashed') {
      if (command.startsWith('Intersect')) {
        if (command == 'Intersect All')
          return {
            'image': 'ex_hash_setop_intersect_all.svg',
            'image_text': 'Hashed Intersect All',
          };
        return {
          'image': 'ex_hash_setop_intersect.svg',
          'image_text': 'Hashed Intersect',
        };
      } else if (command.startsWith('Except')) {
        if (command == 'Except All')
          return {
            'image': 'ex_hash_setop_except_all.svg',
            'image_text': 'Hashed Except All',
          };
        return {
          'image': 'ex_hash_setop_except.svg',
          'image_text': 'Hash Except',
        };
      }
      return {
        'image': 'ex_hash_setop_unknown.svg',
        'image_text': 'Hashed SetOp Unknown',
      };
    }
    return {
      'image': 'ex_setop.svg',
      'image_text': 'SetOp',
    };
  },
  'Seq Scan': function(data) {
    return {
      'image': 'ex_scan.svg',
      'image_text': data['Relation Name'],
    };
  },
  'Subquery Scan': {
    'image': 'ex_subplan.svg',
    'image_text': 'SubQuery Scan',
  },
  'Sort': {
    'image': 'ex_sort.svg',
    'image_text': 'Sort',
  },
  'Tid Scan': {
    'image': 'ex_tid_scan.svg',
    'image_text': 'Tid Scan',
  },
  'Table Function Scan': {
    'image': 'ex_table_func_scan.svg',
    'image_text': 'Table Function Scan',
  },
  'Unique': {
    'image': 'ex_unique.svg',
    'image_text': 'Unique',
  },
  'Values Scan': {
    'image': 'ex_values_scan.svg',
    'image_text': 'Values Scan',
  },
  'WindowAgg': {
    'image': 'ex_window_aggregate.svg',
    'image_text': 'Window Aggregate',
  },
  'WorkTable Scan': {
    'image': 'ex_worktable_scan.svg',
    'image_text': 'WorkTable Scan',
  },
  'Undefined': {
    'image': 'ex_unknown.svg',
    'image_text': 'Undefined',
  },
};

export default ImageMapper;
