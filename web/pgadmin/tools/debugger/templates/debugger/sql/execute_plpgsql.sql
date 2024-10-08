{### Create executer function for plpgsql function debugging ###}
{% if is_ppas_database and not is_func %}
    EXEC {{ func_name }} (
{% elif not is_func %}
    CALL {{ func_name }} (
{% elif ret_type == 'record' %}
    SELECT {{ func_name }} (
{% else %}
    SELECT * FROM {{ func_name }} ({% endif %}
{% if data %}
{% for dict_item in data %}
{% if 'type' in dict_item and 'value' in dict_item %}
{% if ('NULL:' not in dict_item['value']|string and dict_item['value'] != 'NULL' and '[]' not in dict_item['type']) %}
{{ dict_item['value']|qtLiteral(conn) }}::{{ dict_item['type'] }}{% if dict_item['type'] == 'character' %}({{ dict_item['value']|length }}){% endif %}{% if not loop.last %}, {% endif %}
{% elif dict_item['value'] == 'NULL' or 'NULL:' in dict_item['value'] %}
{{ dict_item['value'] }}::{{ dict_item['type'] }}{% if dict_item['type'] == 'character' %}({{ dict_item['value']|length }}){% endif %}{% if not loop.last %}, {% endif %}
{% else %}
{% if '[]' in dict_item['type'] %}
 ARRAY[
{% for dict_list in dict_item['value'] %}
{% if 'value' in dict_list %}
{{ dict_list['value']|qtLiteral(conn) }}{% if not loop.last %}, {% endif %}
{% endif %}
{% endfor %}
]::{{ dict_item['type'] }}{% if dict_item['type'] == 'character' %}({{ dict_item['value']|length }}){% endif %}

{% else %} {{ dict_item['value'] }}::{{ dict_item['type'] }}{% if dict_item['type'] == 'character' %}({{ dict_item['value']|length }}){% endif %}
{% endif %} {% if not loop.last %}, {% endif %}
{% endif %}
{% endif %}
{% endfor %}
{% endif %}
)
