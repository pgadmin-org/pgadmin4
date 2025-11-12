DROP TRIGGER IF EXISTS {{conn|qtIdent(data.name)}} ON {{conn|qtIdent(data.nspname, data.relname )}}{% if cascade %} CASCADE{% endif %};
