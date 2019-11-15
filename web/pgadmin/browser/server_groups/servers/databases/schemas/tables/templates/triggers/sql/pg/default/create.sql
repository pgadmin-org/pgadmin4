{### Set a flag which allows us to put OR between events ###}
{% set or_flag = False %}
{% if data.lanname == 'edbspl' or data.tfunction == 'Inline EDB-SPL' %}
CREATE OR REPLACE TRIGGER {{ conn|qtIdent(data.name) }}
{% else %}
CREATE{% if data.is_constraint_trigger %} CONSTRAINT{% endif %} TRIGGER {{ conn|qtIdent(data.name) }}
{% endif %}
    {{data.fires}} {% if data.evnt_insert %}INSERT{% set or_flag = True %}
{% endif %}{% if data.evnt_delete %}
{% if or_flag %} OR {% endif %}DELETE{% set or_flag = True %}
{% endif %}{% if data.evnt_truncate %}
{% if or_flag %} OR {% endif %}TRUNCATE{% set or_flag = True %}
{% endif %}{% if data.evnt_update %}
{% if or_flag %} OR {% endif %}UPDATE {% if data.columns|length > 0 %}OF {% for c in data.columns %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(c) }}{% endfor %}{% endif %}
{% endif %}

    ON {{ conn|qtIdent(data.schema, data.table) }}
{% if data.tgdeferrable %}
    DEFERRABLE{% if data.tginitdeferred %} INITIALLY DEFERRED{% endif %}

{% endif %}
    FOR EACH{% if data.is_row_trigger %} ROW{% else %} STATEMENT{% endif %}
{% if data.whenclause %}

    WHEN ({{ data.whenclause }}){% endif %}

    {% if data.prosrc is defined and
    (data.lanname == 'edbspl' or data.tfunction == 'Inline EDB-SPL') %}{{ data.prosrc }}{% else %}EXECUTE PROCEDURE {{ data.tfunction }}{% if data.tgargs %}({{ data.tgargs }}){% else %}(){% endif%}{% endif%};

{% if data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{data.description|qtLiteral}};
{% endif %}
