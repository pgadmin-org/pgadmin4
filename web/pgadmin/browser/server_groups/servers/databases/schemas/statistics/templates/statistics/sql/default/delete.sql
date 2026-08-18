{### SQL to drop extended statistics object ###}
DROP STATISTICS {{ conn|qtIdent(schema, name) }}{% if cascade %} CASCADE{% endif %};
