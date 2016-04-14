{# SQL query for objects #}
SELECT * FROM {{ conn|qtIdent(nsp_name, object_name) }}
{% if sql_filter %}
WHERE {{ sql_filter }}
{% endif %}
{% if pk_names %}
ORDER BY {{ pk_names }}
{% if cmd_type == 1 or cmd_type == 3 %}ASC {% elif cmd_type == 2 %}DESC {% endif %}
{% endif %}
{% if limit > 0 %}
LIMIT {{ limit }}
{% endif %}
