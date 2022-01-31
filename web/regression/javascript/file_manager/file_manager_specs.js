/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import Alertify from 'pgadmin.alertifyjs';
import '../../../pgadmin/misc/file_manager/static/js/file_manager';
import '../../../pgadmin/misc/file_manager/static/js/select_dialogue.js';


describe('fileSelectDialog', function () {

  let params;
  let calcWidth = (passed_width)=>{
    let iw = window.innerWidth;
    if (iw > passed_width){
      return passed_width;
    } else {
      if (iw > pgAdmin.Browser.stdW.lg)
        return pgAdmin.Browser.stdW.lg;
      else if (iw > pgAdmin.Browser.stdW.md)
        return pgAdmin.Browser.stdW.md;
      else if (iw > pgAdmin.Browser.stdW.sm)
        return pgAdmin.Browser.stdW.sm;
      else
        // if available screen resolution is still
        // less then return the width value as it
        return iw;
    }
  };

  let calcHeight = (passed_height)=>{
    // We are excluding sm as it is too small for dialog
    let ih = window.innerHeight;
    if (ih > passed_height){
      return passed_height;
    }else{
      if (ih > pgAdmin.Browser.stdH.lg)
        return pgAdmin.Browser.stdH.lg;
      else if (ih > pgAdmin.Browser.stdH.md)
        return pgAdmin.Browser.stdH.md;
      else
        // if available screen resolution is still
        // less then return the height value as it
        return ih;
    }
  };

  beforeAll(() => {
    pgAdmin.Browser = {
      stdW: {
        sm: 500,
        md: 700,
        lg: 900,
        default: 500,
        calc: (passed_width) => {
          calcWidth(passed_width);
        },
      },
      stdH: {
        sm: 200,
        md: 400,
        lg: 550,
        default: 550,
        calc: (passed_height) => {
          calcHeight(passed_height);
        },
      },
    };
  });

  describe('When dialog is called for', () => {
    it('Select file', function() {
      params = {
        'dialog_title': 'Select file',
        'dialog_type': 'select_file',
      };

      spyOn(Alertify, 'fileSelectionDlg').and.callFake(function() {
        this.resizeTo = function() {/*This is intentional (SonarQube)*/};
        return this;
      });

      pgAdmin.FileManager.show_dialog(params);

      expect(Alertify.fileSelectionDlg).toHaveBeenCalled();
    });

    it('create file', function() {
      params = {
        'dialog_title': 'Create file',
        'dialog_type': 'create_file',
      };

      spyOn(Alertify, 'createModeDlg').and.callFake(function() {
        this.resizeTo = function() {/*This is intentional (SonarQube)*/};
        return this;
      });

      pgAdmin.FileManager.show_dialog(params);

      expect(Alertify.createModeDlg).toHaveBeenCalled();
    });
  });

  describe('When dialog is called for storage file', () => {
    it('Storage file dialog', function() {
      params = {
        'dialog_title': 'Storage Manager',
        'dialog_type': 'storage_dialog',
      };

      spyOn(Alertify, 'fileStorageDlg').and.callFake(function() {
        this.resizeTo = function() {/*This is intentional (SonarQube)*/};
        return this;
      });

      pgAdmin.FileManager.show_dialog(params);

      expect(Alertify.fileStorageDlg).toHaveBeenCalled();
    });
  });
});
