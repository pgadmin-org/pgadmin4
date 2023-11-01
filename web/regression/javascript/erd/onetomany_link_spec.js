/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';


import {
  RightAngleLinkModel,
} from '@projectstorm/react-diagrams';

import OneToManyPortModel from 'pgadmin.tools.erd/erd_tool/ports/OneToManyPort';
import {OneToManyLinkModel, OneToManyLinkWidget, OneToManyLinkFactory} from 'pgadmin.tools.erd/erd_tool/links/OneToManyLink';
import { render } from '@testing-library/react';


describe('ERD OneToManyLinkModel', ()=>{
  let modelObj = null;
  beforeAll(()=>{
    jest.spyOn(RightAngleLinkModel.prototype, 'serialize').mockReturnValue({'key': 'value'});
  });
  beforeEach(()=>{
    modelObj = new OneToManyLinkModel({
      data: {
        local_table_uid: 'id1',
        local_column_attnum: 0,
        referenced_table_uid: 'id2',
        referenced_column_attnum: 1,
      },
    });
  });

  it('init', ()=>{
    expect(modelObj.getData()).toEqual({
      local_table_uid: 'id1',
      local_column_attnum: 0,
      referenced_table_uid: 'id2',
      referenced_column_attnum: 1,
    });
  });

  it('setData', ()=>{
    modelObj.setData({
      local_column_attnum: 2,
      referenced_column_attnum: 4,
    });
    expect(modelObj.getData()).toEqual({
      local_column_attnum: 2,
      referenced_column_attnum: 4,
    });
  });

  it('serializeData', ()=>{
    let nodesDict = {
      'id1': {
        getData: function(){ return {
          'name': 'table1',
          'schema': 'erd1',
          'columns': [
            {'name': 'col11', attnum: 0},
            {'name': 'col12', attnum: 1},
          ],
        };},
      },
      'id2': {
        getData: function(){ return {
          'name': 'table2',
          'schema': 'erd2',
          'columns': [
            {'name': 'col21', attnum: 0},
            {'name': 'col22', attnum: 1},
          ],
        };},
      },
    };

    expect(modelObj.serializeData(nodesDict)).toEqual({
      'schema': 'erd1',
      'table': 'table1',
      'remote_schema': 'erd2',
      'remote_table': 'table2',
      'columns': [{
        'local_column': 'col11',
        'referenced': 'col22',
      }],
    });
  });

  it('serialize', ()=>{
    let retVal = modelObj.serialize();
    expect(RightAngleLinkModel.prototype.serialize).toHaveBeenCalled();
    expect(retVal).toEqual({
      key: 'value',
      data: {
        local_table_uid: 'id1',
        local_column_attnum: 0,
        referenced_table_uid: 'id2',
        referenced_column_attnum: 1,
      },
    });
  });
});

describe('ERD OneToManyLinkWidget', ()=>{
  let linkFactory = new OneToManyLinkFactory();
  let engine = {
    getFactoryForLink: ()=>linkFactory,
  };
  let link = null;

  beforeEach(()=>{


    link = new OneToManyLinkModel({
      color: '#000',
      data: {
        local_table_uid: 'id1',
        local_column_attnum: 0,
        referenced_table_uid: 'id2',
        referenced_column_attnum: 1,
      },
    });
    link.setSourcePort(new OneToManyPortModel({options: {}}));
    link.setTargetPort(new OneToManyPortModel({options: {}}));
  });

  it('render', ()=>{
    let linkWidget = render(
      <svg><OneToManyLinkWidget link={link} diagramEngine={engine} factory={linkFactory} /></svg>
    );

    let paths = linkWidget.container.querySelectorAll('g g');
    expect(paths[0].querySelectorAll('polyline').length).toBe(1);
    expect(paths[paths.length-1].querySelectorAll('polyline').length).toBe(1);
    expect(paths[paths.length-1].querySelectorAll('circle').length).toBe(1);
  });
});
