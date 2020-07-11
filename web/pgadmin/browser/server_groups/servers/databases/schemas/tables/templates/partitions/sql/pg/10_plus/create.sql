{% import 'tables/sql/macros/constraints.macro' as CONSTRAINTS %}
{#===========================================#}
{#====== MAIN TABLE TEMPLATE STARTS HERE ======#}
{#===========================================#}
{### CREATE TABLE STATEMENT FOR partitions ###}

CREATE {% if data.relpersistence %}UNLOGGED {% endif %}TABLE {{conn|qtIdent(data.schema, data.name)}}{% if data.relispartition is defined and data.relispartition %} PARTITION OF {{conn|qtIdent(data.parent_schema, data.partitioned_table_name)}}{% endif %}

{# Macro to render for constraints #}
{% if data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 or data.check_constraint|length > 0 or data.exclude_constraint|length > 0 %}
( {% endif %}
{% if data.primary_key|length > 0 %}{{CONSTRAINTS.PRIMARY_KEY(conn, data.primary_key[0])}}{% endif %}{% if data.unique_constraint|length > 0 %}{% if data.primary_key|length > 0 %},{% endif %}
{{CONSTRAINTS.UNIQUE(conn, data.unique_constraint)}}{% endif %}{% if data.foreign_key|length > 0 %}{% if data.primary_key|length > 0 or data.unique_constraint|length > 0 %},{% endif %}
{{CONSTRAINTS.FOREIGN_KEY(conn, data.foreign_key)}}{% endif %}{% if data.check_constraint|length > 0 %}{% if data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 %},{% endif %}
{{CONSTRAINTS.CHECK(conn, data.check_constraint)}}{% endif %}{% if data.exclude_constraint|length > 0 %}{% if data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 or data.check_constraint|length > 0 %},{% endif %}
{{CONSTRAINTS.EXCLUDE(conn, data.exclude_constraint)}}{% endif %}
{% if data.primary_key|length > 0 or data.unique_constraint|length > 0 or data.foreign_key|length > 0 or data.check_constraint|length > 0 or data.exclude_constraint|length > 0 %}

)
{% endif %}
    {{ data.partition_value }}{% if data.is_partitioned is defined and data.is_partitioned %}

    PARTITION BY {{ data.partition_scheme }}{% endif %}
{% if data.fillfactor or data.autovacuum_custom or data.autovacuum_enabled or data.toast_autovacuum or data.toast_autovacuum_enabled or (data.autovacuum_enabled and data.vacuum_table|length > 0) or (data.toast_autovacuum_enabled and data.vacuum_toast|length > 0) %}
{% set add_comma = false%}

WITH (
{% if data.fillfactor %}{% set add_comma = true%}
    FILLFACTOR = {{ data.fillfactor }}{% endif %}{% if data.autovacuum_custom %}
{% if add_comma %},
{% endif %}
    autovacuum_enabled = {% if data.autovacuum_enabled %}TRUE{% else %}FALSE{% endif %}{% set add_comma = true%}{% endif %}{% if data.toast_autovacuum %}
{% if add_comma %},
{% endif %}
    toast.autovacuum_enabled = {% if data.toast_autovacuum_enabled %}TRUE{% else %}FALSE{% endif %}
{% endif %}{% if data.autovacuum_enabled and data.vacuum_table|length > 0 %}
{% for opt in data.vacuum_table %}{% if opt.name and opt.value %}
,
    {{opt.name}} = {{opt.value}}{% endif %}
{% endfor %}{% endif %}{% if data.toast_autovacuum_enabled and data.vacuum_toast|length > 0 %}
{% for opt in data.vacuum_toast %}{% if opt.name and opt.value %}
,
    toast.{{opt.name}} = {{opt.value}}{% endif %}
{% endfor %}{% endif %}

){% endif %}
{### SQL for Tablespace ###}
{% if data.spcname %}

TABLESPACE {{ conn|qtIdent(data.spcname) }};
{% else %}
;

{% endif %}
{### Alter SQL for Owner ###}
{% if data.relowner %}

ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    OWNER to {{conn|qtIdent(data.relowner)}};
{% endif %}
{### SQL for COMMENT ###}
{% if data.description %}
COMMENT ON TABLE {{conn|qtIdent(data.schema, data.name)}}
    IS {{data.description|qtLiteral}};
{% endif %}
