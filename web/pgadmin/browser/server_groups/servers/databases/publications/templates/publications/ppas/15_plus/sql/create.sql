{% if data.evnt_delete or data.evnt_update or data.evnt_truncate %}
{% set add_comma_after_insert = 'insert' %}
{% endif %}
{% if data.evnt_truncate %}
{% set add_comma_after_delete = 'delete' %}
{% endif %}
{% if data.evnt_delete or data.evnt_truncate%}
{% set add_comma_after_update = 'update' %}
{% endif %}
{% if data.publish_via_partition_root%}
{% set add_comma_after_truncate = 'truncate' %}
{% endif %}
{###  Create PUBLICATION ###}
CREATE PUBLICATION {{ conn|qtIdent(data.name) }}
{% if data.all_table %}
    FOR ALL TABLES
{% elif data.pubtable or data.pubschema %}
    FOR {% if data.pubtable %}TABLE {% if data.only_table%}ONLY {% endif %}{% for pub_table in data.pubtable %}{% if loop.index != 1 %}, {% endif %}{{pub_table['table_name']}}{% if pub_table['columns'] %} ({% for column in pub_table['columns'] %}{% if loop.index != 1 %}, {% endif %}{{column}}{% endfor %}){% endif %}{% if pub_table['where'] %} WHERE ({{pub_table['where']}}){% endif %}{% endfor %}{% endif %}{% if data.pubtable and data.pubschema %},{% endif %}
{% if data.pubschema %}
 TABLES IN SCHEMA {% for pub_schema in data.pubschema %}{% if loop.index != 1 %}, {% endif %}{{ pub_schema }}{% endfor %}
{% endif %}

{% endif %}
{% if data.evnt_insert or data.evnt_update or data.evnt_delete or data.evnt_truncate %}
    WITH (publish = '{% if data.evnt_insert %}insert{% if add_comma_after_insert == 'insert' %}, {% endif %}{% endif %}{% if data.evnt_update %}update{% if add_comma_after_update == 'update' %}, {% endif %}{% endif %}{% if data.evnt_delete %}delete{% if add_comma_after_delete == 'delete' %}, {% endif %}{% endif %}{% if data.evnt_truncate %}truncate{% endif %}', publish_via_partition_root = {{ data.publish_via_partition_root|lower }});
{% endif %}
