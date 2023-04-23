{% import 'macros/security.macros' as SECLABEL %}
{% if data %}
{# ==== To update catalog comments ==== #}
{% if data.description and data.description != o_data.description %}
COMMENT ON SCHEMA {{ conn|qtIdent(o_data.name) }}
    IS {{ data.description|qtLiteral(conn) }};

{% endif %}
{# ==== To update catalog securitylabel ==== #}
{# The SQL generated below will change Security Label #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.DROP(conn, 'SCHEMA', o_data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABEL.APPLY(conn, 'SCHEMA', o_data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABEL.APPLY(conn, 'SCHEMA', o_data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}

{% endif %}
{% endif %}
