/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
window.jQuery = window.$ = $;

import 'wcdocker';
import '../helper/enzyme.helper';

import jasmineEnzyme from 'jasmine-enzyme';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

import { messages } from '../fake_messages';
import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import {TreeFake} from '../tree/tree_fake';


describe('Debugger Component', () => {
  let funcArgs;
  let mountDOM;
  let tree;
  let networkMock;

  beforeEach(() => {
    jasmineEnzyme();
    // Element for mount wcDocker panel
    mountDOM = $('<div class="dockerContainer">');
    $(document.body).append(mountDOM);

    $(document.body).append($('<div id="debugger-main-container">'));

    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
    pgAdmin.Browser.stdH =  pgAdmin.Browser.stdH || {
      sm: 200,
      md: 400,
      lg: 550,
      default: 550,
    };
    pgAdmin.Browser.stdW = pgAdmin.Browser.stdW || {
      sm: 500,
      md: 700,
      lg: 900,
      default: 500,
    };
    funcArgs = new FunctionArguments();
    pgAdmin.Browser.preferences_cache = [
      {
        'id': 115,
        'cid': 13,
        'name': 'btn_step_into',
        'label': 'Accesskey (Step into)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 73,
            'char': 'i'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 116,
        'cid': 13,
        'name': 'btn_step_over',
        'label': 'Accesskey (Step over)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 79,
            'char': 'o'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      },
      {
        'id': 113,
        'cid': 13,
        'name': 'btn_start',
        'label': 'Accesskey (Continue/Start)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 67,
            'char': 'c'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 114,
        'cid': 13,
        'name': 'btn_stop',
        'label': 'Accesskey (Stop)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 83,
            'char': 's'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 117,
        'cid': 13,
        'name': 'btn_toggle_breakpoint',
        'label': 'Accesskey (Toggle breakpoint)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 84,
            'char': 't'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 118,
        'cid': 13,
        'name': 'btn_clear_breakpoints',
        'label': 'Accesskey (Clear all breakpoints)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 88,
            'char': 'x'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }

    ];
    // eslint-disable-next-line
    let docker = new wcDocker(
      '.dockerContainer', {
        allowContextMenu: false,
        allowCollapse: false,
        loadingClass: 'pg-sp-icon',
      });

    tree = new TreeFake();
    pgAdmin.Browser.tree = tree;
    pgAdmin.Browser.docker = docker;
    networkMock = new MockAdapter(axios);
  });

  it('Debugger Args', () => {
    networkMock.onGet(url_for('debugger.init', {'function': 1, 'schema': 1, 'database': 1, 'server': 1})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'debug_info':[{'name':'_test2','prosrc':'begin\nselect \'1\';\nend','lanname':'plpgsql','proretset':false,'prorettype':1043,'rettype':'varchar','proargtypenames':'date','proargtypes':'1082','proargnames':'test_date','proargmodes':null,'pkg':0,'pkgname':'','pkgconsoid':0,'schema':2200,'schemaname':'public','isfunc':true,'signature':'test_date date','proargdefaults':null,'pronargdefaults':0,'require_input':true}],'trans_id':'7165'}});

    let debugInfo = {
      'name': '_test2',
      'prosrc': 'begin\nselect \'1\';\nend',
      'lanname': 'plpgsql',
      'proretset': false,
      'prorettype': 1043,
      'rettype': 'varchar',
      'proargtypenames': 'date',
      'proargtypes': '1082',
      'proargnames': 'test_date',
      'proargmodes': null,
      'pkg': 0,
      'pkgname': '',
      'pkgconsoid': 0,
      'schema': 2200,
      'schemaname': 'public',
      'isfunc': true,
      'signature': 'test_date date',
      'proargdefaults': null,
      'pronargdefaults': 0,
      'require_input': true,
    };

    funcArgs.show(debugInfo, 0, false, '123');
  });
});

