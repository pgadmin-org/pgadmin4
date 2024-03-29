SELECT
    rw.oid AS oid,
    rw.rulename AS name,
    CASE WHEN rw.ev_enabled != 'D' THEN True ELSE False END AS enabled,
    rw.ev_enabled AS is_enable_rule,
    description AS comment
FROM
    pg_catalog.pg_rewrite rw
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=rw.oid AND des.classoid='pg_rewrite'::regclass)
WHERE
{% if tid %}
    rw.ev_class = {{ tid }}
{% elif rid %}
    rw.oid = {{ rid }}
{% endif %}
{% if schema_diff %}
    AND rw.rulename != '_RETURN'
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = rw.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY
    rw.rulename
