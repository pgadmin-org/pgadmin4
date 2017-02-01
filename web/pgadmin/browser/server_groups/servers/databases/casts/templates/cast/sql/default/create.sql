{# CREATE CAST Statement #}

{% if data and data.srctyp and data.trgtyp %}
CREATE CAST ({{ conn|qtTypeIdent(data.srctyp) }} AS {{ conn|qtTypeIdent(data.trgtyp) }})
{% if data.proname and data.proname != 'binary compatible'%}
    WITH FUNCTION {{data.proname}}{% else %}
    WITHOUT FUNCTION{% endif %}
{% if data.castcontext and data.castcontext != 'EXPLICIT' %}

    AS {{data.castcontext}}{% endif %};
{# Description for CAST #}
{% if data.description %}
COMMENT ON CAST ({{ conn|qtTypeIdent(data.srctyp) }} AS {{ conn|qtTypeIdent(data.trgtyp) }})
    IS {{ data.description|qtLiteral }};
{% endif %}{% endif %}