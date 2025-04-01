{# ============= Check object has OIDs or not ============= #}
{% if obj_id %}
SELECT rel.relhasoids AS has_oids
FROM pg_catalog.pg_class rel
WHERE rel.oid = {{ obj_id }}::oid
{% endif %}
