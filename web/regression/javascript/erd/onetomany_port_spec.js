import { PortModel } from '@projectstorm/react-diagrams-core';
import OneToManyPortModel from 'pgadmin.tools.erd/erd_tool/ports/OneToManyPort';
import {OneToManyLinkModel} from 'pgadmin.tools.erd/erd_tool/links/OneToManyLink';

describe('ERD OneToManyPortModel', ()=>{
  it('removeAllLinks', ()=>{
    let link1 = jasmine.createSpyObj('link1', ['remove']);
    let link2 = jasmine.createSpyObj('link2', ['remove']);
    spyOn(PortModel.prototype, 'getLinks').and.returnValue([link1, link2]);

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
