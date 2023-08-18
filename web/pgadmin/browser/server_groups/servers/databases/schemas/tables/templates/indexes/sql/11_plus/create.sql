CREATE{% if data.indisunique %} UNIQUE{% endif %} INDEX{% if add_not_exists_clause %} IF NOT EXISTS{% endif %}{% if data.isconcurrent %} CONCURRENTLY{% endif %}{% if data.name %} {{conn|qtIdent(data.name)}}{% endif %}

    ON {{conn|qtIdent(data.schema, data.table)}} {% if data.amname %}USING {{conn|qtIdent(data.amname)}}{% endif %}

{% if mode == 'create' %}
    ({% for c in data.columns %}{% if loop.index != 1 %}, {% endif %}{% if c.is_exp %}({{c.colname}}){% else %}{{conn|qtIdent(c.colname)}}{% endif %}{% if c.collspcname %} COLLATE {{c.collspcname}}{% endif %}{% if c.op_class %}
 {{c.op_class}}{% endif %}{% if data.amname is defined %}{% if c.sort_order is defined and c.is_sort_nulls_applicable %}{% if c.sort_order %} DESC{% else %} ASC{% endif %}{% endif %}{% if c.nulls is defined and c.is_sort_nulls_applicable %} NULLS {% if c.nulls %}
FIRST{% else %}LAST{% endif %}{% endif %}{% endif %}{% endfor %})
{% if data.include|length > 0 %}
    INCLUDE({% for col in data.include %}{% if loop.index != 1 %}, {% endif %}{{conn|qtIdent(col)}}{% endfor %})
{% endif %}
{% else %}
{## We will get indented data from postgres for column ##}
    ({% for c in data.columns %}{% if loop.index != 1 %}, {% endif %}{{c.colname}}{% if c.collspcname %} COLLATE {{c.collspcname}}{% endif %}{% if c.op_class %}
 {{c.op_class}}{% endif %}{% if c.sort_order is defined %}{% if c.sort_order %} DESC{% else %} ASC{% endif %}{% endif %}{% if c.nulls is defined %} NULLS {% if c.nulls %}
FIRST{% else %}LAST{% endif %}{% endif %}{% endfor %})
{% if data.include|length > 0 %}
    INCLUDE({% for col in data.include %}{% if loop.index != 1 %}, {% endif %}{{conn|qtIdent(col)}}{% endfor %})
{% endif %}
{% endif %}
{% if data.storage_parameters %}
    WITH ({% for key, value in data.storage_parameters.items() %}{% if loop.index != 1 %}, {% endif %}{{key}}={{value}}{% endfor %})
{% endif %}{% if data.spcname %}
    TABLESPACE {{conn|qtIdent(data.spcname)}}{% endif %}{% if data.indconstraint %}

    WHERE {{data.indconstraint}}{% endif %};
