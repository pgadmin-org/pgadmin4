SELECT e.oid, e.xmin, e.evtname AS name, upper(e.evtevent) AS eventname,
pg_catalog.pg_get_userbyid(e.evtowner) AS eventowner,
e.evtenabled AS enabled,
e.evtfoid AS eventfuncoid, quote_ident(n.nspname) || '.' || e.evtfoid::regproc AS eventfunname,
array_to_string(array(select quote_literal(x) from unnest(evttags) as t(x)), ', ') AS when,
 pg_catalog.obj_description(e.oid, 'pg_event_trigger') AS comment,
 (SELECT array_agg(provider || '=' || label) FROM pg_seclabel sl1 WHERE sl1.objoid=e.oid) AS seclabels,
 p.prosrc AS source, p.pronamespace AS schemaoid, l.lanname AS language
 FROM pg_event_trigger e
 LEFT OUTER JOIN pg_proc p ON p.oid=e.evtfoid
 LEFT OUTER JOIN pg_language l ON l.oid=p.prolang,
 pg_namespace n
 WHERE p.pronamespace = n.oid
{% if etid %}
 AND e.oid={{etid}}::int
{% endif %}
  ORDER BY e.evtname
