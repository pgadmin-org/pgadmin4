{% if data.autoindex %}
CREATE INDEX {{ conn|qtIdent(data.coveringindex) }}
    ON {{ conn|qtIdent(data.schema, data.table) }}({% for columnobj in data.columns %}{% if loop.index != 1 %}
, {% endif %}{{ conn|qtIdent(columnobj.local_column)}}{% endfor %});
{% endif %}