{# Execute edits in an isolated block to prevent broken partial task steps #}
BEGIN;

{# 1. Apply core parameter changes to the master chain row if any modifications occurred #}
{% if data.name or data.run_at or data.max_instances is defined or data.live is defined %}
UPDATE timetable.chain
SET
    {% if data.name %}
    name = {{ data.name|qtLiteral }},
    {% endif %}
    {% if data.run_at %}
    run_at = {{ data.run_at|qtLiteral }},
    {% endif %}
    {% if data.max_instances is defined %}
    max_instances = {{ data.max_instances|int }},
    {% endif %}
    {% if data.live is defined %}
    live = {{ data.live|lower }},
    {% endif %}
    {# Remove trailing comma safely using standard Postgres syntax dummy assignment #}
    chain_id = chain_id
WHERE chain_id = {{ chain_id|int }};
{% endif %}

{# 2. Re-align steps layout if the tasks grid configuration was edited #}
{% if data.tasks and data.tasks|length > 0 %}
    {# Wipe pre-existing tasks assigned to this target id #}
    DELETE FROM timetable.task WHERE chain_id = {{ chain_id|int }};

    {# Insert the updated sequence list derived from the visual collection grid #}
    {% for task in data.tasks %}
    INSERT INTO timetable.task (
        chain_id,
        task_order,
        task_kind,
        command
    ) VALUES (
        {{ chain_id|int }},
        {{ loop.index }},
        {{ task.task_kind|qtLiteral }}::timetable.task_kind,
        {{ task.command|qtLiteral }}
    );
    {% endfor %}
{% endif %}

COMMIT;
