{% import 'macros/security.macros' as SECLABLE %}
{% if data %}
{# ==== To update catalog comments ==== #}
{% if data.description and data.description != o_data.description %}
COMMENT ON SCHEMA {{ conn|qtIdent(o_data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{# ==== To update catalog securitylabel ==== #}
{# The SQL generated below will change Security Label #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABLE.DROP(conn, 'SCHEMA', o_data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABLE.APPLY(conn, 'SCHEMA', o_data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABLE.APPLY(conn, 'SCHEMA', o_data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}

{% endif %}
{% endif %}
