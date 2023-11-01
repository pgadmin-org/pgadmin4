{% import 'macros/variable.macros' as VARIABLE %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
{###  Rename column name ###}
{% if data.name and data.name != o_data.name %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    RENAME {{conn|qtIdent(o_data.name)}} TO {{conn|qtIdent(data.name)}};

{% endif %}
{### Add/Update column options ###}
{% if 'coloptions' in data and data.coloptions != None and data.coloptions|length > 0 %}
{% set coloptions = data.coloptions %}
{% if data.name %}
{% set colname = data.name %}
{% else %}
{% set colname = o_data.name %}
{% endif %}
{% if 'added' in coloptions and coloptions.added|length > 0 %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(colname)}} OPTIONS (ADD {% for opt in coloptions.added %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(opt.option) }} {{ opt.value|qtLiteral(conn) }}{% endfor %});
{% endif %}
{% if 'changed' in coloptions and coloptions.changed|length > 0 %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(colname)}} OPTIONS (SET {% for opt in coloptions.changed %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(opt.option) }} {{ opt.value|qtLiteral(conn) }}{% endfor %});
{% endif %}
{% if 'deleted' in coloptions and coloptions.deleted|length > 0 %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(colname)}} OPTIONS (DROP {% for opt in coloptions.deleted %}{% if loop.index != 1 %}, {% endif %}{{ conn|qtIdent(opt.option) }}{% endfor %});
{% endif %}
{% endif %}
{###  Alter column type and collation ###}
{% if (data.cltype and data.cltype != o_data.cltype) or (data.attlen is defined and data.attlen != o_data.attlen) or (data.attprecision is defined and data.attprecision != o_data.attprecision) or (data.collspcname and data.collspcname != o_data.collspcname) or data.col_type_conversion is defined %}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %}
-- WARNING:
-- The SQL statement below would normally be used to alter the cltype for the {{o_data.name}} column, however,
-- the current datatype cannot be cast to the target cltype so this conversion cannot be made automatically.
{% endif %}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %} -- {% endif %}ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %} -- {% endif %}    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} TYPE {{ GET_TYPE.UPDATE_TYPE_SQL(conn, data, o_data) }}{% if data.collspcname and data.collspcname != o_data.collspcname %}
 COLLATE {{data.collspcname}}{% elif o_data.collspcname %} COLLATE {{o_data.collspcname}}{% endif %};

{% endif %}
{###  Alter column default value ###}
{% if is_view_only and data.defval is defined and data.defval is not none and data.defval != '' and data.defval != o_data.defval %}
ALTER VIEW {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET DEFAULT {{data.defval}};
{% elif data.defval is defined and data.defval is not none and data.defval != '' and data.defval != o_data.defval %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET DEFAULT {{data.defval}};

{% endif %}
{###  Drop column default value ###}
{% if data.defval is defined and (data.defval == '' or data.defval is none) and data.defval != o_data.defval %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} DROP DEFAULT;

{% endif %}
{###  Alter column not null value ###}
{% if 'attnotnull' in data and data.attnotnull != o_data.attnotnull %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} {% if data.attnotnull %}SET{% else %}DROP{% endif %} NOT NULL;

{% endif %}
{###  Alter column statistics value ###}
{% if data.attstattarget is defined and data.attstattarget != o_data.attstattarget %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STATISTICS {{data.attstattarget}};

{% endif %}
{###  Alter column storage value ###}
{% if data.attstorage is defined and data.attstorage != o_data.attstorage %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STORAGE {%if data.attstorage == 'p' %}
PLAIN{% elif data.attstorage == 'm'%}MAIN{% elif data.attstorage == 'e'%}
EXTERNAL{% elif data.attstorage == 'x'%}EXTENDED{% endif %};

{% endif %}
{% if data.description is defined and data.description != None %}
{% if data.name %}
COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.table, data.name)}}
{% else %}
COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.table, o_data.name)}}
{% endif %}
    IS {{data.description|qtLiteral(conn)}};

{% endif %}
{### Update column variables ###}
{% if 'attoptions' in data and data.attoptions != None and data.attoptions|length > 0 %}
{% set variables = data.attoptions %}
{% if 'deleted' in variables and variables.deleted|length > 0 %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.UNSET(conn, 'COLUMN', data.name, variables.deleted) }}
{% else %}
    {{ VARIABLE.UNSET(conn, 'COLUMN', o_data.name, variables.deleted) }}
{% endif %}
{% endif %}
{% if 'added' in variables and variables.added|length > 0 %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.added) }}
{% else %}
    {{ VARIABLE.SET(conn, 'COLUMN', o_data.name, variables.added) }}
{% endif %}
{% endif %}
{% if 'changed' in variables and variables.changed|length > 0 %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.changed) }}
{% else %}
    {{ VARIABLE.SET(conn, 'COLUMN', o_data.name, variables.changed) }}
{% endif %}
{% endif %}
{% endif %}
