{# SQL query for objects #}
SELECT * FROM {{ conn|qtIdent(nsp_name, object_name) }}
{% if sql_filter %}
WHERE {{ sql_filter }}
{% endif %}
{% if primary_keys %}
ORDER BY {% for p in primary_keys %}{{conn|qtIdent(p)}}{% if cmd_type == 1 or cmd_type == 3 %} ASC{% elif cmd_type == 2 %} DESC{% endif %}
{% if not loop.last %}, {% else %} {% endif %}{% endfor %}
{% endif %}
{% if limit > 0 %}
LIMIT {{ limit }}
{% endif %}
