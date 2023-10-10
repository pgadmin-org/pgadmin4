{% import 'macros/variable.macros' as VARIABLE %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
{###  Add column ###}
{% if data.name and  data.cltype %}
ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ADD COLUMN {{conn|qtIdent(data.name)}} {% if is_sql %}{{data.displaytypname}}{% else %}{{ GET_TYPE.CREATE_TYPE_SQL(conn, data.cltype, data.attlen, data.attprecision, data.hasSqrBracket) }}{% endif %}
{###  Add coloptions to column ###}
{% if data.coloptions %}{% for o in data.coloptions %}{% if o.option is defined and o.value is defined %}{% if loop.first %}
 OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral(conn)}}{% if loop.last %}){% endif %}{% endif %}{% endfor %}{% endif %}{% if data.collspcname %}
 COLLATE {{data.collspcname}}{% endif %}{% if data.attnotnull %}
 NOT NULL{% endif %}{% if data.defval is defined and data.defval is not none and data.defval != '' and data.colconstype != 'g' %}
 DEFAULT {{data.defval}}{% endif %}{% if data.colconstype == 'g' and data.genexpr and data.genexpr != '' %}
 GENERATED ALWAYS AS ({{data.genexpr}}) STORED{% endif %}{% endif %};
{###  Add comments ###}
{% if data and data.description and data.description != None %}

COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.table, data.name)}}
    IS {{data.description|qtLiteral(conn)}};
{% endif %}
{###  Add variables to column ###}
{% if data.attoptions %}

ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, data.attoptions) }}
{% endif %}
{###  Alter column statistics value ###}
{% if data.attstattarget is defined and data.attstattarget > -1 %}

ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtTypeIdent(data.name)}} SET STATISTICS {{data.attstattarget}};
{% endif %}
{###  Alter column storage value ###}
{% if data.attstorage is defined and data.attstorage != data.defaultstorage %}

ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtTypeIdent(data.name)}} SET STORAGE {%if data.attstorage == 'p' %}
PLAIN{% elif data.attstorage == 'm'%}MAIN{% elif data.attstorage == 'e'%}
EXTERNAL{% elif data.attstorage == 'x'%}EXTENDED{% endif %};
{% endif %}
