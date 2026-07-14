SELECT
    task_id, chain_id, task_name, task_order,
    kind::text AS kind
FROM
    timetable.task
WHERE
{% if task_id %}
    task_id = {{ task_id|qtLiteral(conn) }}::integer AND
{% endif %}
    chain_id = {{ chain_id|qtLiteral(conn) }}::integer
ORDER BY task_order;
