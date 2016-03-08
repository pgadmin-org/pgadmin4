{% if data.name %}
CREATE SCHEMA {{ conn|qtIdent(data.name) }}{% if data.namespaceowner %}

    AUTHORIZATION {{ conn|qtIdent(data.namespaceowner) }}{% endif %};
{% else %}
{{ -- _('Incomplete definition') }}
{% endif %}
