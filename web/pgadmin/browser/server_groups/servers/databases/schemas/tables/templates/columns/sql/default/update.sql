{% import 'columns/macros/security.macros' as SECLABEL %}
{% import 'columns/macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
{###  Rename column name ###}
{% if data.name and data.name != o_data.name %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    RENAME {{conn|qtIdent(o_data.name)}} TO {{conn|qtIdent(data.name)}};

{% endif %}
{###  Alter column type and collation ###}
{% if (data.cltype and data.cltype != o_data.cltype) or (data.geometry is defined and data.geometry != o_data.geometry) or (data.srid is defined and data.srid != o_data.srid) or (data.attlen is defined and data.attlen != o_data.attlen) or (data.attprecision is defined and data.attprecision != o_data.attprecision) or (data.collspcname and data.collspcname != o_data.collspcname) or data.col_type_conversion is defined %}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %}
-- WARNING:
-- The SQL statement below would normally be used to alter the datatype for the {{o_data.name}} column, however,
-- the current datatype cannot be cast to the target datatype so this conversion cannot be made automatically.

{% endif %}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %} -- {% endif %}ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %} -- {% endif %}    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} TYPE {{ GET_TYPE.UPDATE_TYPE_SQL(conn, data, o_data) }}{% if data.collspcname and data.collspcname != o_data.collspcname and data.cltype != '"char"' %}
 COLLATE {{data.collspcname}}{% elif o_data.collspcname and data.cltype != '"char"' %} COLLATE {{o_data.collspcname}}{% endif %};
{% endif %}
{###  Create the sequence a column becoming SERIAL needs, before its default below can reference it (#10292). IF NOT EXISTS is deliberately not used here: it would silently skip an existing, unrelated relation of the same name (without checking it is even a sequence), and the unconditional ALTER SEQUENCE ... OWNED BY below would then reassign ownership of that unrelated object instead of failing loudly (#10318). ###}
{% if data.serial_seq_create is defined %}
CREATE SEQUENCE {{data.serial_seq_create.name}} AS {{data.serial_seq_create.data_type}}{% if data.serial_seq_create.cycled %}

    CYCLE{% endif %}{% if data.serial_seq_create.increment is not none %}

    INCREMENT {{data.serial_seq_create.increment|int}}{% endif %}{% if data.serial_seq_create.start is not none %}

    START {{data.serial_seq_create.start|int}}{% endif %}{% if data.serial_seq_create.minimum is not none %}

    MINVALUE {{data.serial_seq_create.minimum|int}}{% endif %}{% if data.serial_seq_create.maximum is not none %}

    MAXVALUE {{data.serial_seq_create.maximum|int}}{% endif %}{% if data.serial_seq_create.cache is not none %}

    CACHE {{data.serial_seq_create.cache|int}}{% endif %};

ALTER SEQUENCE {{data.serial_seq_create.name}}
    OWNED BY {{conn|qtIdent(data.schema)}}.{{conn|qtIdent(data.table)}}.{% if data.name %}{{conn|qtIdent(data.name)}}{% else %}{{conn|qtIdent(o_data.name)}}{% endif %};

{###  Move the new sequence past any values the column already holds, or the next insert omitting the column would reuse one of them; a column that is empty, or holds nothing at or past START, leaves the sequence at its START (setval() below START would also go backwards, or out of bounds below MINVALUE) ###}
{% set serial_desc = data.serial_seq_create.increment is not none and data.serial_seq_create.increment|int < 0 %}
{% set serial_last = ('MIN(' if serial_desc else 'MAX(') ~ conn|qtIdent(data.name or o_data.name) ~ ')' %}
SELECT setval({{data.serial_seq_create.name|qtLiteral(conn)}}, {{serial_last}})
    FROM {{conn|qtIdent(data.schema, data.table)}}
    HAVING {{serial_last}} IS NOT NULL{% if data.serial_seq_create.start is not none %}

        AND {{serial_last}} {{ '<=' if serial_desc else '>=' }} {{data.serial_seq_create.start|int}}{% endif %};

{% endif %}
{###  Alter column default value ###}
{% if is_view_only and data.defval is defined and data.defval is not none and data.defval != '' and data.defval != o_data.defval %}
ALTER VIEW {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET DEFAULT {{data.defval}};

{% elif data.defval is defined and data.defval is not none and data.defval != '' and data.defval != o_data.defval %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET DEFAULT {{data.defval}};

{% endif %}
{###  Drop column default value ###}
{% if data.defval is defined and (data.defval == '' or data.defval is none) and data.defval != o_data.defval %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} DROP DEFAULT;

{% endif %}
{###  Drop the now-unused sequence a column stops owning by leaving SERIAL; the DEFAULT above must already be gone, or PostgreSQL refuses to drop a sequence still referenced by it (#10292) ###}
{% if data.serial_seq_drop is defined %}
DROP SEQUENCE IF EXISTS {{data.serial_seq_drop}};

{% endif %}
{###  Alter column not null value ###}
{% if 'attnotnull' in data and data.attnotnull != o_data.attnotnull %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} {% if data.attnotnull %}SET{% else %}DROP{% endif %} NOT NULL;

{% endif %}
{###  Only options that differ from the column as it stands: Schema Diff passes every option of a changed column, and a needless RESTART would rewind the identity sequence (#10422) ###}
{% set seqcycle_changed = (data.seqcycle and not o_data.seqcycle) or (data.seqcycle == False and o_data.seqcycle) %}
{% set seqincrement_changed = data.seqincrement is defined and data.seqincrement is not none and data.seqincrement != '' and data.seqincrement|int != o_data.seqincrement|int(none) %}
{% set seqstart_changed = data.seqstart is defined and data.seqstart is not none and data.seqstart != '' and data.seqstart|int != o_data.seqstart|int(none) %}
{% set seqmin_changed = data.seqmin is defined and data.seqmin is not none and data.seqmin != '' and data.seqmin|int != o_data.seqmin|int(none) %}
{% set seqmax_changed = data.seqmax is defined and data.seqmax is not none and data.seqmax != '' and data.seqmax|int != o_data.seqmax|int(none) %}
{% set seqcache_changed = data.seqcache is defined and data.seqcache is not none and data.seqcache != '' and data.seqcache|int != o_data.seqcache|int(none) %}
{% set attidentity_params = seqcycle_changed or seqincrement_changed or seqstart_changed or seqmin_changed or seqmax_changed or seqcache_changed %}
{###  Alter column - add identity ###}
{% if data.colconstype == 'i' and 'attidentity' in data and o_data.attidentity == '' and data.attidentity != o_data.attidentity %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} {% if data.attidentity == 'a' %}ADD GENERATED ALWAYS AS IDENTITY{% else%}ADD GENERATED BY DEFAULT AS IDENTITY{% endif %}
{% if data.seqincrement or data.seqcycle or data.seqincrement or data.seqstart or data.seqmin or data.seqmax or data.seqcache %} ( {% endif %}
{% if data.seqcycle is defined and data.seqcycle %}
CYCLE {% endif %}{% if data.seqincrement is defined and data.seqincrement is not none and data.seqincrement != '' %}
INCREMENT {{data.seqincrement|int}} {% endif %}{% if data.seqstart is defined and data.seqstart is not none and data.seqstart != ''%}
START {{data.seqstart|int}} {% endif %}{% if data.seqmin is defined and data.seqmin is not none and data.seqmin != ''%}
MINVALUE {{data.seqmin|int}} {% endif %}{% if data.seqmax is defined and data.seqmax is not none and data.seqmax != ''%}
MAXVALUE {{data.seqmax|int}} {% endif %}{% if data.seqcache is defined and data.seqcache is not none and data.seqcache != ''%}
CACHE {{data.seqcache|int}} {% endif %}
{% if data.seqincrement or data.seqcycle or data.seqincrement or data.seqstart or data.seqmin or data.seqmax or data.seqcache %}){% endif %};

{###  Alter column - change identity - sequence options ###}
{% elif 'attidentity' in data or attidentity_params %}
{% if 'attidentity' in data and data.attidentity != '' and o_data.attidentity != '' and data.attidentity != o_data.attidentity %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET GENERATED {% if data.attidentity == 'a' %}ALWAYS{% else%}BY DEFAULT{% endif %}{% if not attidentity_params %};{% endif %}
{% elif attidentity_params %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %}{% endif %}
{% if seqcycle_changed %}{% if data.seqcycle %} SET CYCLE{% else %} SET NO CYCLE{% endif %}{% endif %}
{% if seqincrement_changed %} SET INCREMENT {{data.seqincrement|int}}{% endif %}
{###  A new START only RESTARTs the sequence when it is still at its old START with nothing generated since, or when its position would fall outside the new MINVALUE/MAXVALUE; otherwise RESTART would rewind it below rows already generated. seqlastvalue is the pending value when seqiscalled is false (#10550) ###}
{% set new_seqmin = data.seqmin if seqmin_changed else o_data.seqmin %}
{% set new_seqmax = data.seqmax if seqmax_changed else o_data.seqmax %}
{% set seqlastvalue_out_of_range = o_data.seqlastvalue is not none and ((new_seqmin is not none and o_data.seqlastvalue|int < new_seqmin|int) or (new_seqmax is not none and o_data.seqlastvalue|int > new_seqmax|int)) %}
{% set seq_at_start = o_data.seqiscalled == False and o_data.seqlastvalue is not none and o_data.seqlastvalue|int == o_data.seqstart|int %}
{% if seqstart_changed %} {% if seq_at_start or seqlastvalue_out_of_range %}RESTART {% endif %}SET START {{data.seqstart|int}}{% endif %}
{% if seqmin_changed %} SET MINVALUE {{data.seqmin|int}}{% endif %}
{% if seqmax_changed %} SET MAXVALUE {{data.seqmax|int}}{% endif %}
{% if seqcache_changed %} SET CACHE {{data.seqcache|int}}{% endif %}{% if attidentity_params %};{% endif %}


{% endif %}
{###  Alter column - drop identity when column constraint is changed###}
{% if 'colconstype' in data and data.colconstype == 'n' and 'colconstype' in o_data and o_data.colconstype == 'i' %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} DROP IDENTITY;

{% endif %}
{###  Alter column statistics value ###}
{% if data.attstattarget is defined and data.attstattarget != o_data.attstattarget %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STATISTICS {{data.attstattarget}};

{% endif %}
{###  Alter column storage value ###}
{% if data.attstorage is defined and data.attstorage != o_data.attstorage %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STORAGE {%if data.attstorage == 'p' %}
PLAIN{% elif data.attstorage == 'm'%}MAIN{% elif data.attstorage == 'e'%}
EXTERNAL{% elif data.attstorage == 'x'%}EXTENDED{% endif %};

{% endif %}
{###  Alter column compression value ###}
{% if data.attcompression is defined and data.attcompression is not none and data.attcompression != '' %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET COMPRESSION {{data.attcompression}};

{% endif %}
{% if data.description is defined and data.description != None and data.description != o_data.description %}
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
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.UNSET(conn, 'COLUMN', data.name, variables.deleted) }}
{% else %}
    {{ VARIABLE.UNSET(conn, 'COLUMN', o_data.name, variables.deleted) }}
{% endif %}
{% endif %}
{% if 'added' in variables and variables.added|length > 0 %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.added) }}
{% else %}
    {{ VARIABLE.SET(conn, 'COLUMN', o_data.name, variables.added) }}
{% endif %}
{% endif %}
{% if 'changed' in variables and variables.changed|length > 0 %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.changed) }}
{% else %}
    {{ VARIABLE.SET(conn, 'COLUMN', o_data.name, variables.changed) }}
{% endif %}
{% endif %}
{% endif %}
{### Update column privileges ###}
{# Change the privileges #}
{% if data.attacl %}
{% if 'deleted' in data.attacl %}
{% for priv in data.attacl.deleted %}
{% if data.name %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.grantee) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, o_data.name, priv.grantee) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'changed' in data.attacl %}
{% for priv in data.attacl.changed %}
{% set is_grantee_changed = (priv.grantee != priv.old_grantee) %}
{% if data.name %}
{% if is_grantee_changed %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.old_grantee) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.grantee) }}
{% endif %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% else %}
{% if is_grantee_changed %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, o_data.name, priv.old_grantee) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, o_data.name, priv.grantee) }}
{% endif %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, o_data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'added' in data.attacl %}
{% for priv in data.attacl.added %}
{% if data.name %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% else %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, o_data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endif %}
{% endfor %}
{% endif %}
{% endif %}
{### Uppdate tablespace securitylabel ###}
{# The SQL generated below will change Security Label #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{% if data.name %}
{{ SECLABEL.DROP(conn, 'COLUMN', data.schema, data.table, data.name, r.provider) }}
{% else %}
{{ SECLABEL.DROP(conn, 'COLUMN', data.schema, data.table, o_data.name, r.provider) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{% if data.name %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, data.name, r.provider, r.label) }}
{% else %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, o_data.name, r.provider, r.label) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{% if data.name %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, data.name, r.provider, r.label) }}
{% else %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, o_data.name, r.provider, r.label) }}
{% endif %}
{% endfor %}
{% endif %}
{% endif %}
