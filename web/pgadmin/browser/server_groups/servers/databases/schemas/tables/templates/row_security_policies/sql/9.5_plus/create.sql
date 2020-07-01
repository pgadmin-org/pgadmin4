{% set add_semicolon_after = 'to' %}
{% if data.withcheck is defined and data.withcheck != None and data.withcheck != '' %}
{% set add_semicolon_after = 'with_check' %}
{% elif data.using is defined and data.using != None and data.using != '' %}
{% set add_semicolon_after = 'using' %}
{% endif %}
CREATE POLICY {{ conn|qtIdent(data.name) }}
    ON {{conn|qtIdent(data.schema, data.table)}}
{% if data.event %}
    FOR {{ data.event|upper }}
{% endif %}
{% if data.policyowner %}
    TO {{ conn|qtTypeIdent(data.policyowner) }}{% if add_semicolon_after == 'to' %};{% endif %}
{% else %}
    TO public{% if add_semicolon_after == 'to' %};{% endif %}
{% endif %}
{% if data.using %}

    USING ({{ data.using }}){% if add_semicolon_after == 'using' %};{% endif %}
{% endif %}
{% if data.withcheck %}

    WITH CHECK ({{ data.withcheck }});
{% endif %}
