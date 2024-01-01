/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { PortModel, PortModelAlignment } from '@projectstorm/react-diagrams-core';
import {OneToManyLinkModel} from '../links/OneToManyLink';
import { AbstractModelFactory } from '@projectstorm/react-canvas-core';

const TYPE = 'onetomany';

export default class OneToManyPortModel extends PortModel {
  constructor({options}) {
    super({
      ...options,
      type: TYPE,
    });
  }

  removeAllLinks() {
    Object.values(this.getLinks()).forEach((link)=>{
      link.remove();
    });
  }

  createLinkModel() {
    return new OneToManyLinkModel({});
  }

  deserialize(event) {
    /* Make it backward compatible */
    const alignment = event.data?.name?.split('-').slice(-1)[0];
    if(event.data?.name && ![PortModelAlignment.LEFT, PortModelAlignment.RIGHT].includes(alignment)) {
      event.data.name += '-' + PortModelAlignment.RIGHT;
    }
    super.deserialize(event);
  }

  serialize() {
    return {
      ...super.serialize(),
    };
  }

  getAlignment() {
    return this.options.alignment;
  }
}

export class OneToManyPortFactory extends AbstractModelFactory {
  constructor() {
    super(TYPE);
  }

  generateModel(event) {
    return new OneToManyPortModel(event.initialConfig||{});
  }
}
