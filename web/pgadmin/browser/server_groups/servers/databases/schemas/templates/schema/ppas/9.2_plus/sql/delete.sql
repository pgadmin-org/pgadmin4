DROP SCHEMA {{ conn|qtIdent(name) }} {% if cascade %}CASCADE{%endif%};
