DROP COLLATION IF EXISTS {{ conn|qtIdent(nspname, name) }}{% if cascade%} CASCADE{% endif %};
