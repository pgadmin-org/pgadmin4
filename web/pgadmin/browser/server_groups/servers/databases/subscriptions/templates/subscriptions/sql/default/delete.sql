{# ============= Get the subscription name using oid ============= #}
{% if subid %}
    SELECT subname FROM pg_catalog.pg_subscription WHERE oid = {{subid}}::oid;
{% endif %}
{# ============= Drop the language ============= #}
{% if subname %}
DROP SUBSCRIPTION {{ conn|qtIdent(subname) }}{% if cascade %} CASCADE{% endif%};
{% endif %}
