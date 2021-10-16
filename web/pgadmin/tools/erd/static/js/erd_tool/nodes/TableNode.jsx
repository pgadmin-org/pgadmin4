/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { DefaultNodeModel, DiagramEngine, PortWidget } from '@projectstorm/react-diagrams';
import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import _ from 'lodash';
import { IconButton, DetailsToggleButton } from '../ui_components/ToolBar';
import SchemaIcon from 'top/browser/server_groups/servers/databases/schemas/static/img/schema.svg';
import TableIcon from 'top/browser/server_groups/servers/databases/schemas/tables/static/img/table.svg';
import PrimaryKeyIcon from 'top/browser/server_groups/servers/databases/schemas/tables/constraints/index_constraint/static/img/primary_key.svg';
import ForeignKeyIcon from 'top/browser/server_groups/servers/databases/schemas/tables/constraints/foreign_key/static/img/foreign_key.svg';
import ColumnIcon from 'top/browser/server_groups/servers/databases/schemas/tables/columns/static/img/column.svg';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';

const TYPE = 'table';

export class TableNodeModel extends DefaultNodeModel {
  constructor({otherInfo, ...options}) {
    super({
      ...options,
      type: TYPE,
    });

    this._note = otherInfo.note || '';
    this._metadata = {
      data_failed: false,
      ...otherInfo.metadata,
      is_promise: Boolean(otherInfo.data?.then || (otherInfo.metadata?.data_failed && !otherInfo.data)),
    };
    this._data = null;
    if(otherInfo.data?.then) {
      otherInfo.data.then((data)=>{
        /* Once the data is available, it is no more a promise */
        this._data = data;
        this._metadata = {
          data_failed: false,
          is_promise: false,
        };
        this.fireEvent(this._metadata, 'dataAvaiable');
        this.fireEvent({}, 'nodeUpdated');
      }).catch(()=>{
        this._metadata = {
          data_failed: true,
          is_promise: true,
        };
        this.fireEvent(this._metadata, 'dataAvaiable');
      });
    } else {
      this._data = {
        columns: [],
        ...otherInfo.data,
      };
    }
  }

  getPortName(attnum) {
    return `coll-port-${attnum}`;
  }

  setNote(note) {
    this._note = note;
  }

  getNote() {
    return this._note;
  }

  getMetadata() {
    return this._metadata;
  }

  addColumn(col) {
    this._data.columns.push(col);
  }

  getColumnAt(attnum) {
    return _.find(this.getColumns(), (col)=>col.attnum==attnum);
  }

  getColumns() {
    return this._data.columns;
  }

  setName(name) {
    this._data['name'] = name;
  }

  setData(data) {
    let self = this;
    /* Remove the links if column dropped or primary key removed */
    _.differenceWith(this._data.columns, data.columns, function(existing, incoming) {
      return existing.attnum == incoming.attnum && incoming.is_primary_key == true;
    }).forEach((col)=>{
      let existPort = self.getPort(self.getPortName(col.attnum));
      if(existPort && existPort.getSubtype() == 'one') {
        existPort.removeAllLinks();
        self.removePort(existPort);
      }
    });
    this._data = data;
    this.fireEvent({}, 'nodeUpdated');
  }

  getData() {
    return this._data;
  }

  getSchemaTableName() {
    return [this._data.schema, this._data.name];
  }

  remove() {
    Object.values(this.getPorts()).forEach((port)=>{
      port.removeAllLinks();
    });
    super.remove();
  }

  serializeData() {
    return this.getData();
  }

  serialize() {
    return {
      ...super.serialize(),
      otherInfo: {
        data: this.getData(),
        note: this.getNote(),
        metadata: this.getMetadata(),
      },
    };
  }
}

function RowIcon({icon}) {
  return (
    <div className="table-icon">
      <img src={icon} crossOrigin="anonymous"/>
    </div>
  );
}

RowIcon.propTypes = {
  icon: PropTypes.any.isRequired,
};


export class TableNodeWidget extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      show_details: true,
    };

    this.props.node.registerListener({
      toggleDetails: (event) => {
        this.setState({show_details: event.show_details});
      },
      dataAvaiable: ()=>{
        /* Just re-render */
        this.setState({});
      }
    });
  }

  generateColumn(col, tableData) {
    let port = this.props.node.getPort(this.props.node.getPortName(col.attnum));
    let icon = ColumnIcon;
    let localFkCols = [];
    (tableData.foreign_key||[]).forEach((fk)=>{
      localFkCols.push(...fk.columns.map((c)=>c.local_column));
    });
    if(col.is_primary_key) {
      icon = PrimaryKeyIcon;
    } else if(localFkCols.indexOf(col.name) > -1) {
      icon = ForeignKeyIcon;
    }
    return (
      <div className='d-flex col-row' key={col.attnum}>
        <div className='d-flex col-row-data'>
          <RowIcon icon={icon} />
          <div className="my-auto">
            <span className='col-name'>{col.name}</span>&nbsp;
            {this.state.show_details &&
            <span className='col-datatype'>{col.cltype}{col.attlen ? ('('+ col.attlen + (col.attprecision ? ','+col.attprecision : '') +')') : ''}</span>}
          </div>
        </div>
        <div className="ml-auto col-row-port">{this.generatePort(port)}</div>
      </div>
    );
  }

  generatePort = port => {
    if(port) {
      return (
        <PortWidget engine={this.props.engine} port={port} key={port.getID()} className={'port-' + port.options.alignment} />
      );
    }
    return <></>;
  };

  toggleShowDetails = (e) => {
    e.preventDefault();
    this.setState((prevState)=>({show_details: !prevState.show_details}));
  }

  render() {
    let tableData = this.props.node.getData();
    let tableMetaData = this.props.node.getMetadata();
    return (
      <div className={'table-node ' + (this.props.node.isSelected() ? 'selected': '') } onDoubleClick={()=>{this.props.node.fireEvent({}, 'editTable');}}>
        <div className="table-toolbar">
          <DetailsToggleButton className='btn-xs' showDetails={this.state.show_details}
            onClick={this.toggleShowDetails} onDoubleClick={(e)=>{e.stopPropagation();}}
            disabled={tableMetaData.is_promise} />
          {this.props.node.getNote() &&
            <IconButton icon="far fa-sticky-note" className="btn-xs btn-warning ml-auto" onClick={()=>{
              this.props.node.fireEvent({}, 'showNote');
            }} title="Check note"/>}
        </div>
        {tableMetaData.is_promise && <>
          <div className="d-flex table-name-data">
            {!tableMetaData.data_failed && <div className="table-name my-auto">{gettext('Fetching...')}</div>}
            {tableMetaData.data_failed && <div className="table-name my-auto fetch-error">{gettext('Failed to get data. Please delete this table.')}</div>}
          </div>
        </>}
        {!tableMetaData.is_promise && <>
          <div className="d-flex table-schema-data">
            <RowIcon icon={SchemaIcon}/>
            <div className="table-schema my-auto">{tableData.schema}</div>
          </div>
          <div className="d-flex table-name-data">
            <RowIcon icon={TableIcon} />
            <div className="table-name my-auto">{tableData.name}</div>
          </div>
          <div className="table-cols">
            {_.map(tableData.columns, (col)=>this.generateColumn(col, tableData))}
          </div>
        </>}
      </div>
    );
  }
}

TableNodeWidget.propTypes = {
  node: PropTypes.instanceOf(TableNodeModel),
  engine: PropTypes.instanceOf(DiagramEngine),
};

export class TableNodeFactory extends AbstractReactFactory {
  constructor() {
    super(TYPE);
  }

  generateModel(event) {
    return new TableNodeModel(event.initialConfig);
  }

  generateReactWidget(event) {
    return <TableNodeWidget engine={this.engine} node={event.model} />;
  }
}
