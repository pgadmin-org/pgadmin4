{###  NOT VALID NOT NULL constraints (PostgreSQL 18+) that a table update ###}
{###  replaces, as pairs of the new and old column properties. Every NOT ###}
{###  NULL is dropped before any constraint is added, so a name another ###}
{###  column still holds is free by then. The table's update SQL emits this ###}
{###  after its constraint changes, so a primary key has already gone. ###}
{% for c, o in columns if o.attnotnull %}
ALTER TABLE IF EXISTS {{conn|qtIdent(c.schema, c.table)}}
    ALTER COLUMN {% if c.name %}{{conn|qtTypeIdent(c.name)}}{% else %}{{conn|qtTypeIdent(o.name)}}{% endif %} DROP NOT NULL;

{% endfor %}
{% for c, o in columns %}
ALTER TABLE IF EXISTS {{conn|qtIdent(c.schema, c.table)}}
    ADD CONSTRAINT {{conn|qtIdent(c.notnull_notvalid_conname)}} {{c.notnull_notvalid_condef}};

{% endfor %}
