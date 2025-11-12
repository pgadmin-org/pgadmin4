SELECT tt.oid, pg_catalog.format_type(tt.oid,NULL) AS typname
FROM pg_catalog.pg_type tt
    JOIN pg_catalog.pg_cast pc ON tt.oid=pc.casttarget
    WHERE pc.castsource= {{type_id}}
    AND pc.castcontext IN ('i', 'a')
UNION
SELECT tt.oid, pg_catalog.format_type(tt.oid,NULL) AS typname
FROM pg_catalog.pg_type tt
WHERE tt.typbasetype = {{type_id}}
