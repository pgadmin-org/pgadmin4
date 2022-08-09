DROP SCHEMA IF EXISTS {{ conn|qtIdent(name) }} {% if cascade %}CASCADE{%endif%};
