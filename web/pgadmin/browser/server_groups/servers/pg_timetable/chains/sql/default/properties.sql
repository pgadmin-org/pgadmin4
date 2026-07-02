SELECT
    c.chain_id AS id,
    c.name,
    c.run_at,
    c.max_instances,
    c.live,
    {# Generate a clean JSON array of tasks matching the schema expectations #}
    coalesce(
        (
            SELECT json_agg(
                json_build_object(
                    'task_order', t.task_order,
                    'task_kind', t.task_kind,
                    'command', t.command
                ) ORDER BY t.task_order ASC
            )
            FROM timetable.task t
            WHERE t.chain_id = c.chain_id
        ),
        '[]'::json
    ) AS tasks
FROM
    timetable.chain c
WHERE
    {# If chain_id is omitted, this query returns all rows for the list view #}
    {% if chain_id %}
    c.chain_id = {{ chain_id|int }}
    {% else %}
    1 = 1
    {% endif %};
