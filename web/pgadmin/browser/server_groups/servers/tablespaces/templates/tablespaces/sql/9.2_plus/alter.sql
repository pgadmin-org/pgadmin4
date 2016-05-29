{### SQL to alter tablespace ###}
{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/variable.macros' as VARIABLE %}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data %}
{### Owner on tablespace ###}
{% if data.spcuser  %}
ALTER TABLESPACE {{ conn|qtIdent(data.name) }}
  OWNER TO {{ conn|qtIdent(data.spcuser) }};

{% endif %}
{### Comments on tablespace ###}
{% if data.description %}
COMMENT ON TABLESPACE {{ conn|qtIdent(data.name) }}
  IS {{ data.description|qtLiteral }};

{% endif %}
{### Security Labels on tablespace ###}
{% if data.seclabels and data.seclabels|length > 0 %}
{% for r in data.seclabels %}
{{ SECLABEL.APPLY(conn, 'TABLESPACE', data.name, r.provider, r.label) }}
{% endfor %}

{% endif %}
{### Variables on tablespace ###}
{% if data.spcoptions %}
{{ VARIABLE.SET(conn, 'TABLESPACE', data.name, data.spcoptions) }}

{% endif %}
{###  ACL on tablespace ###}
{% if data.spcacl %}
{% for priv in data.spcacl %}
{{ PRIVILEGE.APPLY(conn, 'TABLESPACE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}

{% endif %}
{% endif %}
{# ======== The SQl Below will fetch id for given dataspace ======== #}
{% if tablespace %}
SELECT ts.oid FROM pg_tablespace ts WHERE spcname = {{tablespace|qtLiteral}};
{% endif %}
