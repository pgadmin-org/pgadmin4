{% if display_comments %}
-- DBMS Job: '{{ job_name }}'

-- EXEC dbms_scheduler.DROP_JOB('{{ job_name }}');

{% endif %}
{% if internal_job_type is defined and internal_job_type == 's' %}
EXEC dbms_scheduler.CREATE_JOB(
  job_name            => {{ job_name|qtLiteral(conn) }},
  job_type            => {{ job_type|qtLiteral(conn) }},
  job_action          => {{ job_action|qtLiteral(conn) }},
  repeat_interval     => {{ repeat_interval|qtLiteral(conn) }}{% if start_date or end_date or number_of_arguments or enabled or comments %},{% endif %}
{% if start_date %}

  start_date          => {{ start_date|qtLiteral(conn) }}{% if end_date or number_of_arguments or enabled or comments %},{% endif %}
{% endif %}
{% if end_date %}

  end_date            => {{ end_date|qtLiteral(conn) }}{% if number_of_arguments or enabled or comments %},{% endif %}
{% endif %}
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
{% elif internal_job_type is defined and internal_job_type == 'p' %}
EXEC dbms_scheduler.CREATE_JOB(
  job_name        => {{ job_name|qtLiteral(conn) }},
  program_name    => {{ program_name|qtLiteral(conn) }},
  schedule_name   => {{ schedule_name|qtLiteral(conn) }}{% if enabled or comments %},{% endif %}
{% if enabled %}

  enabled         => {{ enabled }}{% if comments %},{% endif %}
{% endif %}
{% if comments %}

  comments        => {{ comments|qtLiteral(conn) }}
{% endif %}
);
{% endif %}

{% for args_list_item in arguments %}
EXEC dbms_scheduler.SET_JOB_ARGUMENT_VALUE(
    job_name       => {{ job_name|qtLiteral(conn) }},
    argument_name  => {{ args_list_item.argname|qtLiteral(conn) }},
{% if args_list_item.argval is defined and args_list_item.argval != '' %}
    argument_value => {{ args_list_item.argval|qtLiteral(conn) }}
{% elif args_list_item.argdefval is defined %}
    argument_value => {{ args_list_item.argdefval|qtLiteral(conn) }}
{% endif %}
);

{% endfor %}
