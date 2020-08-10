{% import 'macros/security.macros' as SECLABEL %}
{% if data %}
{% if (data.eventfunname and data.eventfunname != o_data.eventfunname) or
  (data.eventname and data.eventname != o_data.eventname) or
  (data.when and data.when != o_data.when) %}
-- WARNING:
-- We have found the difference in either of Trigger Function, Event or WHEN
-- so we need to drop the existing event trigger first and re-create it.
DROP EVENT TRIGGER IF EXISTS {{ conn|qtIdent(o_data.name) }};

CREATE EVENT TRIGGER {{ conn|qtIdent(data.name) if data.name else conn|qtIdent(o_data.name) }} ON {{ data.eventname if data.eventname else o_data.eventname }}
{% if data.when or o_data.when %}
    WHEN TAG IN ({{ data.when if data.when else o_data.when }})
{% endif %}
    EXECUTE PROCEDURE {{ data.eventfunname if data.eventfunname else o_data.eventfunname }}();
{% else %}

{% if data.name and data.name != o_data.name %}
ALTER EVENT TRIGGER {{ conn|qtIdent(o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}
{% endif %}

{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON EVENT TRIGGER {{ conn|qtIdent(data.name) }}
    IS '{{ data.comment }}';
{% endif %}

{% if data.enabled and data.enabled != o_data.enabled %}
ALTER EVENT TRIGGER {{ conn|qtIdent(data.name) }}
{% if data.enabled == "O" %}
    ENABLE;
{% elif data.enabled == "D" %}
   DISABLE;
{% elif data.enabled == "R" %}
    ENABLE REPLICA;
{% elif data.enabled == "A" %}
    ENABLE ALWAYS;
{% endif %}
{% endif %}
{% endif %}

{% if data.seclabels and
	data.seclabels|length > 0
%}{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}

{% for r in seclabels.deleted %}
{{ SECLABEL.DROP(conn, 'EVENT TRIGGER', data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}

{% for r in seclabels.added %}
{{ SECLABEL.APPLY(conn, 'EVENT TRIGGER', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}

{% for r in seclabels.changed %}
{{ SECLABEL.APPLY(conn, 'EVENT TRIGGER', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endif %}

{% if data.eventowner and data.eventowner != o_data.eventowner %}
ALTER EVENT TRIGGER {{ conn|qtIdent(data.name) }}
    OWNER TO {{data.eventowner}};
{% endif %}
