{# Create a transaction to ensure both the chain and tasks are added safely #}
BEGIN;

{# 1. Register the base chain/job with the timetable system #}
SELECT timetable.add_job(
    job_name => {{ data.name|qtLiteral }},
    job_schedule => {{ data.run_at|qtLiteral }},
    job_command => NULL,  {# We leave this NULL because we add separate step tasks below #}
    job_kind => 'SQL'::timetable.task_kind,
    job_client_name => NULL,
    job_max_instances => {{ data.max_instances|default(1, true)|int }},
    job_live => {{ data.live|lower }}
);

{#
   2. Target the newly created job id to assign custom child tasks.
   pg_timetable automatically names the base background chain after the job_name.
#}
DO $$
DECLARE
    v_chain_id bigint;
BEGIN
    SELECT chain_id INTO v_chain_id
    FROM timetable.chain
    WHERE name = {{ data.name|qtLiteral }}
    ORDER BY chain_id DESC LIMIT 1;

    {# Loop through the collection of tasks passed from our React multi-row grid #}
    {% if data.tasks and data.tasks|length > 0 %}
        {% for task in data.tasks %}
        INSERT INTO timetable.task (
            chain_id,
            task_order,
            task_kind,
            command
        ) VALUES (
            v_chain_id,
            {{ loop.index }},
            {{ task.task_kind|qtLiteral }}::timetable.task_kind,
            {{ task.command|qtLiteral }}
        );
        {% endfor %}
    {% endif %}
END $$;

COMMIT;
