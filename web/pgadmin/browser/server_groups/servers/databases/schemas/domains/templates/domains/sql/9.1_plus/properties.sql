SELECT
    d.oid, d.typname as name, d.typbasetype, format_type(b.oid,NULL) as basetype,
    pg_get_userbyid(d.typowner) as owner,
    c.oid AS colloid, format_type(b.oid, d.typtypmod) AS fulltype,
    CASE WHEN length(cn.nspname) > 0 AND length(c.collname) > 0 THEN
    concat(cn.nspname, '."', c.collname,'"')
    ELSE '' END AS collname,
    d.typtypmod, d.typnotnull, d.typdefault, d.typndims, d.typdelim, bn.nspname as basensp,
    description, (SELECT COUNT(1) FROM pg_type t2 WHERE t2.typname=d.typname) > 1 AS domisdup,
    (SELECT COUNT(1) FROM pg_type t3 WHERE t3.typname=b.typname) > 1 AS baseisdup,
    (SELECT
        array_agg(provider || '=' || label)
    FROM
        pg_seclabel sl1
    WHERE
        sl1.objoid=d.oid) AS seclabels
FROM
    pg_type d
JOIN
    pg_type b ON b.oid = d.typbasetype
JOIN
    pg_namespace bn ON bn.oid=d.typnamespace
LEFT OUTER JOIN
    pg_description des ON (des.objoid=d.oid AND des.classoid='pg_type'::regclass)
LEFT OUTER JOIN
    pg_collation c ON d.typcollation=c.oid
LEFT OUTER JOIN
    pg_namespace cn ON c.collnamespace=cn.oid
WHERE
    d.typnamespace = {{scid}}::oid
    {% if doid %}
    AND d.oid={{doid}}::int
    {% endif %}
ORDER BY
    d.typname;
