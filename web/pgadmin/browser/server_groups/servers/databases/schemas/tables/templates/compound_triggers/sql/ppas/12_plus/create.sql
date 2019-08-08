{### Set a flag which allows us to put OR between events ###}
{% set or_flag = False %}
CREATE OR REPLACE TRIGGER {{ conn|qtIdent(data.name) }}
    FOR {% if data.evnt_insert %}INSERT{% set or_flag = True %}
{% endif %}{% if data.evnt_delete %}
{% if or_flag %} OR {% endif %}DELETE{% set or_flag = True %}
{% endif %}{% if data.evnt_truncate %}
{% if or_flag %} OR {% endif %}TRUNCATE{% set or_flag = True %}
{% endif %}{% if data.evnt_update %}
{% if or_flag %} OR {% endif %}UPDATE{% if data.columns|length > 0 %} OF {% for c in data.columns %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(c) }}{% endfor %}{% endif %}
{% endif %}

    ON {{ conn|qtIdent(data.schema, data.table) }}
{% if data.whenclause %}
    WHEN {% if not data.oid %}({% endif %}{{ data.whenclause }}{% if not data.oid %}){% endif %}

{% endif %}
    COMPOUND TRIGGER
{% if data.prosrc is defined %}{{ data.prosrc }}{% endif%}

END {{ conn|qtIdent(data.name) }};

{% if data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{data.description|qtLiteral}};
{% endif %}
