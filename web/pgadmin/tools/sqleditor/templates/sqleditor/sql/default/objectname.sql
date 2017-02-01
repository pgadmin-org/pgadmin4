{# ============= Fetch the schema and object name for given object id ============= #}
{% if obj_id %}
SELECT n.nspname, r.relname
FROM pg_class r
    LEFT JOIN pg_namespace n ON (r.relnamespace = n.oid)
WHERE r.oid = {{obj_id}};
{% endif %}
