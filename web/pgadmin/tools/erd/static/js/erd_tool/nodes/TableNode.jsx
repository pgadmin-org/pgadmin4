/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { DefaultNodeModel, DiagramEngine, PortModelAlignment, PortWidget } from '@projectstorm/react-diagrams';
import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import _ from 'lodash';
import SchemaIcon from 'top/browser/server_groups/servers/databases/schemas/static/img/schema.svg';
import TableIcon from 'top/browser/server_groups/servers/databases/schemas/tables/static/img/table.svg';
import PrimaryKeyIcon from 'top/browser/server_groups/servers/databases/schemas/tables/constraints/index_constraint/static/img/primary_key.svg';
import ForeignKeyIcon from 'top/browser/server_groups/servers/databases/schemas/tables/constraints/foreign_key/static/img/foreign_key.svg';
import ColumnIcon from 'top/browser/server_groups/servers/databases/schemas/tables/columns/static/img/column.svg';
import UniqueKeyIcon from 'top/browser/server_groups/servers/databases/schemas/tables/constraints/index_constraint/static/img/unique_constraint.svg';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import { PgIconButton } from '../../../../../../static/js/components/Buttons';
import NoteRoundedIcon from '@material-ui/icons/NoteRounded';
import VisibilityRoundedIcon from '@material-ui/icons/VisibilityRounded';
import VisibilityOffRoundedIcon from '@material-ui/icons/VisibilityOffRounded';
import { withStyles } from '@material-ui/styles';
import clsx from 'clsx';
import { Box } from '@material-ui/core';


const TYPE = 'table';
const TABLE_WIDTH = 175;

export class TableNodeModel extends DefaultNodeModel {
  constructor({otherInfo, ...options}) {
    super({
      ...options,
      type: TYPE,
    });
    this.width = TABLE_WIDTH;

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
          ...this._metadata,
          data_failed: false,
          is_promise: false,
        };
        this.fireEvent(this._metadata, 'dataAvaiable');
        this.fireEvent({}, 'nodeUpdated');
        this.fireEvent({}, 'selectionChanged');
      }).catch(()=>{
        this._metadata = {
          ...this._metadata,
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

  getPortName(attnum, alignment) {
    if(alignment) {
      return `coll-port-${attnum}-${alignment}`;
    }
    return `coll-port-${attnum}-right`;
  }

  getPortAttnum(portName) {
    return portName.split('-')[2];
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

  setMetadata(metadata) {
    this._metadata = {
      ...this._metadata,
      ...metadata,
    };
  }

  getLinks() {
    let links = {};
    this.getPorts();
    Object.values(this.getPorts()).forEach((port)=>{
      links = {
        ...links,
        ...port.getLinks(),
      };
    });
    return links;
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
    <div style={{padding: '0rem 0.125rem'}}>
      <img src={icon} crossOrigin="anonymous"/>
    </div>
  );
}

RowIcon.propTypes = {
  icon: PropTypes.any.isRequired,
};

const styles = (theme)=>({
  tableNode: {
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    ...theme.mixins.panelBorder.all,
    borderRadius: theme.shape.borderRadius,
    position: 'relative',
    width: `${TABLE_WIDTH}px`,
    fontSize: '0.8em',
    '& div:last-child': {
      borderBottomLeftRadius: 'inherit',
      borderBottomRightRadius: 'inherit',
    }
  },
  tableNodeSelected: {
    borderColor: theme.palette.primary.main,
  },
  tableSection: {
    ...theme.mixins.panelBorder.bottom,
    padding: '0.125rem 0.25rem',
    display: 'flex',
  },
  columnSection: {
    display:'flex',
    width: '100%' ,
    ...theme.mixins.panelBorder.bottom,
  },
  columnName: {
    display:'flex',
    width: '100%' ,
    padding: '0.125rem 0.25rem',
    wordBreak: 'break-all',
  },
  tableToolbar: {
    background: theme.otherVars.editorToolbarBg,
    borderTopLeftRadius: 'inherit',
    borderTopRightRadius: 'inherit',
  },
  tableNameText: {
    fontWeight: 'bold',
    wordBreak: 'break-all',
    margin: 'auto 0',
  },
  error: {
    color: theme.palette.error.main,
  },
  noteBtn: {
    marginLeft: 'auto',
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.contrastText,
  }
});

class TableNodeWidgetRaw extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      show_details: true,
    };

    this.props.node.registerListener({
      toggleDetails: (event) => {
        this.setState({show_details: event.show_details});
      },
      changeColors: (event)=>{
        this.props.node.setMetadata({
          fillColor: event.fillColor, textColor: event.textColor,
        });
        this.setState({});
      },
      dataAvaiable: ()=>{
        /* Just re-render */
        this.setState({});
      }
    });
  }

  generateColumn(col, localFkCols, localUkCols) {
    let leftPort = this.props.node.getPort(this.props.node.getPortName(col.attnum, PortModelAlignment.LEFT));
    let rightPort = this.props.node.getPort(this.props.node.getPortName(col.attnum, PortModelAlignment.RIGHT));

    let icon = ColumnIcon;
    /* Less priority */
    if(localUkCols.indexOf(col.name) > -1) {
      icon = UniqueKeyIcon;
    }
    if(col.is_primary_key) {
      icon = PrimaryKeyIcon;
    } else if(localFkCols.indexOf(col.name) > -1) {
      icon = ForeignKeyIcon;
    }

    let cltype = col.cltype;
    if(col.attlen) {
      cltype += '('+ col.attlen + (col.attprecision ? ',' + col.attprecision : '') +')';
    }

    const {classes} = this.props;
    return (
      <Box className={classes.columnSection} key={col.attnum} data-test="column-row">
        <Box marginRight="auto" padding="0" minHeight="0" display="flex" alignItems="center">
          {this.generatePort(leftPort)}
        </Box>
        <Box className={classes.columnName}>
          <RowIcon icon={icon} />
          <Box margin="auto 0">
            <span data-test="column-name">{col.name}</span>&nbsp;
            {this.state.show_details &&
            <span data-test="column-type">{cltype}</span>}
          </Box>
        </Box>
        <Box marginLeft="auto" padding="0" minHeight="0" display="flex" alignItems="center">
          {this.generatePort(rightPort)}
        </Box>
      </Box>
    );
  }

  generatePort = (port) => {
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
  };

  render() {
    let tableData = this.props.node.getData() || {};
    let tableMetaData = this.props.node.getMetadata();
    let localFkCols = [];
    (tableData.foreign_key||[]).forEach((fk)=>{
      localFkCols.push(...fk.columns.map((c)=>c.local_column));
    });
    let localUkCols = [];
    (tableData.unique_constraint||[]).forEach((uk)=>{
      localUkCols.push(...uk.columns.map((c)=>c.column));
    });
    const {classes} = this.props;
    const styles = {
      backgroundColor: tableMetaData.fillColor,
      color: tableMetaData.textColor,
    };
    return (
      <div className={clsx(classes.tableNode, (this.props.node.isSelected() ? classes.tableNodeSelected: ''))}
        onDoubleClick={()=>{this.props.node.fireEvent({}, 'editTable');}} style={styles}>
        <div className={clsx(classes.tableSection, classes.tableToolbar)}>
          <PgIconButton size="xs" title={gettext('Show Details')} icon={this.state.show_details ? <VisibilityRoundedIcon /> : <VisibilityOffRoundedIcon />}
            onClick={this.toggleShowDetails} onDoubleClick={(e)=>{e.stopPropagation();}} />
          {this.props.node.getNote() &&
            <PgIconButton size="xs" className={classes.noteBtn}
              title={gettext('Check Note')} icon={<NoteRoundedIcon />}
              onClick={()=>{
                this.props.node.fireEvent({}, 'showNote');
              }}
            />}
        </div>
        {tableMetaData.is_promise && <>
          <div className={classes.tableSection}>
            {!tableMetaData.data_failed && <div className={classes.tableNameText}>{gettext('Fetching...')}</div>}
            {tableMetaData.data_failed && <div className={clsx(classes.tableNameText, classes.error)}>{gettext('Failed to get data. Please delete this table.')}</div>}
          </div>
        </>}
        {!tableMetaData.is_promise && <>
          <div className={classes.tableSection}>
            <RowIcon icon={SchemaIcon}/>
            <div className={classes.tableNameText} data-test="schema-name">{tableData.schema}</div>
          </div>
          <div className={classes.tableSection}>
            <RowIcon icon={TableIcon} />
            <div className={classes.tableNameText} data-test="table-name">{tableData.name}</div>
          </div>
          {tableData.columns.length > 0 && <div>
            {_.map(tableData.columns, (col)=>this.generateColumn(col, localFkCols, localUkCols))}
          </div>}
        </>}
      </div>
    );
  }
}

export const TableNodeWidget = withStyles(styles)(TableNodeWidgetRaw);

TableNodeWidgetRaw.propTypes = {
  node: PropTypes.instanceOf(TableNodeModel),
  engine: PropTypes.instanceOf(DiagramEngine),
  classes: PropTypes.object,
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
