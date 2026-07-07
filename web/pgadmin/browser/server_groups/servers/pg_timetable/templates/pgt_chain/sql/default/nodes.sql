SELECT
     chain_id, chain_name, run_at, max_instances, timeout, live, self_destruct, exclusive_execution, client_name, on_error
FROM
    timetable.chain
{% if chain_id %}
WHERE chain_id = {{ chain_id|qtLiteral(conn) }}::integer
{% endif %}
ORDER BY chain_name;
