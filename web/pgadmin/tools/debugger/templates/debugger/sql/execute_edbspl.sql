{### Create executer function for edb spl function debugging ###}
{% set inside_loop = {'value': False} %}

{% if lan_name == 'edbspl' %}
{% set useAnonymousBlock = "true" %}
{% if not is_func %}
    {% set str_statement = "\tEXEC " ~ func_name %}
{% elif ret_type == 'void' %}
    {% set str_statement = "\tPERFORM " ~ func_name %}
{% else %}
    {% set resultVar = "v_retVal" %}
    {% set str_statement = "\t" ~ resultVar ~ " := " ~ func_name %}
    {% set str_declare = str_declare ~ "\t" ~ resultVar ~ " " ~ ret_type ~ ";\n" %}
    {% set str_result = "\tDBMS_OUTPUT.PUT_LINE(E'\\n\\nResult:\\n--------\\n' || " ~ resultVar ~ "::text || E'\\n\\nNOTE: This is the result generated during the function execution by the debugger.\\n');\n" %}
{% endif %}

{% else %}
{% if ret_type == 'record' %}
    {% set str_statement = "\tSELECT " ~ func_name %}
{% else %}
    {% set str_statement = "\tSELECT * FROM " ~ func_name %}
{% endif %}
{% endif %}

{% set firstProceesed = "false" %}
{% set input_value_index = 0 %}

{% if arg_type|length > 0 %}
{% set str_statement = str_statement ~ "(" %}

{% for arg_mode in args_mode %}

{% if useAnonymousBlock == "true" and (arg_mode == 'o' or arg_mode == 'b') %}
{% set strParam = "p_param" ~ (loop.index - 1) %}
{% set str_declare = str_declare ~ "\t" ~ strParam ~ " " ~ arg_type[loop.index - 1] %}
{% if arg_mode == 'b' %}
{### Handle Null parameters received from client ###}
{% if data[input_value_index]['type'] == 'text' and data[input_value_index]['value'] != 'NULL' %}
{% set tmp_val = data[input_value_index]['value']|qtLiteral(conn) %}
{% set str_declare = str_declare ~ " := " ~ strParam ~ " " ~ tmp_val ~ "::" ~ data[input_value_index]['type'] %}
{% else %}
{% set str_declare = str_declare ~ " := " ~ strParam ~ " " ~ data[input_value_index]['value'] ~ "::" ~ data[input_value_index]['type'] %}
{% endif %}
{% set input_value_index = input_value_index + 1 %}
{% endif %}
{% set str_declare = str_declare ~ ";\n" %}

{% if firstProceesed == "true" %}
{% set str_statement = str_statement ~ ", " %}
{% endif %}
{% set firstProceesed = "true" %}
{% set str_statement = str_statement ~ strParam %}

{% elif arg_mode != 'o' %}
{% if firstProceesed == "true" %}
{% set str_statement = str_statement ~ ", " %}
{% endif %}
{% set firstProceesed = "true" %}

{% if arg_mode == 'v' %}
{% set str_statement = str_statement ~ "VARIADIC " %}
{% endif %}

{### Handle Null parameters received from client ###}
{% if data[input_value_index]['type'] == 'text' and data[input_value_index]['value'] != 'NULL' %}
{% set tmp_var = data[input_value_index]['value']|qtLiteral(conn) %}
{% set str_statement = str_statement ~ tmp_var ~ "::" ~ data[input_value_index]['type'] %}
{% else %}
{% set str_statement = str_statement ~ data[input_value_index]['value'] ~ "::" ~ data[input_value_index]['type'] %}
{% endif %}
{% set input_value_index = input_value_index + 1 %}


{% endif %}

{% if loop.last %}
{% set str_statement = str_statement ~ ")" %}
{% set strQuery = str_statement %}
{% if useAnonymousBlock == "true" %}
{% set strQuery = "DECLARE\n" ~ str_declare ~ "BEGIN\n" ~ str_statement ~ ";\n" ~ str_result ~ "END;" %}
{% endif %}

{{ strQuery }}
{% if inside_loop.update({'value': True}) %} {% endif %}
{% endif %}

{% endfor %}

{% elif not is_func and lan_name == 'edbspl' %}
{% set strQuery = str_statement %}
{% if useAnonymousBlock == "true" %}
{% set strQuery = "DECLARE\n" ~ str_declare ~ "BEGIN\n" ~ str_statement ~ ";\n" ~ str_result ~ "END;" %}
{% endif %}
{% else %}
{% set strQuery = str_statement ~ "()" %}
{% if useAnonymousBlock == "true" %}
{% set strQuery = "DECLARE\n" ~ str_declare ~ "BEGIN\n" ~ str_statement ~ ";\n" ~ str_result ~ "END;" %}
{% endif %}
{% endif %}

{### Return final query formed with above condition ###}
{% if not inside_loop.value %}
{{ strQuery }}
{% endif %}
