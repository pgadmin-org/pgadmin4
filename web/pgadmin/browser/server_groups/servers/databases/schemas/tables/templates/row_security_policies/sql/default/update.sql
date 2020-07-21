{#####################################################}
{## Change policy owner ##}
{#####################################################}
{% if data.policyowner and o_data.policyowner != data.policyowner %}
ALTER POLICY {{ conn|qtIdent(o_data.name) }} ON {{conn|qtIdent(o_data.schema, o_data.table)}}
    TO {{ conn|qtTypeIdent(data.policyowner) }};
{% endif %}

{#####################################################}
{## Change policy using condition ##}
{#####################################################}
{% if data.using and o_data.using != data.using %}
ALTER POLICY {{ conn|qtIdent(o_data.name) }} ON {{conn|qtIdent(o_data.schema, o_data.table)}}
    USING ({{ data.using }});
{% endif %}

{#####################################################}
{## Change policy with check condition ##}
{#####################################################}
{% if data.withcheck and o_data.withcheck != data.withcheck %}
ALTER POLICY {{ conn|qtIdent(o_data.name) }} ON {{conn|qtIdent(o_data.schema, o_data.table)}}
    WITH CHECK ({{ data.withcheck }});
{% endif %}

{#####################################################}
{## Change policy name ##}
{#####################################################}
{% if data.name and o_data.name != data.name %}
ALTER POLICY {{ conn|qtIdent(o_data.name) }} ON {{conn|qtIdent(o_data.schema, o_data.table)}}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}


