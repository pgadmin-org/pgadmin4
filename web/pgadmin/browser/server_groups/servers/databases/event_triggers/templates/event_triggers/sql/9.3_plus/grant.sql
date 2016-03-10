{% import 'macros/security.macros' as SECLABLE %}
{% if data %}
{% if data.enabled and data.enabled != "O" %}
ALTER EVENT TRIGGER {{ conn|qtIdent(data.name) }}
{% if data.enabled == "D" %}
    DISABLE;
{% elif data.enabled == "R" %}
    ENABLE REPLICA;
{% elif data.enabled == "A" %}
    ENABLE ALWAYS;
{% endif %}
{% endif %}

{% if data.comment %}
COMMENT ON EVENT TRIGGER {{ conn|qtIdent(data.name) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}
{% if data.providers and data.providers|length > 0 %}

{% for r in data.providers %}
{{ SECLABLE.APPLY(conn, 'EVENT TRIGGER', data.name, r.provider, r.securitylabel) }}
{% endfor %}{% endif %}

ALTER EVENT TRIGGER {{ conn|qtIdent(data.name) }}
    OWNER TO {{data.eventowner}};
{% endif %}