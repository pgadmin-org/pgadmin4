ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    ADD{% if data.name %} CONSTRAINT {{ conn|qtIdent(data.name) }}{% endif%} {{constraint_name}} {% if data.index %}USING INDEX {{ conn|qtIdent(data.index) }}{% else %}
({% for columnobj in data.columns %}{% if loop.index != 1 %}
, {% endif %}{{ conn|qtIdent(columnobj.column)}}{% endfor %}){% if data.include|length > 0 %}

    INCLUDE ({% for col in data.include %}{% if loop.index != 1 %}, {% endif %}{{conn|qtIdent(col)}}{% endfor %}){% endif %}
{% if data.fillfactor %}

    WITH (FILLFACTOR={{data.fillfactor}}){% endif %}{% if data.spcname and data.spcname != "pg_default" %}

    USING INDEX TABLESPACE {{ conn|qtIdent(data.spcname) }}{% endif %}{% endif %}{% if data.condeferrable %}

    DEFERRABLE{% if data.condeferred %}
 INITIALLY DEFERRED{% endif%}
{% endif -%};
{% if data.comment and data.name %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}
