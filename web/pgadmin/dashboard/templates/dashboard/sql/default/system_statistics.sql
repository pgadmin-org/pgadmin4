{% set add_union = false %}
{% if 'pg_sys_os_info' in chart_names %}
{% set add_union = true %}
    SELECT 'pg_sys_os_info' AS chart_name, pg_catalog.row_to_json(t) AS chart_data
    FROM (SELECT * FROM pg_sys_os_info()) t
{% endif %}
{% if add_union and 'pg_sys_cpu_info' in chart_names %}
    UNION ALL
{% endif %}
{% if 'pg_sys_cpu_info' in chart_names %}
{% set add_union = true %}
    SELECT 'pg_sys_cpu_info' AS chart_name, pg_catalog.row_to_json(t) AS chart_data
    FROM (SELECT * FROM pg_sys_cpu_info()) t
{% endif %}
{% if add_union and 'hpc_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'hpc_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'hpc_stats' AS chart_name, pg_catalog.row_to_json(t) AS chart_data
    FROM (SELECT
        (SELECT process_count FROM pg_sys_os_info())  AS "{{ _('Process') }}",
        (SELECT handle_count FROM pg_sys_os_info())  AS "{{ _('Handle') }}"
    ) t
{% endif %}
{% if add_union and 'cpu_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'cpu_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'cpu_stats' AS chart_name, pg_catalog.row_to_json(t) AS chart_data
    FROM (SELECT * FROM pg_sys_cpu_usage_info()) t
{% endif %}
{% if add_union and 'la_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'la_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'la_stats' AS chart_name, pg_catalog.row_to_json(t) AS chart_data FROM (SELECT * FROM pg_sys_load_avg_info()) t
{% endif %}
{% if add_union and 'pcpu_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'pcpu_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'pcpu_stats' AS chart_name, (
    SELECT to_json(pg_catalog.jsonb_object_agg('process'||row_number, pg_catalog.row_to_json(t)))
    FROM (
        SELECT pid, name, cpu_usage, ROW_NUMBER() OVER (ORDER BY pid) AS row_number
        FROM pg_sys_cpu_memory_by_process()
    ) t
    ) AS chart_data
{% endif %}
{% if add_union and 'm_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'm_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'm_stats' AS chart_name, pg_catalog.row_to_json(t) AS chart_data FROM (SELECT total_memory, used_memory, free_memory FROM pg_sys_memory_info()) t
{% endif %}
{% if add_union and 'sm_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'sm_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'sm_stats' AS chart_name, pg_catalog.row_to_json(t) AS chart_data FROM (SELECT swap_total, swap_used, swap_free FROM pg_sys_memory_info()) t
{% endif %}
{% if add_union and 'pmu_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'pmu_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'pmu_stats' AS chart_name, (
    SELECT to_json(pg_catalog.jsonb_object_agg('process'||row_number, pg_catalog.row_to_json(t)))
    FROM (
        SELECT pid, name, memory_usage, memory_bytes, ROW_NUMBER() OVER (ORDER BY pid) AS row_number
        FROM pg_sys_cpu_memory_by_process()
    ) t
    ) AS chart_data
{% endif %}
{% if add_union and 'io_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'io_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'io_stats' AS chart_name, (
    SELECT to_json(pg_catalog.jsonb_object_agg('disk'||row_number, pg_catalog.row_to_json(t)))
    FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY device_name) AS row_number
        FROM pg_sys_io_analysis_info()
    ) t
    ) AS chart_data
{% endif %}
{% if add_union and 'di_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'di_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'di_stats' AS chart_name, (
    SELECT to_json(pg_catalog.jsonb_object_agg('Drive'||row_number, pg_catalog.row_to_json(t)))
    FROM (
        SELECT *, ROW_NUMBER() OVER (ORDER BY total_space) AS row_number
        FROM pg_sys_disk_info() WHERE mount_point IS NOT NULL OR drive_letter IS NOT NULL
    ) t
    ) AS chart_data
{% endif %}
{% if add_union and 'pi_stats' in chart_names %}
    UNION ALL
{% endif %}
{% if 'pi_stats' in chart_names %}
{% set add_union = true %}
    SELECT 'pi_stats' AS chart_name, pg_catalog.row_to_json(t) AS chart_data FROM (SELECT * FROM pg_sys_process_info()) t
{% endif %}
