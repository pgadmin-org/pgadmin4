{% if data.name and o_data.name != data.name %}
ALTER TRIGGER {{ conn|qtIdent(o_data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{% if data.prosrc is defined and o_data.lanname == 'edbspl' and o_data.prosrc != data.prosrc %}
{% set or_flag = False %}
CREATE OR REPLACE TRIGGER {{ conn|qtIdent(data.name) }}
    {{o_data.fires}} {% if o_data.evnt_insert %}INSERT{% set or_flag = True %}
{% endif %}{% if o_data.evnt_delete %}
{% if or_flag %} OR {% endif %}DELETE{% set or_flag = True %}
{% endif %}{% if o_data.evnt_truncate %}
{% if or_flag %} OR {% endif %}TRUNCATE{% set or_flag = True %}
{% endif %}{% if o_data.evnt_update %}
{% if or_flag %} OR {% endif %}UPDATE {% if o_data.columns|length > 0 %}OF {% for c in o_data.columns %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(c.column) }}{% endfor %}{% endif %}
{% endif %}

    ON {{ conn|qtIdent(data.schema, data.table) }}
{% if o_data.tgdeferrable %}
    DEFERRABLE{% if o_data.tginitdeferred %} INITIALLY DEFERRED{% endif %}
{% endif %}
    FOR EACH{% if o_data.is_row_trigger %} ROW{% else %} STATEMENT{% endif %}
{% if o_data.whenclause %}
    WHEN {{ o_data.whenclause }}
{% endif %}

{{ data.prosrc }};

{% if data.description is not defined and o_data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{o_data.description|qtLiteral}};
{% endif %}
{% endif %}
{% if data.description is defined  and o_data.description != data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{data.description|qtLiteral}};
{% endif %}
