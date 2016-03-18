{% macro LIST(tbl) -%}
    ({{ tbl }}.nspname = 'pg_catalog' AND EXISTS
        (SELECT 1 FROM pg_class
        WHERE relname = 'pg_class' AND relnamespace = {{ tbl }}.oid LIMIT 1)) OR
    ({{ tbl }}.nspname = 'pgagent' AND EXISTS
        (SELECT 1 FROM pg_class
        WHERE relname = 'pga_job' AND relnamespace = {{ tbl }}.oid LIMIT 1)) OR
    ({{ tbl }}.nspname = 'information_schema' AND EXISTS
        (SELECT 1 FROM pg_class
        WHERE relname = 'tables' AND relnamespace = {{ tbl }}.oid LIMIT 1)) OR
    ({{ tbl }}.nspname = 'dbo' OR {{ tbl }}.nspname = 'sys') OR
    ({{ tbl }}.nspname = 'dbms_job_procedure' AND EXISTS
       (SELECT 1 FROM pg_proc
        WHERE pronamespace = {{ tbl }}.oid and proname = 'run_job' LIMIT 1))
{%- endmacro %}
{% macro LABELS(tbl, _) -%}
    CASE {{ tbl }}.nspname
    WHEN 'pg_catalog' THEN '{{ _( 'PostgreSQL Catalog' ) }} (pg_catalog)'
    WHEN 'pgagent' THEN '{{ _( 'pgAgent Job Scheduler' ) }} (pgagent)'
    WHEN 'information_schema' THEN '{{ _( 'ANSI' ) }} (information_schema)'
    WHEN 'dbo' THEN 'Redmond (dbo)'
    WHEN 'sys' THEN 'Redwood (sys)'
    ELSE {{ tbl }}.nspname
    END AS name
{%- endmacro %}
{% macro DB_SUPPORT(tbl) -%}
    CASE
    WHEN {{ tbl }}.nspname = ANY('{information_schema,sys,dbo}')
        THEN false
    ELSE true END
{%- endmacro %}
