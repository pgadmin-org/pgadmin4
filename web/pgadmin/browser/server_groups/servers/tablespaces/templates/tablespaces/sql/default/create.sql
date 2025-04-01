{### SQL to create tablespace object ###}
{% if data %}
CREATE TABLESPACE {{ conn|qtIdent(data.name) }}
{% if data.spcuser %}
  OWNER {{ conn|qtIdent(data.spcuser) }}
{% endif %}
  LOCATION {{ data.spclocation|qtLiteral(conn) }};

{% endif %}
