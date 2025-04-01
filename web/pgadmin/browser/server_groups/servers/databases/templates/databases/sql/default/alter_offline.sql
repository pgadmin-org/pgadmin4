{% if data %}
{% if action == "rename_database" %} {% if data.old_name != data.name %}
ALTER DATABASE {{ conn|qtIdent(data.old_name) }} RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}
{# Change the owner #}
{% if data.datowner %}
ALTER DATABASE {{ conn|qtIdent(data.name) }} OWNER TO {{ conn|qtIdent(data.datowner) }};
{% endif %}
{# Change the comments/description #}
{% if data.comments is defined %}
COMMENT ON DATABASE {{ conn|qtIdent(data.name) }}
    IS {{ data.comments|qtLiteral(conn) }};
{% endif %}
{# Change the connection limit #}
{% if data.datconnlimit %}
ALTER DATABASE {{ conn|qtIdent(data.name) }} WITH CONNECTION LIMIT = {{ data.datconnlimit }};
{% endif %}
{% endif %}{% if action == "tablespace" and  data.spcname %}

ALTER DATABASE {{ conn|qtIdent(data.name) }} SET TABLESPACE {{ conn|qtIdent(data.spcname) }};
{% endif %}
{% endif %}
