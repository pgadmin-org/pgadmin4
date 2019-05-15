{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
{## If user selected shell type then just create type template ##}
{% if data and data.typtype == 'p' %}
CREATE TYPE {{ conn|qtIdent(data.schema, data.name) }};
{% endif %}
{###  Composite Type ###}
{% if data and data.typtype == 'c' %}
CREATE TYPE {% if data.schema %}{{ conn|qtIdent(data.schema, data.name) }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %} AS
({{"\n\t"}}{% if data.composite %}{% for d in data.composite %}{% if loop.index != 1 %},{{"\n\t"}}{% endif %}{{ conn|qtIdent(d.member_name) }} {% if is_sql %}{{ d.fulltype }}{% else %}{{ GET_TYPE.CREATE_TYPE_SQL(conn, d.cltype, d.tlength, d.precision, d.hasSqrBracket) }}{% endif %}{% if d.collation %} COLLATE {{d.collation}}{% endif %}{% endfor %}{% endif %}{{"\n"}});
{% endif %}
{###  Enum Type ###}
{% if data and data.typtype == 'e' %}
CREATE TYPE {% if data.schema %}{{ conn|qtIdent(data.schema, data.name) }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %} AS ENUM
    ({% for e in data.enum %}{% if loop.index != 1 %}, {% endif %}{{ e.label|qtLiteral }}{% endfor %});
{% endif %}
{###  Range Type ###}
{% if data and data.typtype == 'r' %}
CREATE TYPE {% if data.schema %}{{ conn|qtIdent(data.schema, data.name) }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %} AS RANGE
(
    {% if data.typname %}SUBTYPE={{ conn|qtTypeIdent(data.typname) }}{% endif %}{% if data.collname %},
    COLLATION = {{ data.collname }}{% endif %}{% if data.opcname  %},
    SUBTYPE_OPCLASS = {{ data.opcname }}{% endif %}{% if data.rngcanonical %},
    CANONICAL = {{ data.rngcanonical }}{% endif %}{% if data.rngsubdiff %},
    SUBTYPE_DIFF = {{ data.rngsubdiff }}{% endif %}

);
{% endif %}
{###  External Type ###}
{% if data and data.typtype == 'b' %}
CREATE TYPE {% if data.schema %}{{ conn|qtIdent(data.schema, data.name) }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %}

(
    {% if data.typinput %}INPUT = {{data.typinput}}{% endif %}{% if data.typoutput %},
    OUTPUT = {{ data.typoutput }}{% endif %}{% if data.typreceive %},
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
{% if data and data.typeowner %}

ALTER TYPE {% if data.schema %}{{ conn|qtIdent(data.schema, data.name) }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %}

    OWNER TO {{ conn|qtIdent(data.typeowner) }};
{% endif %}
{###  Type Comments ###}
{% if data and data.description %}

COMMENT ON TYPE {% if data.schema %}{{ conn|qtIdent(data.schema, data.name) }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %}

    IS {{data.description|qtLiteral}};
{% endif %}
{###  ACL ###}
{% if data.typacl %}

{% for priv in data.typacl %}
{{ PRIVILEGE.SET(conn, 'TYPE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{###  Security Lables ###}
{% if data.seclabels %}

{% for r in data.seclabels %}
{% if r.provider and r.label %}
{{ SECLABEL.SET(conn, 'TYPE', data.name, r.provider, r.label, data.schema) }}
{% endif %}
{% endfor %}
{% endif %}
