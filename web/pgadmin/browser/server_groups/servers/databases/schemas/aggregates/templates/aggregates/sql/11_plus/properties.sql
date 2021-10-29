SELECT aggfnoid::oid as oid, proname as name, ns.nspname as schema,
  pg_catalog.pg_get_userbyid(proowner) as owner,
  COALESCE(pg_catalog.pg_get_function_arguments(aggfnoid::oid), '') as input_types, proacl,
  CASE WHEN ag.aggkind = 'n' THEN 'normal'
	WHEN ag.aggkind = 'o' THEN 'ordered-set'
	WHEN ag.aggkind = 'h' THEN 'hypothetical-set'
	ELSE 'unknown' END as kind,
  CASE WHEN aggtransfn = '-'::regproc THEN null ELSE aggtransfn END as state_func,
  CASE WHEN aggfinalfn = '-'::regproc THEN null ELSE aggfinalfn END as final_func,
  CASE WHEN aggcombinefn = '-'::regproc THEN null ELSE aggcombinefn END as combine_func,
  CASE WHEN aggserialfn = '-'::regproc THEN null ELSE aggserialfn END as serialization_func,
  CASE WHEN aggdeserialfn = '-'::regproc THEN null ELSE aggdeserialfn END as deserialization_func,
  CASE WHEN aggmtransfn = '-'::regproc THEN null ELSE aggmtransfn END as moving_state_func,
  CASE WHEN aggmfinalfn = '-'::regproc THEN null ELSE aggmfinalfn END as moving_final_func,
  CASE WHEN aggminvtransfn = '-'::regproc THEN null ELSE aggminvtransfn END as moving_inverse_func,
  CASE WHEN ag.aggfinalmodify = 'r' THEN 'READ_ONLY'
    WHEN ag.aggfinalmodify = 's' THEN 'SHAREABLE'
    WHEN ag.aggfinalmodify = 'w' THEN 'READ_WRITE'
    ELSE 'unknown' END as final_func_modify,
  CASE WHEN ag.aggmfinalmodify = 'r' THEN 'READ_ONLY'
    WHEN ag.aggmfinalmodify = 's' THEN 'SHAREABLE'
    WHEN ag.aggmfinalmodify = 'w' THEN 'READ_WRITE'
    ELSE 'unknown' END as moving_final_func_modify,
  agginitval as initial_val, aggminitval as moving_initial_val,
  op.oprname as sort_oper, aggfinalextra as final_extra_param, aggmfinalextra as moving_final_extra_param,
  aggtransspace as state_data_size, aggmtransspace as moving_state_data_size,
  CASE WHEN (tt.typlen = -1 AND tt.typelem != 0) THEN
    (SELECT at.typname FROM pg_type at WHERE at.oid = tt.typelem) || '[]'
  ELSE tt.typname END as state_type,
  CASE WHEN (tf.typlen = -1 AND tf.typelem != 0) THEN
    (SELECT at.typname FROM pg_catalog.pg_type at WHERE at.oid = tf.typelem) || '[]'
  ELSE tf.typname END as final_type,
  CASE WHEN (tm.typlen = -1 AND tm.typelem != 0) THEN
    (SELECT at.typname FROM pg_type at WHERE at.oid = tm.typelem) || '[]'
  ELSE tm.typname END as moving_state_type,
  description
FROM pg_catalog.pg_aggregate ag
  LEFT OUTER JOIN pg_catalog.pg_proc pr ON pr.oid = ag.aggfnoid
  LEFT OUTER JOIN pg_catalog.pg_namespace ns ON ns.oid=pr.pronamespace
  LEFT OUTER JOIN pg_catalog.pg_type tt on tt.oid=aggtranstype
  LEFT OUTER JOIN pg_catalog.pg_type tf on tf.oid=prorettype
  LEFT OUTER JOIN pg_catalog.pg_type tm on tm.oid=aggmtranstype
  LEFT OUTER JOIN pg_catalog.pg_operator op on op.oid = ag.aggsortop
  LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=aggfnoid::oid AND des.classoid='pg_aggregate'::regclass)
WHERE pronamespace = {{scid}}::oid
{% if agid %}    AND ag.aggfnoid = {{agid}}::oid {% endif %}
ORDER BY name;
