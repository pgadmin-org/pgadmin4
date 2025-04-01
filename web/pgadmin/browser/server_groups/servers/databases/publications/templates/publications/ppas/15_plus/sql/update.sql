{% if data.evnt_delete or data.evnt_update or data.evnt_truncate %}
{% set add_comma_after_insert = 'insert' %}
{% endif %}
{% if data.evnt_truncate %}
{% set add_comma_after_delete = 'delete' %}
{% endif %}
{% if data.evnt_delete or data.evnt_truncate%}
{% set add_comma_after_update = 'update' %}
{% endif %}
{###  Alter publication owner ###}
{% if data.pubowner %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }}
    OWNER TO {{ conn|qtIdent(data.pubowner) }};

{% endif %}
{###  Alter publication event ###}
{% if (data.evnt_insert is defined and data.evnt_insert != o_data.evnt_insert) or (data.evnt_update is defined and data.evnt_update != o_data.evnt_update) or (data.evnt_delete is defined and data.evnt_delete != o_data.evnt_delete) or (data.evnt_truncate is defined and data.evnt_truncate != o_data.evnt_truncate) %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }} SET
    (publish = '{% if data.evnt_insert %}insert{% if add_comma_after_insert == 'insert' %}, {% endif %}{% endif %}{% if data.evnt_update %}update{% if add_comma_after_update == 'update' %}, {% endif %}{% endif %}{% if data.evnt_delete %}delete{% if add_comma_after_delete == 'delete' %}, {% endif %}{% endif %}{% if data.evnt_truncate %}truncate{% endif %}');

{% endif %}
{###  Alter publication partition root ###}
{% if data.publish_via_partition_root is defined and data.publish_via_partition_root != o_data.publish_via_partition_root%}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }} SET
    (publish_via_partition_root = {{ data.publish_via_partition_root|lower }});

{% endif %}
{###  Alter drop publication table ###}
{% if drop_table %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }}
    DROP TABLE {% if data.only_table%}ONLY {% endif %}{% for pub_table in drop_table_data %}{% if loop.index != 1 %}, {% endif %}{{ pub_table['table_name'] or pub_table }}{% endfor %};

{% endif %}

{###  Alter drop publication schema ###}
{% if drop_schema %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }}
    DROP TABLES IN SCHEMA {% for pub_schema in drop_schema_data %}{% if loop.index != 1 %}, {% endif %}{{ pub_schema }}{% endfor %};

{% endif %}

{###  Alter update publication table ###}
{% if update_table %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }}
    SET TABLE {% for pub_table in update_table_data %}{% if loop.index != 1 %}, TABLE {% endif %}{{ pub_table['table_name'] or pub_table }}{% if pub_table['columns'] %} ({% for column in pub_table['columns'] %}{% if loop.index != 1 %}, {% endif %}{{ column }}{% endfor %}){% endif %}{% if pub_table['where'] %} WHERE ({{pub_table['where']}}){% endif %}{% endfor %};

{% endif %}

{###  Alter publication table ###}
{% if add_table %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }}
    ADD TABLE {% if data.only_table%}ONLY {% endif %}{% for pub_table in add_table_data %}{% if loop.index != 1 %}, {% endif %}{{ pub_table['table_name'] or pub_table }}{% if pub_table['columns'] %} ({% for column in pub_table['columns'] %}{% if loop.index != 1 %}, {% endif %}{{ column }}{% endfor %}){% endif %}{% if pub_table['where'] %} WHERE ({{pub_table['where']}}){% endif %}{% endfor %};

{% endif %}

{###  Alter add publication schema ###}
{% if add_schema %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }}
    ADD TABLES IN SCHEMA {% for pub_schema in add_schema_data %}{% if loop.index != 1 %}, {% endif %}{{ pub_schema }}{% endfor %};

{% endif %}

{###  Alter publication name ###}
{% if data.name != o_data.name %}
ALTER PUBLICATION {{ conn|qtIdent(o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}