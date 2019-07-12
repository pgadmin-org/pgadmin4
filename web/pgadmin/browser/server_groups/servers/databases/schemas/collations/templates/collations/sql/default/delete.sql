DROP COLLATION {{ conn|qtIdent(nspname, name) }}{% if cascade%} CASCADE{% endif %};
