/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import Alertify from 'pgadmin.alertifyjs';
import '../../../pgadmin/misc/file_manager/static/js/file_manager';
import '../../../pgadmin/misc/file_manager/static/js/select_dialogue.js';


describe('fileSelectDialog', function () {

  let params;

  describe('When dialog is called for select file', () => {
    it('Select file dialog', function() {
      params = {
        'dialog_title': 'Select file',
        'dialog_type': 'select_file',
      };

      spyOn(Alertify, 'fileSelectionDlg').and.callFake(function() {
        this.resizeTo = function() {};
        return this;
      });

      pgAdmin.FileManager.show_dialog(params);

      expect(Alertify.fileSelectionDlg).toHaveBeenCalled();
    });
  });

  describe('When dialog is called for create file', () => {
    it('Select file dialog', function() {
      params = {
        'dialog_title': 'Create file',
        'dialog_type': 'create_file',
      };

      spyOn(Alertify, 'createModeDlg').and.callFake(function() {
        this.resizeTo = function() {};
        return this;
      });

      pgAdmin.FileManager.show_dialog(params);

      expect(Alertify.createModeDlg).toHaveBeenCalled();
    });
  });
});
