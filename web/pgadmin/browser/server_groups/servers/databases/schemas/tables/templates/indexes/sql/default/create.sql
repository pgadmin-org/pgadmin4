CREATE {% if data.indisunique %}UNIQUE {% endif %}INDEX{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {% if data.isconcurrent %}CONCURRENTLY {% endif %}{{conn|qtIdent(data.name)}}
    ON {{conn|qtIdent(data.schema, data.table)}} {% if data.amname %}USING {{conn|qtIdent(data.amname)}}{% endif %}

{% if mode == 'create' %}
    ({% for c in data.columns %}{% if loop.index != 1 %}, {% endif %}{{conn|qtIdent(c.colname)}}{% if c.collspcname %} COLLATE {{c.collspcname}}{% endif %}{% if c.op_class %}
 {{c.op_class}}{% endif %}{% if data.amname is defined %}{% if c.sort_order is defined and c.is_sort_nulls_applicable %}{% if c.sort_order %} DESC{% else %} ASC{% endif %}{% endif %}{% if c.nulls is defined and c.is_sort_nulls_applicable %} NULLS {% if c.nulls %}
FIRST{% else %}LAST{% endif %}{% endif %}{% endif %}{% endfor %})
{% else %}
{## We will get indented data from postgres for column ##}
    ({% for c in data.columns %}{% if loop.index != 1 %}, {% endif %}{{c.colname}}{% if c.collspcname %} COLLATE {{c.collspcname}}{% endif %}{% if c.op_class %}
 {{c.op_class}}{% endif %}{% if c.sort_order is defined %}{% if c.sort_order %} DESC{% else %} ASC{% endif %}{% endif %}{% if c.nulls is defined %} NULLS {% if c.nulls %}
FIRST{% else %}LAST{% endif %}{% endif %}{% endfor %})
{% endif %}
{% if data.fillfactor %}
    WITH (FILLFACTOR={{data.fillfactor}})
{% endif %}{% if data.spcname %}
    TABLESPACE {{conn|qtIdent(data.spcname)}}{% endif %}{% if data.indconstraint %}

    WHERE {{data.indconstraint}}{% endif %};
