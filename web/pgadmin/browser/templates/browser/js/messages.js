/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(
 'pgadmin.browser.messages',
  ['sources/gettext', 'sources/pgadmin'],
  function(gettext, pgAdmin) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  if (pgBrowser.messages)
    return pgBrowser.messages;

  var messages = pgBrowser.messages = {
    'SERVER_LOST': gettext('Connection to the server has been lost.'),
    'CLICK_FOR_DETAILED_MSG': gettext('Click here for details.'),
    'GENERAL_CATEGORY': gettext('General'),
    'SQL_TAB': gettext('SQL'),
    'SQL_INCOMPLETE': gettext('Definition incomplete'),
    'SQL_NO_CHANGE': gettext('Nothing changed'),
    'MUST_BE_INT' : gettext("'%s' must be an integer."),
    'MUST_BE_NUM' : gettext("'%s' must be a numeric."),
    'MUST_GR_EQ' : gettext("'%s' must be greater than or equal to %s."),
    'MUST_LESS_EQ' : gettext("'%s' must be less than or equal to %s."),
    'STATISTICS_LABEL': gettext("Statistics"),
    'STATISTICS_VALUE_LABEL': gettext("Value"),
    'NODE_HAS_NO_SQL': gettext("No SQL could be generated for the selected object."),
    'NODE_HAS_NO_STATISTICS': gettext("No statistics are available for the selected object."),
    'TRUE': gettext("True"),
    'FALSE': gettext("False"),
    'NOTE_CTRL_LABEL': gettext("Note"),
    'ERR_RETRIEVAL_INFO': gettext("Error retrieving the information - %s"),
    'CONNECTION_LOST': gettext("Connection to the server has been lost."),
    'SELECT_ALL': gettext("Select All"),
    'UNSELECT_ALL': gettext("Unselect All"),
    'LOADING_MESSAGE': gettext("Retrieving data from the server..."),
    'LOADING_FAILED': gettext("Failed to retrieve data from the server.")
  };

{% for key in current_app.messages.keys() %}
  messages['{{ key }}'] = '{{ current_app.messages[key] }}';
{% endfor %}

  return pgBrowser.messages;

});
