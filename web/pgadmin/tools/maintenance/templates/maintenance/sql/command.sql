{% if data.op == "VACUUM" %}
VACUUM{% if data.vacuum_full %} FULL{% endif %}{% if data.vacuum_freeze %} FREEZE{% endif %}{% if data.vacuum_analyze %} ANALYZE{% endif %}{% if data.verbose %} VERBOSE{% endif %}{% if data.schema %} {{ conn|qtIdent(data.schema) }}.{{ conn|qtIdent(data.table) }}{% endif %};
{% endif %}
{% if data.op == "ANALYZE" %}
ANALYZE{% if data.verbose %} VERBOSE{% endif %}{% if data.schema %} {{ conn|qtIdent(data.schema, data.table) }}{% endif %};
{% endif %}
{% if data.op == "REINDEX" %}
{% if index_name %}
REINDEX INDEX {{ conn|qtIdent(data.schema, index_name) }};
{% else %}
REINDEX{% if not data.schema %} DATABASE {{ conn|qtIdent(data.database) }}{% else %} TABLE {{ conn|qtIdent(data.schema, data.table) }}{% endif %};
{% endif %}
{% endif %}
{% if data.op == "CLUSTER" %}
CLUSTER{% if data.verbose %} VERBOSE {% endif %}{% if data.schema %} {{ conn|qtIdent(data.schema, data.table) }}{% endif %}{% if index_name %}
 USING {{ conn|qtIdent(index_name) }}{% endif %};
{% endif %}
