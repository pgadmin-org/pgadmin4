{% if data.obj_type and data.tblspc and data.old_tblspc %}

{% if data.obj_type == 'all' or data.obj_type == 'tables' %}
ALTER TABLE ALL IN TABLESPACE {{ conn|qtIdent(data.old_tblspc) }}
{% if data.user %}  OWNED BY {{ conn|qtIdent(data.user) }}{% endif %}
   SET TABLESPACE {{ conn|qtIdent(data.tblspc) }};
{% endif %}

{% if data.obj_type == 'all' or data.obj_type == 'indexes' %}
ALTER INDEX ALL IN TABLESPACE {{ conn|qtIdent(data.old_tblspc) }}
{% if data.user %}  OWNED BY {{ conn|qtIdent(data.user) }}{% endif %}
    SET TABLESPACE {{ conn|qtIdent(data.tblspc) }};
{% endif %}

{% if data.obj_type == 'all' or data.obj_type == 'materialized_views' %}
ALTER MATERIALIZED VIEW ALL IN TABLESPACE {{ conn|qtIdent(data.old_tblspc) }}
{% if data.user %}  OWNED BY {{ conn|qtIdent(data.user) }}{% endif %}
    SET TABLESPACE {{ conn|qtIdent(data.tblspc) }};
{% endif %}

{% endif %}