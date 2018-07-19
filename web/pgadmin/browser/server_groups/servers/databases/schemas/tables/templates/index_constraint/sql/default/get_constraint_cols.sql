{###
We need outer SELECT & dummy column to preserve the ordering
because we lose ordering when we use UNION
###}
SELECT * FROM (
{% for n in range(colcnt|int) %}
{% if loop.index != 1 %}
UNION SELECT  pg_get_indexdef({{ cid|string }}, {{ loop.index|string }}, true) AS column, {{ n }} AS dummy
{% else %}
SELECT  pg_get_indexdef({{ cid|string }} , {{ loop.index|string }} , true) AS column, {{ n }} AS dummy
{% endif %}
{% endfor %}
) tmp
ORDER BY dummy