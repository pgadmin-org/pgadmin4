{# SQL query for objects #}
SELECT {% if has_oids %}oid, {% endif %}* FROM {{ conn|qtIdent(nsp_name, object_name) }}
{% if sql_filter %}
WHERE {{ sql_filter }}
{% endif %}
{% if data_sorting and data_sorting|length > 0 %}
ORDER BY {% for obj in data_sorting %}
{{ conn|qtIdent(obj.name) }} {{ obj.order|upper }}{% if not loop.last %}, {% else %} {% endif %}
{% endfor %}
{% elif primary_keys %}
ORDER BY {% for p in primary_keys %}{{conn|qtIdent(p)}}{% if cmd_type == 1 or cmd_type == 3 %} ASC{% elif cmd_type == 2 %} DESC{% endif %}
{% if not loop.last %}, {% else %} {% endif %}{% endfor %}
{% endif %}
{% if limit > 0 %}
LIMIT {{ limit }}
{% endif %}
