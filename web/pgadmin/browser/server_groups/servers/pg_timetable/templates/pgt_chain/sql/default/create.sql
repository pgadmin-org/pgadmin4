DO $$
DECLARE
    cid integer;
    tid integer;
BEGIN
INSERT INTO timetable.chain(
    chain_name, run_at, client_name, live, max_instances, timeout, self_destruct, exclusive_execution, on_error
) VALUES (
    {{ data.chain_name|qtLiteral(conn) }}::text,
    {% if data.run_at and data.run_at|length > 0 %}{{ data.run_at|qtLiteral(conn) }}::text{% else %}NULL{% endif %},
    {% if data.client_name and data.client_name|length > 0 %}{{ data.client_name|qtLiteral(conn) }}::text{% else %}NULL{% endif %},
    {% if data.live %}true{% else %}false{% endif %},
    {% if data.max_instances is defined and data.max_instances is not none %}{{ data.max_instances|qtLiteral(conn) }}::integer{% else %}NULL{% endif %},
    {% if data.timeout is defined and data.timeout is not none %}{{ data.timeout|qtLiteral(conn) }}::integer{% else %}0{% endif %},
    {% if data.self_destruct %}true{% else %}false{% endif %},
    {% if data.exclusive_execution %}true{% else %}false{% endif %},
    {% if data.on_error and data.on_error|length > 0 %}{{ data.on_error|qtLiteral(conn) }}::text{% else %}NULL{% endif %}
) RETURNING chain_id INTO cid;
{% if 'ctasks' in data and data.ctasks|length > 0 %}

{% for task in data.ctasks %}
INSERT INTO timetable.task(
    chain_id, task_name, task_order, command, kind
    {% if 'ignore_error' in task %}, ignore_error{% endif %}
    {% if 'database_connection' in task and task.database_connection %}, database_connection{% endif %}
) VALUES (
    cid, {{ task.task_name|qtLiteral(conn) }}::text, {{ task.task_order|qtLiteral(conn) }}::integer, {{ task.command|qtLiteral(conn) }}::text, {{ task.kind|qtLiteral(conn) }}::timetable.command_kind
    {% if 'ignore_error' in task %}, {% if task.ignore_error %}true{% else %}false{% endif %}{% endif %}
    {% if 'database_connection' in task and task.database_connection %}, {{ task.database_connection|qtLiteral(conn) }}::text{% endif %}
) RETURNING task_id INTO tid;
{% if 'parameters' in task and task.parameters|length > 0 %}
{% for param in task.parameters %}
INSERT INTO timetable.parameter(task_id, order_id, value)
VALUES (tid, {{ param.order_id|qtLiteral(conn) }}::integer, {% if param._is_json %}{{ param.value|qtLiteral(conn) }}::jsonb{% else %}to_jsonb({{ param.value|qtLiteral(conn) }}::text){% endif %});
{% endfor %}
{% endif %}
{% endfor %}{% endif %}

END
$$;
{% if fetch_id %}
SELECT chain_id FROM timetable.chain WHERE chain_name = {{ data.chain_name|qtLiteral(conn) }}::text;
{% endif %}
