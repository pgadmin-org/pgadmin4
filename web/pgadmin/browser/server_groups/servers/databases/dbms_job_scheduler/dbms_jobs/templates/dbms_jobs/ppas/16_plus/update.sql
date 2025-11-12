{% for chval in changed_value %}
EXEC dbms_scheduler.SET_JOB_ARGUMENT_VALUE(
    job_name       => {{ job_name|qtLiteral(conn) }},
    argument_name  => {{ chval.argname|qtLiteral(conn) }},
{% if chval.argval is defined and chval.argval != '' %}
    argument_value => {{ chval.argval|qtLiteral(conn) }}
{% elif chval.argdefval is defined %}
    argument_value => {{ chval.argdefval|qtLiteral(conn) }}
{% endif %}
);

{% endfor %}
