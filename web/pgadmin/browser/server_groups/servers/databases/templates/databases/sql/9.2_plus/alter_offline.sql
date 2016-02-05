{% if data %}
{% if action == "rename_database" and data.old_name != data.name %}
ALTER DATABASE {{ conn|qtIdent(data.old_name) }} RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}{% if action == "tablespace" and  data.spcname %}

ALTER DATABASE {{ conn|qtIdent(data.name) }} SET TABLESPACE {{ conn|qtIdent(data.spcname) }};
{% endif %}
{% endif %}