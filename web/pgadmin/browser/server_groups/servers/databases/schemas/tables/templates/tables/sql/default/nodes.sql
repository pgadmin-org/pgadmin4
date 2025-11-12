SELECT rel.oid, rel.relname AS name,
    (SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE) AS triggercount,
    (SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE AND tgenabled = 'O') AS has_enable_triggers,
    (CASE WHEN rel.relkind = 'p' THEN true ELSE false END) AS is_partitioned,
    (SELECT count(1) FROM pg_catalog.pg_inherits WHERE inhrelid=rel.oid LIMIT 1) as is_inherits,
    (SELECT count(1) FROM pg_catalog.pg_inherits WHERE inhparent=rel.oid LIMIT 1) as is_inherited,
    des.description
FROM pg_catalog.pg_class rel
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=rel.oid AND des.objsubid=0 AND des.classoid='pg_class'::regclass)
    WHERE rel.relkind IN ('r','s','t','p') AND rel.relnamespace = {{ scid }}::oid
    AND NOT rel.relispartition
    {% if tid %} AND rel.oid = {{tid}}::OID {% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = rel.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
    ORDER BY rel.relname;
