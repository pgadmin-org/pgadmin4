{# ===== Below will provide view id for last created view ===== #}
{% if data %}
SELECT c.oid, c.relname FROM pg_class c WHERE c.relname = '{{ data.name }}';
{% endif %}
