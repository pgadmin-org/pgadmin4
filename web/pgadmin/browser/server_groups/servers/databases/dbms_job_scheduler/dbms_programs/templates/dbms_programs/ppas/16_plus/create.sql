{% if display_comments %}
-- DBMS Program: '{{ program_name }}'

-- EXEC dbms_scheduler.DROP_PROGRAM('{{ program_name }}');

{% endif %}
EXEC dbms_scheduler.CREATE_PROGRAM(
  program_name        => {{ program_name|qtLiteral(conn) }},
  program_type        => {{ program_type|qtLiteral(conn)  }},
  program_action      => {{ program_action|qtLiteral(conn) }}{% if number_of_arguments or enabled or comments %},{% endif %}
{% if number_of_arguments %}

  number_of_arguments => {{ number_of_arguments }}{% if enabled or comments %},{% endif %}
{% endif %}
{% if enabled %}

  enabled             => {{ enabled }}{% if comments %},{% endif %}
{% endif %}
{% if comments %}

  comments            => {{ comments|qtLiteral(conn) }}
{% endif %}
);

{% for args_list_item in arguments %}
EXEC dbms_scheduler.DEFINE_PROGRAM_ARGUMENT(
  program_name      => {{ program_name|qtLiteral(conn) }},
  argument_position => {{ args_list_item['argid'] }},
  argument_name     => {{ args_list_item['argname']|qtLiteral(conn) }},
  argument_type     => {{ args_list_item['argtype']|qtLiteral(conn) }},
  default_value     => {{ args_list_item['argdefval']|qtLiteral(conn) }}
);

{% endfor %}
