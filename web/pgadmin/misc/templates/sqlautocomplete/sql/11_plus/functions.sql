{# ============= Fetch the list of functions based on given schema_names ============= #}
{% if func_name %}
SELECT n.nspname schema_name,
    p.proname func_name,
    pg_catalog.pg_get_function_arguments(p.oid) arg_list,
    pg_catalog.pg_get_function_result(p.oid) return_type,
    CASE WHEN p.prokind = 'a' THEN true ELSE false END is_aggregate,
    CASE WHEN p.prokind = 'w' THEN true ELSE false END is_window,
    p.proretset is_set_returning
FROM pg_catalog.pg_proc p
    INNER JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = '{{schema_name}}' AND p.proname = '{{func_name}}'
    AND p.proretset
    ORDER BY 1, 2
{% else %}
SELECT n.nspname schema_name,
    p.proname object_name,
    pg_catalog.pg_get_function_arguments(p.oid) arg_list,
    pg_catalog.pg_get_function_result(p.oid) return_type,
    CASE WHEN p.prokind = 'a' THEN true ELSE false END is_aggregate,
    CASE WHEN p.prokind = 'w' THEN true ELSE false END is_window,
    p.proretset is_set_returning
FROM pg_catalog.pg_proc p
    INNER JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ({{schema_names}})
{% if is_set_returning %}
    AND p.proretset
{% endif %}
    ORDER BY 1, 2
{% endif %}
