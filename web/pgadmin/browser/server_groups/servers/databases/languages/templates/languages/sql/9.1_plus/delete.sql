{# ============= Get the language name using oid ============= #}
{% if lid %}
    SELECT lanname FROM pg_language WHERE oid = {{lid}}::int;
{% endif %}
{# ============= Drop the language ============= #}
{% if lname %}
    DROP LANGUAGE {{ conn|qtIdent(lname) }} {% if cascade %}CASCADE{% endif%};
{% endif %}