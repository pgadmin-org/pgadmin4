/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

let mfa_form_elem = document.getElementById('mfa_form');

if (mfa_form_elem)
  mfa_form_elem.setAttribute('class', '');

function sendCodeToEmail(data, _json, _callback) {
  const URL = '{{ url_for('mfa.send_email_code') }}';
  let accept = 'text/html; charset=utf-8;';

  let btn_send_code_elem = document.getElementById('btn_send_code');
  if (btn_send_code_elem) btn_send_code_elem.disabled = true;

  if (!data) {
    data = {'code': ''};
  }

  if (_json) {
    accept = 'application/json; charset=utf-8;';
  }

  clear_error();

  fetch(URL, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Accept': accept,
      'Content-Type': 'application/json; charset=utf-8;',
      '{{ current_app.config.get('WTF_CSRF_HEADERS')[0] }}': '{{ csrf_token() }}'
    },
    redirect: 'follow',
    body: JSON.stringify(data)
  }).then((resp) => {
    if (_callback) {
      setTimeout(() => (_callback(resp)), 1);
      return null;
    }
    if (!resp.ok) {
      let btn_send_code_elem = document.getElementById('btn_send_code');
      if (btn_send_code_elem) btn_send_code_elem.disabled = true;
      resp.text().then(msg => render_error(msg));

      return;
    }
    if (_json) return resp.json();
    return resp.text();
  }).then((string) => {
    if (!string)
      return;
    document.getElementById("mfa_email_auth").innerHTML = string;
    document.getElementById("mfa_form").classList = ["show_validate_btn"];
    setTimeout(() => {
      document.getElementById("showme").classList = [];
    }, 20000);
  });
}
