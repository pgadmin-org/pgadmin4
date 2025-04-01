{# UPDATE Description for CAST #}

{%  if data and 'description' in data and data.description != o_data.description %}
COMMENT ON CAST ({{ conn|qtTypeIdent(o_data.srctyp) }} AS {{ conn|qtTypeIdent(o_data.trgtyp) }})
    IS {{ data.description|qtLiteral(conn) }};
{% endif %}
