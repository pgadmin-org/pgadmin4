{% if 'chain_name' in data or 'live' in data or 'max_instances' in data or 'timeout' in data or 'self_destruct' in data or 'exclusive_execution' in data or 'client_name' in data or 'on_error' in data or 'run_at' in data %}
UPDATE timetable.chain
SET {% if 'chain_name' in data %}chain_name = {{ data.chain_name|qtLiteral(conn) }}::text{% if 'live' in data or 'max_instances' in data or 'timeout' in data or 'self_destruct' in data or 'exclusive_execution' in data or 'client_name' in data or 'on_error' in data or 'run_at' in data %}, {% endif %}{% endif %}
{% if 'live' in data %}live = {% if data.live %}true{% else %}false{% endif %}{% if 'max_instances' in data or 'timeout' in data or 'self_destruct' in data or 'exclusive_execution' in data or 'client_name' in data or 'on_error' in data or 'run_at' in data %}, {% endif %}{% endif %}
{% if 'max_instances' in data %}max_instances = {% if data.max_instances is not none %}{{ data.max_instances|qtLiteral(conn) }}::integer{% else %}NULL{% endif %}{% if 'timeout' in data or 'self_destruct' in data or 'exclusive_execution' in data or 'client_name' in data or 'on_error' in data or 'run_at' in data %}, {% endif %}{% endif %}
{% if 'timeout' in data %}timeout = {% if data.timeout is not none %}{{ data.timeout|qtLiteral(conn) }}::integer{% else %}0{% endif %}{% if 'self_destruct' in data or 'exclusive_execution' in data or 'client_name' in data or 'on_error' in data or 'run_at' in data %}, {% endif %}{% endif %}
{% if 'self_destruct' in data %}self_destruct = {% if data.self_destruct %}true{% else %}false{% endif %}{% if 'exclusive_execution' in data or 'client_name' in data or 'on_error' in data or 'run_at' in data %}, {% endif %}{% endif %}
{% if 'exclusive_execution' in data %}exclusive_execution = {% if data.exclusive_execution %}true{% else %}false{% endif %}{% if 'client_name' in data or 'on_error' in data or 'run_at' in data %}, {% endif %}{% endif %}
{% if 'client_name' in data %}client_name = {% if data.client_name and data.client_name|length > 0 %}{{ data.client_name|qtLiteral(conn) }}::text{% else %}NULL{% endif %}{% if 'on_error' in data or 'run_at' in data %}, {% endif %}{% endif %}
{% if 'on_error' in data %}on_error = {% if data.on_error and data.on_error|length > 0 %}{{ data.on_error|qtLiteral(conn) }}::text{% else %}NULL{% endif %}{% if 'run_at' in data %}, {% endif %}{% endif %}
{% if 'run_at' in data %}run_at = {% if data.run_at and data.run_at|length > 0 %}{{ data.run_at|qtLiteral(conn) }}::text{% else %}NULL{% endif %}{% endif %}
WHERE chain_id = {{ chain_id|qtLiteral(conn) }}::integer;
{% endif %}
