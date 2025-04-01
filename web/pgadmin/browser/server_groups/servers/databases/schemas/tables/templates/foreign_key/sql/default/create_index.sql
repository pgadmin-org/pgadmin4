{% if data.autoindex and data.coveringindex%}
CREATE INDEX IF NOT EXISTS {{ conn|qtIdent(data.coveringindex) }}
    ON {{ conn|qtIdent(data.schema, data.table) }}({% for columnobj in data.columns %}{% if loop.index != 1 %}
, {% endif %}{{ conn|qtIdent(columnobj.local_column)}}{% endfor %});
{% endif %}
