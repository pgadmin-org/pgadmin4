{% if is_enable %}
EXEC dbms_scheduler.ENABLE({{ name|qtLiteral(conn) }});
{% else %}
EXEC dbms_scheduler.DISABLE({{ name|qtLiteral(conn) }});
{% endif %}
