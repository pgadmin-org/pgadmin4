{# ============= Get the publication name using oid ============= #}
{% if pbid %}
SELECT pubname FROM pg_catalog.pg_publication WHERE oid = {{pbid}}::oid;
{% endif %}
{# ============= Drop the publication ============= #}
{% if pname %}
DROP PUBLICATION IF EXISTS {{ conn|qtIdent(pname) }}{% if cascade %} CASCADE{% endif%};
{% endif %}
