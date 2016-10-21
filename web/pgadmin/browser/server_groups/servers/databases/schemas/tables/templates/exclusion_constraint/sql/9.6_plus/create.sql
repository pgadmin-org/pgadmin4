ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    ADD{% if data.name %} CONSTRAINT {{ conn|qtIdent(data.name) }}{% endif%} EXCLUDE {% if data.amname and data.amname != '' %}USING {{data.amname}}{% endif %} (
    {% for col in data.columns %}{% if loop.index != 1 %},
    {% endif %}{{ conn|qtIdent(col.column)}} {% if col.oper_class and col.oper_class != '' %}{{col.oper_class}} {% endif%}{% if col.order %}ASC{% else %}DESC{% endif %} NULLS {% if col.nulls_order %}FIRST{% else %}LAST{% endif %} WITH {{col.operator}}{% endfor %}){% if data.fillfactor %}
    WITH (FILLFACTOR={{data.fillfactor}}){% endif %}{% if data.spcname and data.spcname != "pg_default" %}

    USING INDEX TABLESPACE {{ conn|qtIdent(data.spcname) }}{% endif %}
{% if data.condeferrable %}

    DEFERRABLE{% if data.condeferred %}
 INITIALLY DEFERRED{% endif%}
{% endif%}{% if data.constraint %} WHERE ({{data.constraint}}){% endif%};
{% if data.comment and data.name %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}