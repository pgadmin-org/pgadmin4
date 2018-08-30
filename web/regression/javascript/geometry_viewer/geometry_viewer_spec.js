/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import GeometryViewer from 'sources/sqleditor/geometry_viewer';

describe('geometry viewer test', function () {

  describe('geometry viewer add header button test', function () {
    let add_button = GeometryViewer.add_header_button;
    it('should add button for geography type', function () {
      let columnDef = {
        column_type_internal: 'geography',
      };
      add_button(columnDef);
      expect(columnDef.header).toBeDefined();
    });

    it('should add button for geometry type', function () {
      let columnDef = {
        column_type_internal: 'geometry',
      };
      add_button(columnDef);
      expect(columnDef.header).toBeDefined();
    });
  });

  describe('geometry viewer rener geometry test', function () {

    it('should group geometry by srid', function () {
      // POINT(0 0)
      let ewkb = '010100000000000000000000000000000000000000';
      // SRID=32632;POINT(0 0)
      let ewkb1 = '0101000020787F000000000000000000000000000000000000';
      let items = [{
        id: 1,
        geom: ewkb,
      }, {
        id: 1,
        geom: ewkb,
      }, {
        id: 1,
        geom: ewkb1,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(2);
    });


    it('should support geometry collection', function () {
      // GEOMETRYCOLLECTION(POINT(2 3),LINESTRING(2 3,3 4))
      let ewkb = '01070000000200000001010000000000000000000040000000000000084001' +
        '02000000020000000000000000000040000000000000084000000000000008400000000' +
        '000001040';
      let items = [{
        id: 1,
        geom: ewkb,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(1);
    });

    it('should support geometry M', function () {
      // SRID=4326;MULTIPOINTM(0 0 0,1 2 1)
      let ewkb = '0104000060E610000002000000010100004000000000000000000000000000' +
        '00000000000000000000000101000040000000000000F03F00000000000000400000000' +
        '00000F03F';
      let items = [{
        id: 1,
        geom: ewkb,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(1);
    });

    it('should support empty geometry', function () {
      // GEOMETRYCOLLECTION EMPTY
      let ewkb = '010700000000000000';
      let items = [{
        id: 1,
        geom: ewkb,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(1);
    });


    it('should support mixed geometry type', function () {
      // GEOMETRYCOLLECTION EMPTY
      let ewkb = '010700000000000000';
      // POINT(0 0)
      let ewkb1 = '010100000000000000000000000000000000000000';
      // SRID=4326;MULTIPOINTM(0 0 0,1 2 1)
      let ewkb2 = '0104000060E610000002000000010100004000000000000000000000000000' +
        '00000000000000000000000101000040000000000000F03F00000000000000400000000' +
        '00000F03F';
      let items = [{
        id: 1,
        geom: ewkb,
      }, {
        id: 1,
        geom: ewkb1,
      }, {
        id: 1,
        geom: ewkb2,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(2);
    });


    it('should not support 3D geometry', function () {
      // POINT(0 0 0)
      let ewkb = '0101000080000000000000F03F000000000000F03F000000000000F03F';
      let items = [{
        id: 1,
        geom: ewkb,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(0);
    });

    it('should not support 3DM geometry', function () {
      // POINT(0 0 0 0)
      let ewkb = '01010000C00000000000000000000000000000000000000000000000000000' +
        '000000000000';
      let items = [{
        id: 1,
        geom: ewkb,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(0);
    });

    it('should not support TRIANGLE geometry', function () {
      // TRIANGLE ((0 0, 0 9, 9 0, 0 0))
      let ewkb = '01110000000100000004000000000000000000000000000000000000000000' +
        '00000000000000000000000022400000000000002240000000000000000000000000000' +
        '000000000000000000000';
      let items = [{
        id: 1,
        geom: ewkb,
      }];
      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBe(0);
    });

    it('should limit data size', function () {
      // POINT(0 0)
      let ewkb = '010100000000000000000000000000000000000000';
      let items = [];
      for (let i = 0; i < 600000; i++) {
        items.push({
          id: i,
          geom: ewkb,
        });
      }

      let columns = [
        {
          column_type_internal: 'geometry',
          field: 'geom',
        },
      ];
      let columnIndex = 0;
      let result = GeometryViewer.parse_data(items, columns, columnIndex);
      expect(result.geoJSONs.length).toBeLessThan(600000);
    });
  });
});
