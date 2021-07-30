DROP INDEX IF EXISTS {{conn|qtIdent(data.nspname, data.name)}}{% if cascade %} cascade{% endif %};
