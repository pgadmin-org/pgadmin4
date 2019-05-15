SELECT rel.oid, rel.relname AS name,
    (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE) AS triggercount,
    (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE AND tgenabled = 'O') AS has_enable_triggers,
    (CASE WHEN rel.relkind = 'p' THEN true ELSE false END) AS is_partitioned
FROM pg_class rel
    WHERE rel.relkind IN ('r','s','t','p') AND rel.relnamespace = {{ scid }}::oid
    AND NOT rel.relispartition
    {% if tid %} AND rel.oid = {{tid}}::OID {% endif %}
    ORDER BY rel.relname;
