{% if display_comments %}
-- DBMS Schedule: '{{ schedule_name }}'

-- EXEC dbms_scheduler.DROP_SCHEDULE('{{ schedule_name }}');

{% endif %}
EXEC dbms_scheduler.CREATE_SCHEDULE(
  schedule_name   => {{ schedule_name|qtLiteral(conn) }},
  repeat_interval => {{ repeat_interval|qtLiteral(conn) }}{% if start_date or end_date or comments %},{% endif %}
{% if start_date %}

  start_date      => {{ start_date|qtLiteral(conn) }}{% if end_date or comments %},{% endif %}
{% endif %}
{% if end_date %}

  end_date        => {{ end_date|qtLiteral(conn) }}{% if comments %},{% endif %}
{% endif %}
{% if comments %}

  comments        => {{ comments|qtLiteral(conn) }}
{% endif %}
);
