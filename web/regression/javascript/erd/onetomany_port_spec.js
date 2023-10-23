/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { PortModel } from '@projectstorm/react-diagrams-core';
import OneToManyPortModel from 'pgadmin.tools.erd/erd_tool/ports/OneToManyPort';
import {OneToManyLinkModel} from 'pgadmin.tools.erd/erd_tool/links/OneToManyLink';

describe('ERD OneToManyPortModel', ()=>{
  it('removeAllLinks', ()=>{
    let link1 = {'remove': jest.fn()};
    let link2 = {'remove': jest.fn()};
    jest.spyOn(PortModel.prototype, 'getLinks').mockReturnValue([link1, link2]);

    let portObj = new OneToManyPortModel({options: {}});
    portObj.removeAllLinks();
    expect(link1.remove).toHaveBeenCalled();
    expect(link2.remove).toHaveBeenCalled();
  });

  it('createLinkModel', ()=>{
    let portObj = new OneToManyPortModel({options: {}});
    expect(portObj.createLinkModel() instanceof OneToManyLinkModel).toBeTruthy();
  });
});
