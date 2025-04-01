{% if data %}
CREATE EVENT TRIGGER {{ conn|qtIdent(data.name) }} ON {{data.eventname}}
{% if data.when %}
    WHEN TAG IN ({{data.when}})
{% endif %}
    EXECUTE PROCEDURE {{data.eventfunname}}();
{% endif %}
