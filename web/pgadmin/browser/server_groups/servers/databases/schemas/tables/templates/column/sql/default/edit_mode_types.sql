SELECT tt.oid, format_type(tt.oid,NULL) AS typname
  FROM pg_cast
  JOIN pg_type tt ON tt.oid=casttarget
WHERE castsource={{type_id}}
   AND castcontext IN ('i', 'a')