{#============================Drop/Cascade Extension by name=========================#}
{% if eid %}
SELECT x.extname from pg_extension x
    WHERE x.oid = {{ eid }}::oid
{% endif %}
{% if name %}
DROP EXTENSION {{ conn|qtIdent(name) }} {% if cascade %} CASCADE {% endif %}
{% endif %}
