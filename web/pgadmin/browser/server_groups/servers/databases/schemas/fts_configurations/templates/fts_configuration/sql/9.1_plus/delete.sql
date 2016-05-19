{# DROP FTS CONFIGURATION Statement #}
{% if schema and name %}
DROP TEXT SEARCH CONFIGURATION {{conn|qtIdent(schema)}}.{{conn|qtIdent(name)}} {% if cascade %}CASCADE{%endif%};
{% endif %}