/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { DiagramModel } from '@projectstorm/react-diagrams';
import _ from 'lodash';

export default class ERDModel extends DiagramModel {
  constructor(options) {
    super(options);
  }

  getNodesDict() {
    return _.fromPairs(this.getNodes().map(node => [node.getID(), node]));
  }
}
