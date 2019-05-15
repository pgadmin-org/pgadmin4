{#= Refresh materialized view ===#}
REFRESH MATERIALIZED VIEW {{ conn|qtIdent(nspname, name) }} WITH {% if not with_data %} NO {% endif %}DATA;
