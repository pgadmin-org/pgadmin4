{% for n in range(colcnt|int) %}
{% if loop.index != 1 %}
UNION SELECT  pg_get_indexdef({{ cid|string }}, {{ loop.index|string }}, true) AS column
{% else %}
SELECT  pg_get_indexdef({{ cid|string }} , {{ loop.index|string }} , true) AS column
{% endif %}
{% endfor %}