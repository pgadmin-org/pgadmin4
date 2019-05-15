{#= Refresh materialized view =#}
REFRESH MATERIALIZED VIEW{% if is_concurrent %} CONCURRENTLY{% endif %} {{ conn|qtIdent(nspname, name) }} WITH {% if not with_data %}NO {% endif %}DATA;
