{% if display_comments %}
-- RESOURCE GROUP: {{rgname}}

-- DROP RESOURCE GROUP {{ conn|qtIdent(rgname) }}

{% endif %}
{# ============= Create the resource group============= #}
{% if rgname %}
CREATE RESOURCE GROUP {{ conn|qtIdent(rgname) }};
{% endif %}