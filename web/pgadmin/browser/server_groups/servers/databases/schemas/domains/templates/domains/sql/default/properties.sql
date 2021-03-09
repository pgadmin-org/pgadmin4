SELECT
    d.oid, d.typname as name, d.typbasetype, pg_catalog.format_type(b.oid,NULL) as basetype,
    pg_catalog.pg_get_userbyid(d.typowner) as owner,
    c.oid AS colloid, pg_catalog.format_type(b.oid, d.typtypmod) AS fulltype,
    CASE WHEN length(cn.nspname::text) > 0 AND length(c.collname::text) > 0 THEN
    pg_catalog.concat(cn.nspname, '."', c.collname,'"')
    ELSE '' END AS collname,
    d.typtypmod, d.typnotnull, d.typdefault, d.typndims, d.typdelim, bn.nspname as basensp,
    description, (SELECT COUNT(1) FROM pg_catalog.pg_type t2 WHERE t2.typname=d.typname) > 1 AS domisdup,
    (SELECT COUNT(1) FROM pg_catalog.pg_type t3 WHERE t3.typname=b.typname) > 1 AS baseisdup,
    (SELECT
        pg_catalog.array_agg(provider || '=' || label)
    FROM
        pg_catalog.pg_seclabel sl1
    WHERE
        sl1.objoid=d.oid) AS seclabels
FROM
    pg_catalog.pg_type d
JOIN
    pg_catalog.pg_type b ON b.oid = d.typbasetype
JOIN
    pg_catalog.pg_namespace bn ON bn.oid=d.typnamespace
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=d.oid AND des.classoid='pg_type'::regclass)
LEFT OUTER JOIN
    pg_catalog.pg_collation c ON d.typcollation=c.oid
LEFT OUTER JOIN
    pg_catalog.pg_namespace cn ON c.collnamespace=cn.oid
WHERE
    d.typnamespace = {{scid}}::oid
    {% if doid %}
    AND d.oid={{doid}}::oid
    {% endif %}
ORDER BY
    d.typname;
