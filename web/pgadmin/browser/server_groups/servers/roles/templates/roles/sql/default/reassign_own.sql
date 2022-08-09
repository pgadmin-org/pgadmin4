{# ============= Get the role name using oid ============= #}
{% if rid %}
SELECT rolname FROM pg_catalog.pg_roles WHERE oid = {{rid}}::oid;
{% else %}
{# ============= Reassign/Drop own the role ============= #}
{% if data %}
{% if data.is_reassign %}
REASSIGN OWNED BY {{ conn|qtIdent(data.old_role_name) }} TO {% if data.new_role_name == "CURRENT_USER" or data.new_role_name == "SESSION_USER" or data.new_role_name == "CURRENT_ROLE" %}{{ data.new_role_name }}{% else %}{{ conn|qtIdent(data.new_role_name) }}{% endif%}
{% else %}
DROP OWNED BY {{ conn|qtIdent(data.old_role_name) }}{% if data.drop_with_cascade %} CASCADE{% endif%}
{% endif %}
{% endif %}
{% endif %}
