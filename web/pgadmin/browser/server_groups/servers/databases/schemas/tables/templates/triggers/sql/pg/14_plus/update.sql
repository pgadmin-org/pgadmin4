{% if data.name and o_data.name != data.name %}
ALTER TRIGGER {{ conn|qtIdent(o_data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{% if ((data.prosrc is defined or data.is_row_trigger is defined or data.evnt_insert is defined or data.evnt_delete is defined or data.evnt_update is defined or data.fires is defined or data.is_constraint_trigger is defined or data.whenclause is defined) and (o_data.prosrc != data.prosrc or data.is_row_trigger != o_data.is_row_trigger or data.evnt_insert != o_data.evnt_insert or data.evnt_delete != o_data.evnt_delete or data.evnt_update != o_data.evnt_update or o_data.fires != data.fires or data.is_constraint_trigger != o_data.is_constraint_trigger or data.whenclause != o_data.whenclause))  %}
{% set or_flag = False %}
{% if data.lanname == 'edbspl' or data.tfunction == 'Inline EDB-SPL' %}
CREATE OR REPLACE TRIGGER {{ conn|qtIdent(data.name) }}
{% else %}
CREATE{% if not data.is_constraint_trigger %} OR REPLACE{% endif %}{% if data.is_constraint_trigger %} CONSTRAINT{% endif %} TRIGGER {{ conn|qtIdent(data.name) }}
{% endif %}
    {% if data.fires is defined %}{{data.fires}} {% else %}{{o_data.fires}} {% endif %}{% if data.evnt_insert is not defined %}{% if o_data.evnt_insert %}INSERT{% set or_flag = True %}
{% endif %}{% else %}{% if data.evnt_insert %}INSERT{% set or_flag = True %}{% endif %}{% endif %}{% if data.evnt_delete is not defined %}{% if o_data.evnt_delete %}
{% if or_flag %} OR {% endif %}DELETE{% set or_flag = True %}
{% endif %}{% else %}{% if data.evnt_delete %}
{% if or_flag %} OR {% endif %}DELETE{% set or_flag = True %}{%endif %}{% endif %}{% if data.evnt_truncate is not defined %}{% if o_data.evnt_truncate %}
{% if or_flag %} OR {% endif %}TRUNCATE{% set or_flag = True %}
{% endif %}{% else %}{% if data.evnt_truncate %}
{% if or_flag %} OR {% endif %}TRUNCATE{% set or_flag = True %}{%endif %}{% endif %}{% if data.evnt_update is not defined %}{% if o_data.evnt_update %}
{% if or_flag %} OR {% endif %}UPDATE {% if o_data.columns|length > 0 %}OF {% for c in o_data.columns %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(c) }}{% endfor %}{% endif %}
{% endif %}{% else %}{% if data.evnt_update %}
{% if or_flag %} OR {% endif %}UPDATE {% if data.columns|length > 0 %}OF {% for c in data.columns %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(c) }}{% endfor %}{% endif %}{% endif %}
{% endif %}

    ON {{ conn|qtIdent(data.schema, data.table) }}
{% if data.tgdeferrable %}
    DEFERRABLE{% if data.tginitdeferred %} INITIALLY DEFERRED{% endif %}

{% elif o_data.tgdeferrable %}
    DEFERRABLE{% if o_data.tginitdeferred %} INITIALLY DEFERRED{% endif %}

{% endif %}{% if data.is_row_trigger is not defined %}
    FOR EACH{% if o_data.is_row_trigger %} ROW{% else %} STATEMENT{% endif %} {% else %}
    FOR EACH{% if data.is_row_trigger %} ROW{% else %} STATEMENT{% endif %} {% endif %}

{% if data.whenclause %}
    WHEN {{ data.whenclause }}
{% elif o_data.whenclause %}
    WHEN {{ o_data.whenclause }}
{% endif %}
{% if (data.tfunction is defined) %}
    EXECUTE FUNCTION {{ data.tfunction }}{% if data.tgargs %}({{ data.tgargs }}){% else %}(){% endif%};
{% else %}
    EXECUTE FUNCTION {{ o_data.tfunction }}{% if o_data.tgargs %}({{ o_data.tgargs }}){% else %}(){% endif%};
{% endif %}

{% if data.description is not defined and o_data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{o_data.description|qtLiteral(conn)}};
{% endif %}
{% endif %}
{% if data.description is defined  and o_data.description != data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{data.description|qtLiteral(conn)}};
{% endif %}
{% if data.is_enable_trigger is defined  and o_data.is_enable_trigger != data.is_enable_trigger %}
{% set enable_map = {'R':'ENABLE REPLICA', 'A':'ENABLE ALWAYS', 'O':'ENABLE', 'D':'DISABLE'} %}
ALTER TABLE {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    {{ enable_map[data.is_enable_trigger] }} TRIGGER {{ conn|qtIdent(data.name) }};
{% endif %}
