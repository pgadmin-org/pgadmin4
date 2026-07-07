{% import 'macros/pgt_chaintask.macros' as TASK %}
WITH tid AS (
    {{ TASK.INSERT(has_connstr, chain_id, data, conn) }}
)
{% if 'parameters' in data and data.parameters|length > 0 %}
, ins AS (
    INSERT INTO timetable.parameter(task_id, order_id, value)
    SELECT tid.task_id, p.order_id, p.val
    FROM tid,
    (VALUES
    {% for param in data.parameters %}
        ({{ param.order_id|qtLiteral(conn) }}::integer, {% if param._is_json %}{{ param.value|qtLiteral(conn) }}::jsonb{% else %}to_jsonb({{ param.value|qtLiteral(conn) }}::text){% endif %})
        {% if not loop.last %},{% endif %}
    {% endfor %}
    ) AS p(order_id, val)
    RETURNING task_id
)
SELECT task_id FROM ins LIMIT 1
{% else %}
SELECT task_id FROM tid;
{% endif %}
