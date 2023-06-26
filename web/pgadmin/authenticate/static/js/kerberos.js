/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import url_for from 'sources/url_for';
import userInfo from 'pgadmin.user_management.current_user';
import {AUTH_METHODS} from 'pgadmin.browser.constants';

function fetch_ticket() {
  // Fetch the Kerberos Updated ticket through SPNEGO
  return fetch(url_for('kerberos.update_ticket')
  )
    .then(function(response){
      if (response.status >= 200 && response.status < 300) {
        return Promise.resolve(response);
      } else {
        return Promise.reject(new Error(response.statusText));
      }
    });
}

function fetch_ticket_lifetime () {
  // Fetch the Kerberos ticket lifetime left

  return fetch(url_for('kerberos.validate_ticket')
  )
    .then(
      function(response){
        if (response.status >= 200 && response.status < 300) {
          return response.json();
        } else {
          return Promise.reject(new Error(response.statusText));
        }
      }
    )
    .then(function(response){
      let ticket_lifetime = response.data.ticket_lifetime;
      if (ticket_lifetime > 0) {
        return Promise.resolve(ticket_lifetime);
      } else {
        return Promise.reject();
      }
    });

}

function validate_kerberos_ticket() {
  // Ping pgAdmin server every 10 seconds
  // to fetch the Kerberos ticket lifetime left
  if (userInfo['current_auth_source'] != AUTH_METHODS['KERBEROS']) return;

  return setInterval(function() {
    let newPromise = fetch_ticket_lifetime();
    newPromise.then(
      function() {
        return;
      },
      fetch_ticket
    );
  }, 10000);
}

export {fetch_ticket, validate_kerberos_ticket, fetch_ticket_lifetime};
