DELETE FROM {{ conn|qtIdent(nsp_name, object_name) }}
{### If there is only one primary key ###}
{% if no_of_keys == 1 %}
    WHERE {{ conn|qtIdent(primary_key_labels[0]) }} IN
{### If there are multiple primary keys ###}
{% elif no_of_keys > 1 %}
    WHERE ({% for each_label in primary_key_labels %}{{ conn|qtIdent(each_label) }}{% if not loop.last %}, {% endif %}{% endfor %}) IN
{% endif %}
{### Rows to delete ###}
        ({% for obj in data %}{% if no_of_keys == 1 %}{{ obj[primary_key_labels[0]]|qtLiteral }}{% elif no_of_keys > 1 %}
{### Here we need to make tuple for each row ###}
({% for each_label in primary_key_labels %}{{ obj[each_label]|qtLiteral }}{% if not loop.last %}, {% endif %}{% endfor %}){% endif %}{% if not loop.last %}, {% endif %}
{% endfor %});
