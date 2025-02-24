{### SQL to create directory object ###}
{% if data %}
CREATE DIRECTORY {{ conn|qtIdent(data.name) }} AS {{ data.path|qtLiteral(conn) }};
{% endif %}