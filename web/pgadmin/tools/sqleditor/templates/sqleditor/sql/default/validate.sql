{# Validation query #}
{% if row_filter %}
    EXPLAIN SELECT * FROM {{ conn|qtIdent(nsp_name, object_name) }} WHERE {{ row_filter }}
{% endif %}