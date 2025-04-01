{#=== refresh mat view [concurrenlty] ===#}
{% if name and nspname %}
REFRESH MATERIALIZED VIEW {% if is_concurrent %}CONCURRENTLY{% endif %} {{ conn|qtIdent(nspname, name) }};
{% endif %}
