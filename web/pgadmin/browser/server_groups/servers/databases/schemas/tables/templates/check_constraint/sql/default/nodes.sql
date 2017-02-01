SELECT c.oid, conname as name
    FROM pg_constraint c
WHERE contype = 'c'
{% if tid %}
    AND conrelid = {{ tid }}::oid
{% endif %}
