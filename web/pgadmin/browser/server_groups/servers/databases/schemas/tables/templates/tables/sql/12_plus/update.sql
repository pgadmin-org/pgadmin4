{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{#####################################################}
{## Rename table ##}
{#####################################################}
{% if data.name and data.name != o_data.name %}
ALTER TABLE {{conn|qtIdent(o_data.schema, o_data.name)}}
    RENAME TO {{conn|qtIdent(data.name)}};

{% endif %}
{#####################################################}
{## Change table schema ##}
{#####################################################}
{% if data.schema and data.schema != o_data.schema %}
ALTER TABLE {{conn|qtIdent(o_data.schema, data.name)}}
  SET SCHEMA {{conn|qtIdent(data.schema)}};

{% endif %}
{#####################################################}
{## Change table owner ##}
{#####################################################}
{% if data.relowner and data.relowner != o_data.relowner %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    OWNER TO {{conn|qtIdent(data.relowner)}};

{% endif %}
{#####################################################}
{## Update Inherits table definition ##}
{#####################################################}
{% if data.coll_inherits_added|length > 0 %}
{% for val in data.coll_inherits_added %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    INHERIT {{val}};

{% endfor %}
{% endif %}
{% if data.coll_inherits_removed|length > 0 %}
{% for val in data.coll_inherits_removed %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    NO INHERIT {{val}};

{% endfor %}
{% endif %}
{#####################################################}
{## Change tablespace ##}
{#####################################################}
{% if data.spcname and data.spcname != o_data.spcname %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    SET TABLESPACE {{conn|qtIdent(data.spcname)}};

{% endif %}
{#####################################################}
{## change fillfactore settings ##}
{#####################################################}
{% if data.fillfactor and data.fillfactor != o_data.fillfactor %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    SET (FILLFACTOR={{data.fillfactor}});

{% endif %}
{###############################}
{## Table AutoVacuum settings ##}
{###############################}
{% if data.vacuum_table is defined and data.vacuum_table.set_values|length > 0 %}
{% set has_vacuum_set = true %}
{% endif %}
{% if data.vacuum_table is defined and data.vacuum_table.reset_values|length > 0 %}
{% set has_vacuum_reset = true %}
{% endif %}
{% if o_data.autovacuum_custom and data.autovacuum_custom == false %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}} RESET (
    autovacuum_enabled,
    autovacuum_analyze_scale_factor,
    autovacuum_analyze_threshold,
    autovacuum_freeze_max_age,
    autovacuum_vacuum_cost_delay,
    autovacuum_vacuum_cost_limit,
    autovacuum_vacuum_scale_factor,
    autovacuum_vacuum_threshold,
    autovacuum_freeze_min_age,
    autovacuum_freeze_table_age
);
{% else %}
{% if data.autovacuum_enabled is defined or has_vacuum_set %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}} SET (
{% if data.autovacuum_enabled is defined and data.autovacuum_enabled != o_data.autovacuum_enabled %}
    autovacuum_enabled = {% if data.autovacuum_enabled %}true{% else %}false{% endif %}{% if has_vacuum_set %},
{% endif %}
{% endif %}
{% if has_vacuum_set %}
{% for opt in data.vacuum_table.set_values %}{% if opt.name and opt.value %}
    {{opt.name}} = {{opt.value}}{% if not loop.last %},
{% endif %}
{% endif %}
{% endfor %}
{% endif %}

);
{% endif %}
{% if has_vacuum_reset %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}} RESET (
{% for opt in data.vacuum_table.reset_values %}{% if opt.name %}
    {{opt.name}}{% if not loop.last %},
{% endif %}
{% endif %}
{% endfor %}

);
{% endif %}
{% endif %}
{#####################################}
{## Toast table AutoVacuum settings ##}
{#####################################}
{% if data.vacuum_toast is defined and data.vacuum_toast.set_values|length > 0 %}
{% set has_vacuum_toast_set = true %}
{% endif %}
{% if data.vacuum_toast is defined and data.vacuum_toast.reset_values|length > 0 %}
{% set has_vacuum_toast_reset = true %}
{% endif %}
{% if o_data.toast_autovacuum and data.toast_autovacuum == false %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}} RESET (
    toast.autovacuum_enabled,
    toast.autovacuum_freeze_max_age,
    toast.autovacuum_vacuum_cost_delay,
    toast.autovacuum_vacuum_cost_limit,
    toast.autovacuum_vacuum_scale_factor,
    toast.autovacuum_vacuum_threshold,
    toast.autovacuum_freeze_min_age,
    toast.autovacuum_freeze_table_age,
    toast.autovacuum_analyze_threshold,
    toast.autovacuum_analyze_scale_factor
);
{% else %}
{% if data.toast_autovacuum_enabled is defined or has_vacuum_toast_set %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}} SET (
{% if data.toast_autovacuum_enabled is defined and data.toast_autovacuum_enabled != o_data.toast_autovacuum_enabled %}
    toast.autovacuum_enabled = {% if data.toast_autovacuum_enabled %}true{% else %}false{% endif %}{% if has_vacuum_toast_set %},
{% endif %}
{% endif %}
{% if has_vacuum_toast_set %}
{% for opt in data.vacuum_toast.set_values %}{% if opt.name and opt.value %}
    toast.{{opt.name}} = {{opt.value}}{% if not loop.last %},
{% endif %}
{% endif %}
{% endfor %}
{% endif %}

);
{% endif %}
{% if has_vacuum_toast_reset %}
ALTER TABLE {{conn|qtIdent(data.schema, data.name)}} RESET (
{% for opt in data.vacuum_toast.reset_values %}{% if opt.name %}
    toast.{{opt.name}}{% if not loop.last %},
{% endif %}
{% endif %}
{% endfor %}

);
{% endif %}
{% endif %}
{#####################################################}
{## Change table comments ##}
{#####################################################}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON TABLE {{conn|qtIdent(data.schema, data.name)}}
  IS {{data.description|qtLiteral}};

{% endif %}
{#####################################################}
{## Update table Privileges ##}
{#####################################################}
{% if data.relacl %}
{% if 'deleted' in data.relacl %}
{% for priv in data.relacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, data.name, data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.relacl %}
{% for priv in data.relacl.changed %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, data.name, data.schema) }}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in data.relacl %}
{% for priv in data.relacl.added %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{% endif %}
{#####################################################}
{## Update table SecurityLabel ##}
{#####################################################}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.UNSET(conn, 'TABLE', data.name, r.provider, data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABEL.SET(conn, 'TABLE', data.name, r.provider, r.label, data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABEL.SET(conn, 'TABLE', data.name, r.provider, r.label, data.schema) }}
{% endfor %}
{% endif %}

{% endif %}
