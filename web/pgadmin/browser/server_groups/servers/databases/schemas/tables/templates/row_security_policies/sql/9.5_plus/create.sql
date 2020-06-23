{# CREATE POLICY Statement #}
-- POLICY: {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}

-- DROP POLICY {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }};

CREATE POLICY {{ conn|qtIdent(data.name) }}
    ON {{conn|qtIdent(data.schema, data.table)}}
{% if data.event %}
    FOR {{ data.event|upper }}
{% endif %}
{% if data.policyowner %}
    TO {{ conn|qtTypeIdent(data.policyowner) }}
{% else %}
    TO public
{% endif %}
{% if data.using %}
    USING ({{ data.using }})
{% endif %}
{% if data.withcheck %}
    WITH CHECK ({{ data.withcheck }})
{% endif %};
