{% if table.rejectLimitType == 'r' %}
{% set rejectionLimit = 'ROWS' %}
{% else %}
{% set rejectionLimit = 'PERCENT' %}
{% endif %}
CREATE {% if table.writable %}WRITABLE {% endif %}EXTERNAL {% if table.isWeb %}WEB {% endif %}TABLE {{conn|qtIdent(table.namespace, table.name)}}{% if table.columns and table.columns|length > 0 %}(
{% for c in table.columns %}
{%  if c.name and c.type -%}
{%    if loop.index != 1 %},
{%    endif %}
    {{conn|qtIdent(c.name)}} {{c.type}}
{%-  endif %}
{% endfor %}
)
{% else %}
()
{% endif %}
{% if table.command and table.command|length > 0 %}
EXECUTE $pgAdmin${{ table.command }}'$pgAdmin$
{% else %}
LOCATION (
{% for uri in table.uris %}
{%  if loop.index != 1 -%},
{%  endif %}
    '{{uri}}'
{%- endfor %}
)
{% endif %}
{% if not table.writable and table.executionLocation %}
{% if table.executionLocation.type == 'host' %}
ON HOST {{ table.executionLocation.value }}
{% elif table.executionLocation.type == 'per_host' %}
ON HOST
{% elif table.executionLocation.type == 'master_only' %}
ON MASTER
{% elif table.executionLocation.type == 'all_segments' %}
ON ALL
{% elif table.executionLocation.type == 'segment' %}
ON SEGMENT {{ table.executionLocation.value }}
{% elif table.executionLocation.type == 'segments' %}
ON {{ table.executionLocation.value }}
{% endif %}
{% endif %}
FORMAT '{{ table.formatType }}' ({{ table.formatOptions }})
{% if table.options and table.options|length > 0 %}
OPTIONS (
{{ table.options }}
)
{% endif %}
ENCODING '{{ table.pgEncodingToChar }}'
{% if table.rejectLimit and table.rejectLimit > 0 %}
{%   if table.errorTableName and table.errorTableName|length > 0 %}
LOG ERRORS {% endif %}SEGMENT REJECT LIMIT {{ table.rejectLimit }} {{ rejectionLimit }}
{% endif %}
{% if table.writable and table.distribution %}
DISTRIBUTED BY ({% for attrnum in table.distribution %}{% if loop.index != 1 %}, {% endif %}{{ table.columns[attrnum-1].name }}{% endfor %});
{% elif table.writable %}
DISTRIBUTED RANDOMLY;
{% else %};
{% endif %}
