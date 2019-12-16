SELECT t.main_oid, ARRAY_AGG(t.typname) as edit_types
FROM
(SELECT pc.castsource AS main_oid, format_type(tt.oid,NULL) AS typname
FROM pg_type tt
    JOIN pg_cast pc ON tt.oid=pc.casttarget
    WHERE pc.castsource IN ({{type_ids}})
    AND pc.castcontext IN ('i', 'a')
UNION
SELECT tt.typbasetype AS main_oid, format_type(tt.oid,NULL) AS typname
FROM pg_type tt
WHERE tt.typbasetype  IN ({{type_ids}})
) t
GROUP BY t.main_oid;
