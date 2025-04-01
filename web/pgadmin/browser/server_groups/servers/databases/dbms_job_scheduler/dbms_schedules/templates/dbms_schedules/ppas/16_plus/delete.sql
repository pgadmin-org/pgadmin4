EXEC dbms_scheduler.DROP_SCHEDULE(
    {{ schedule_name|qtLiteral(conn) }}{% if force %},{% endif %}
{% if force %}
    {{ force }}
{% endif %}
);
