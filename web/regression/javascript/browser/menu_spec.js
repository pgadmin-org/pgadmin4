/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'pgadmin',
  'browser/menu',
], function (pgAdmin) {
  describe('MenuItem', function () {
    var MenuItem = pgAdmin.Browser.MenuItem;
    var menuItem;

    describe('when we create a menu item', function () {
      describe('and it is disabled', function () {
        beforeEach(function () {
          menuItem = new MenuItem({enable: false, icon: 'fa fa-car'});
          menuItem.create_el({}, {});
        });

        it('should change the text color to gray', function () {
          expect(menuItem.$el.find('span').hasClass('font-gray-4')).toBeTruthy();
        });

        describe('when becomes enabled', function () {
          beforeEach(function () {
            menuItem.enable = true;
            menuItem.update({},{});
          });

          it('should change the text color to white', function () {
            expect(menuItem.$el.find('span').hasClass('font-gray-4')).toBeFalsy();
            expect(menuItem.$el.find('span').hasClass('font-white')).toBeTruthy();
          });
        });
      });

      describe('and it is enabled', function () {
        beforeEach(function () {
          menuItem = new MenuItem({enable: true, icon: 'fa fa-car'});
          menuItem.create_el({}, {});
        });

        it('should change the text color to white', function () {
          expect(menuItem.$el.find('span').hasClass('font-white')).toBeTruthy();
        });

        describe('when becomes disabled', function () {
          beforeEach(function () {
            menuItem.enable = false;
            menuItem.update({},{});
          });

          it('should change the text color to gray', function () {
            expect(menuItem.$el.find('span').hasClass('font-gray-4')).toBeTruthy();
            expect(menuItem.$el.find('span').hasClass('font-white')).toBeFalsy();
          });
        });
      });
    });

  });
});
