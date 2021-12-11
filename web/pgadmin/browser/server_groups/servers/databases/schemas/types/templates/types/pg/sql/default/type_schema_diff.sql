{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
-- WARNING:
-- We have found the difference in either of Type or SubType or Collation,
-- so we need to drop the existing type first and re-create it.
DROP TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }} CASCADE;

{## If user selected shell type then just create type template ##}
{% if data and data.typtype == 'p' %}
CREATE TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }};
{% endif %}
{###  Composite Type ###}
{% if data and data.typtype == 'c' %}
{% if data.composite %}{% set typinput = data.typinput %}{% elif o_data.typinput %}{% set typinput = o_data.typinput %}{% endif %}
CREATE TYPE {% if o_data.schema %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% else %}{{ conn|qtIdent(o_data.name) }}{% endif %} AS
({{"\n\t"}}{% if data.composite.added %}{% for d in data.composite.added %}{% if loop.index != 1 %},{{"\n\t"}}{% endif %}{{ conn|qtIdent(d.member_name) }} {% if is_sql %}{{ d.fulltype }}{% else %}{{ GET_TYPE.CREATE_TYPE_SQL(conn, d.cltype, d.tlength, d.precision, d.hasSqrBracket) }}{% endif %}{% if d.collation %} COLLATE {{d.collation}}{% endif %}{% endfor %}{% endif %}{{"\n"}});
{% endif %}
{###  Enum Type ###}
{% if data and data.typtype == 'e' %}
CREATE TYPE {% if o_data.schema %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% else %}{{ conn|qtIdent(o_data.name) }}{% endif %} AS ENUM
    ({% for e in data.enum.added %}{% if loop.index != 1 %}, {% endif %}{{ e.label|qtLiteral }}{% endfor %});
{% endif %}
{###  Range Type ###}
{% if data and (data.typtype == 'r' or (data.typtype is not defined and o_data.typtype == 'r')) %}
{% if data.typname %}{% set typname = data.typname %}{% elif o_data.typname %}{% set typname = o_data.typname %}{% endif %}
CREATE TYPE {% if o_data.schema %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% else %}{{ conn|qtIdent(o_data.name) }}{% endif %} AS RANGE
(
    {% if typname %}SUBTYPE={{ conn|qtTypeIdent(typname) }}{% endif %}{% if data.collname %},
    COLLATION = {{ data.collname }}{% endif %}{% if data.opcname %},
    SUBTYPE_OPCLASS = {{ data.opcname }}{% endif %}{% if data.rngcanonical %},
    CANONICAL = {{ data.rngcanonical }}{% endif %}{% if data.rngsubdiff %},
    SUBTYPE_DIFF = {{ data.rngsubdiff }}{% endif %}

);
{% endif %}
{###  External Type ###}
{% if data and (data.typtype == 'b' or (data.typtype is not defined and o_data.typtype == 'b')) %}
{% if data.typinput %}{% set typinput = data.typinput %}{% elif o_data.typinput %}{% set typinput = o_data.typinput %}{% endif %}
{% if data.typoutput %}{% set typoutput = data.typoutput %}{% elif o_data.typoutput %}{% set typoutput = o_data.typoutput %}{% endif %}
CREATE TYPE {% if o_data.schema %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% else %}{{ conn|qtIdent(o_data.name) }}{% endif %}

(
    {% if typinput %}INPUT = {{ typinput }}{% endif %}{% if typoutput %},
    OUTPUT = {{ typoutput }}{% endif %}{% if data.typreceive %},
    RECEIVE = {{data.typreceive}}{% endif %}{% if data.typsend %},
    SEND = {{data.typsend}}{% endif %}{% if data.typmodin %},
    TYPMOD_IN = {{data.typmodin}}{% endif %}{% if data.typmodout %},
    TYPMOD_OUT = {{data.typmodout}}{% endif %}{% if data.typanalyze %},
    ANALYZE = {{data.typanalyze}}{% endif %}{% if data.typlen %},
    INTERNALLENGTH = {{data.typlen}}{% endif %}{% if data.typbyval %},
    PASSEDBYVALUE{% endif %}{% if data.typalign %},
    ALIGNMENT =  {{data.typalign}}{% endif %}{% if data.typstorage %},
    STORAGE =  {{data.typstorage}}{% endif %}{% if data.typcategory %},
    CATEGORY = {{data.typcategory|qtLiteral}}{% endif %}{% if data.typispreferred %},
    PREFERRED =  {{data.typispreferred}}{% endif %}{% if data.typdefault %},
    DEFAULT = {{data.typdefault|qtLiteral}}{% endif %}{% if data.element %},
    ELEMENT = {{data.element}}{% endif %}{% if data.typdelim %},
    DELIMITER = {{data.typdelim|qtLiteral}}{% endif %}{% if data.is_collatable %},
    COLLATABLE = {{data.is_collatable}}{% endif %}

);
{% endif %}
{###  Type Owner ###}
{% if data and (data.typeowner or o_data.typeowner)%}

ALTER TYPE {% if o_data.schema %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% else %}{{ conn|qtIdent(o_data.name) }}{% endif %}

    OWNER TO {% if data.typeowner %}{{ conn|qtIdent(data.typeowner) }}{% elif o_data.typeowner %}{{ conn|qtIdent(o_data.typeowner) }}{% endif %};
{% endif %}
{###  Type Comments ###}
{% if data and data.description %}

COMMENT ON TYPE {% if o_data.schema %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% else %}{{ conn|qtIdent(o_data.name) }}{% endif %}

    IS {{data.description|qtLiteral}};
{% endif %}
{###  ACL ###}
{% if data.typacl and data.typacl|length > 0 %}
{% if 'deleted' in data.typacl %}
{% for priv in data.typacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'TYPE', priv.grantee, o_data.name, o_data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.typacl %}
{% for priv in data.typacl.changed %}
{{ PRIVILEGE.UNSETALL(conn, 'TYPE', priv.grantee, o_data.name, o_data.schema) }}
{{ PRIVILEGE.SET(conn, 'TYPE', priv.grantee, o_data.name, priv.without_grant, priv.with_grant, o_data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in data.typacl %}
{% for priv in data.typacl.added %}
{{ PRIVILEGE.SET(conn, 'TYPE', priv.grantee, o_data.name, priv.without_grant, priv.with_grant, o_data.schema) }}
{% endfor %}
{% endif %}
{% endif %}
{###  Security Lables ###}
{% if data.seclabels %}

{% for r in data.seclabels %}
{% if r.provider and r.label %}
{{ SECLABEL.SET(conn, 'TYPE', o_data.name, r.provider, r.label, o_data.schema) }}
{% endif %}
{% endfor %}
{% endif %}
