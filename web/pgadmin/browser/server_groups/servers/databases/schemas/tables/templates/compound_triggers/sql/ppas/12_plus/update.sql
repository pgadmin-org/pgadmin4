{% if data.name and o_data.name != data.name %}
ALTER TRIGGER {{ conn|qtIdent(o_data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{% if ((data.prosrc is defined or data.evnt_insert is defined or data.evnt_delete is defined or data.evnt_truncate is defined or data.evnt_update is defined) and (o_data.prosrc != data.prosrc or data.evnt_insert != o_data.evnt_insert or data.evnt_delete != o_data.evnt_delete or data.evnt_truncate != o_data.evnt_truncate or data.evnt_update != o_data.evnt_update))  %}
{% set or_flag = False %}
CREATE OR REPLACE TRIGGER {{ conn|qtIdent(data.name) }}
    FOR {% if data.evnt_insert is not defined %}{% if o_data.evnt_insert %}INSERT{% set or_flag = True %}{% endif %}{% else %}{% if data.evnt_insert %}INSERT{% set or_flag = True %}{% endif %}{% endif %}{% if data.evnt_delete is not defined %}{% if o_data.evnt_delete %}
{% if or_flag %} OR {% endif %}DELETE{% set or_flag = True %}
{% endif %}{% else %}{% if data.evnt_delete %}
{% if or_flag %} OR {% endif %}DELETE{% set or_flag = True %}{%endif %}{% endif %}{% if data.evnt_truncate is not defined %}{% if o_data.evnt_truncate %}
{% if or_flag %} OR {% endif %}TRUNCATE{% set or_flag = True %}
{% endif %}{% else %}{% if data.evnt_truncate %}
{% if or_flag %} OR {% endif %}TRUNCATE{% set or_flag = True %}{%endif %}{% endif %}{% if data.evnt_update is not defined %}{% if o_data.evnt_update %}
{% if or_flag %} OR {% endif %}UPDATE{% if o_data.columns|length > 0 %} OF {% for c in o_data.columns %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(c) }}{% endfor %}{% endif %}
{% endif %}{% else %}{% if data.evnt_update %}
{% if or_flag %} OR {% endif %}UPDATE{% if o_data.columns|length > 0 %} OF {% for c in o_data.columns %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(c) }}{% endfor %}{% endif %}{% endif %}
{% endif %}

    ON {{ conn|qtIdent(data.schema, data.table) }}
{% if o_data.whenclause %}
    WHEN {{ o_data.whenclause }}

{% endif %}
    COMPOUND TRIGGER
{% if (data.prosrc is not defined) %}{{ o_data.prosrc }}{% else %}{{ data.prosrc }}{% endif %}

END {{ conn|qtIdent(data.name) }};

{% if data.description is not defined and o_data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{o_data.description|qtLiteral}};
{% endif %}
{% endif %}
{% if data.description is defined  and o_data.description != data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{data.description|qtLiteral}};
{% endif %}
{% if data.is_enable_trigger is defined  and o_data.is_enable_trigger != data.is_enable_trigger %}
{% set enable_map = {'R':'ENABLE REPLICA', 'A':'ENABLE ALWAYS', 'O':'ENABLE', 'D':'DISABLE'} %}
ALTER TABLE {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    {{ enable_map[data.is_enable_trigger] }} TRIGGER {{ conn|qtIdent(data.name) }};
{% endif %}
