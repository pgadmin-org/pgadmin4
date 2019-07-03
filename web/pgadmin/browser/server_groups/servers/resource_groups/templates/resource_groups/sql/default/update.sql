{# ============= Update resource group name ============= #}
{% if newname %}
ALTER RESOURCE GROUP {{ conn|qtIdent(oldname) }} RENAME TO {{ conn|qtIdent(newname) }};
{% endif %}
{# ============= Update resource group cpu_rate_limit and dirty_rate_limit ============= #}
{% if data %}
ALTER RESOURCE GROUP {{ conn|qtIdent(data.name) }}
    SET cpu_rate_limit = {{data.cpu_rate_limit|default(0)}}, dirty_rate_limit = {{data.dirty_rate_limit|default(0)}};
{% endif %}
