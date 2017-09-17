import 'babel-polyfill';
import * as pgAdmin from 'sources/pgadmin';
import 'pgadmin.settings';
import 'pgadmin.preferences';
import * as pgBrowser from 'pgadmin.browser';
import * as Alertify from 'pgadmin.alertifyjs';

pgBrowser.init();

pgAdmin.report_error = function(_msg) {
  Alertify.error(_msg);
}

module.exports = pgAdmin;
