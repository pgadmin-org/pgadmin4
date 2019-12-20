SELECT tt.oid, format_type(tt.oid,NULL) AS typname
FROM pg_type tt
    JOIN pg_cast pc ON tt.oid=pc.casttarget
    WHERE pc.castsource= {{type_id}}
    AND pc.castcontext IN ('i', 'a')
UNION
SELECT tt.oid, format_type(tt.oid,NULL) AS typname
FROM pg_type tt
WHERE tt.typbasetype = {{type_id}}
