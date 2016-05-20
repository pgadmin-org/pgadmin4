{# ===== Below will provide view id for last created view ==== #}
{% if data %}
SELECT c.oid FROM pg_class c WHERE c.relname = '{{ data.name }}';
{% endif %}
