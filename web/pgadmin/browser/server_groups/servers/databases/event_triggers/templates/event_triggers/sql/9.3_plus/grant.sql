{% import 'macros/security.macros' as SECLABEL %}
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
{% if data.seclabels and data.seclabels|length > 0 %}

{% for r in data.seclabels %}
{{ SECLABEL.APPLY(conn, 'EVENT TRIGGER', data.name, r.provider, r.label) }}
{% endfor %}{% endif %}

ALTER EVENT TRIGGER {{ conn|qtIdent(data.name) }}
    OWNER TO {{data.eventowner}};
{% endif %}