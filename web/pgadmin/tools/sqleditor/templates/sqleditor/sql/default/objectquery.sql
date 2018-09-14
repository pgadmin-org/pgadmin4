{# SQL query for objects #}
SELECT {% if has_oids %}oid, {% endif %}* FROM {{ conn|qtIdent(nsp_name, object_name) }}
{% if sql_filter %}
WHERE {{ sql_filter }}
{% endif %}
{% if data_sorting and data_sorting|length > 0 %}
ORDER BY {% for obj in data_sorting %}
{{ conn|qtIdent(obj.name) }} {{ obj.order|upper }}{% if not loop.last %}, {% else %} {% endif %}
{% endfor %}
{% endif %}
{% if limit > 0 %}
LIMIT {{ limit }}
{% endif %}
