{# SQL query for getting keywords #}
{% if upper_case %}
SELECT upper(word) as word FROM pg_get_keywords()
{% else %}
SELECT word FROM pg_get_keywords()
{% endif %}

