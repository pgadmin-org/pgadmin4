/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { forwardRef, useContext } from 'react';
import {
  RightAngleLinkModel,
  RightAngleLinkWidget,
  DefaultLinkFactory,
  PortModelAlignment,
  LinkWidget,
  PointModel,
} from '@projectstorm/react-diagrams';
import {Point} from '@projectstorm/geometry';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import { ERDCanvasSettings } from '../components/ERDTool';
import { keyframes } from '@emotion/react';

export const POINTER_SIZE = 30;

export const OneToManyModel = {
  local_table_uid: undefined,
  local_column_attnum: undefined,
  referenced_table_uid: undefined,
  referenced_column_attnum: undefined,
};

export class OneToManyLinkModel extends RightAngleLinkModel {
  constructor({data, ...options}) {
    super({
      type: 'onetomany',
      width: 1,
      class: 'link-onetomany',
      locked: true,
      ...options,
    });

    this._data = {
      ...data,
    };
  }

  getData() {
    return this._data;
  }

  setData(data) {
    this._data = data;
  }

  serializeData(nodesDict) {
    let data = this.getData();
    let target = nodesDict[data['local_table_uid']].getData();
    let source = nodesDict[data['referenced_table_uid']].getData();
    return {
      'schema': target.schema,
      'table': target.name,
      'remote_schema': source.schema,
      'remote_table': source.name,
      'columns': [{
        'local_column': _.find(target.columns, (col)=>data.local_column_attnum == col.attnum).name,
        'referenced': _.find(source.columns, (col)=>data.referenced_column_attnum == col.attnum).name,
      }],
    };
  }

  serialize() {
    return {
      ...super.serialize(),
      data: this.getData(),
    };
  }
}

const svgLinkSelected =   keyframes`
  from { stroke-dashoffset: 24;}
  to { stroke-dashoffset: 0; }
`;

const StyledG = styled('g')((
  {
    theme
  }
) => ({

  '& .OneToMany-svgLink': {
    stroke: theme.palette.text.primary,
    fontSize: '0.8em',
  },
  '& .OneToMany-svgLinkCircle': {
    fill: theme.palette.text.primary,
  },

  '& .OneToMany-svgLinkSelected': {
    strokeDasharray: '10, 2',
    animation: `${svgLinkSelected} 1s linear infinite`
  },
  '& .OneToMany-svgLinkPath': {
    pointerEvents: 'all',
    cursor: 'move',
  }
}));


function ChenNotation({rotation, type}) {

  const textX = Math.sign(rotation) > 0 ? -14 : 8;
  const textY = -5;
  return (
    <>
      <text className='OneToMany-svgLink' x={textX} y={textY} transform={'rotate(' + -rotation + ')' }>
        {type == 'one' ? '1' : 'N'}
      </text>
      <line className='OneToMany-svgLink' x1="0" y1="0" x2="0" y2="30"></line>
    </>
  );
}
ChenNotation.propTypes = {
  rotation: PropTypes.number,
  type: PropTypes.string,
};

function CustomLinkEndWidget(props) {
  const { point, rotation, tx, ty, type } = props;

  const settings = useContext(ERDCanvasSettings);

  const svgForType = (itype) => {
    if(settings.cardinality_notation == 'chen') {
      return <ChenNotation rotation={rotation} type={itype} />;
    }
    if(itype == 'many') {
      return (
        <>
          <circle className={['OneToMany-svgLink','OneToMany-svgLinkCircle'].join(' ')} cx="0" cy="16" r={props.width*2.5} strokeWidth={props.width} />
          <polyline className='OneToMany-svgLink' points="-8,0 0,15 0,0 0,30 0,15 8,0" fill="none" strokeWidth={props.width} />
        </>
      );
    } else if (itype == 'one') {
      return (
        <polyline className='OneToMany-svgLink' points="-8,15 0,15 0,0 0,30 0,15 8,15" fill="none" strokeWidth={props.width} />
      );
    }
  };

  return (
    <g transform={'translate(' + point.getPosition().x + ', ' + point.getPosition().y + ')'}>
      <g transform={'translate('+tx+','+ty+')'}>
        <g transform={'rotate(' + rotation + ')' }>
          {svgForType(type)}
        </g>
      </g>
    </g>
  );
}

CustomLinkEndWidget.propTypes = {
  point: PropTypes.instanceOf(PointModel).isRequired,
  rotation: PropTypes.number.isRequired,
  tx: PropTypes.number.isRequired,
  ty: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['many', 'one']).isRequired,
  width: PropTypes.number,
};

export class OneToManyLinkWidget extends RightAngleLinkWidget {
  constructor(props) {
    super(props);
  }

  endPointTranslation(alignment) {
    let degree = 0;
    let tx = 0, ty = 0;
    switch(alignment) {
    case PortModelAlignment.BOTTOM:
      ty = -POINTER_SIZE;
      break;
    case PortModelAlignment.LEFT:
      degree = 90;
      tx = POINTER_SIZE;
      break;
    case PortModelAlignment.TOP:
      degree = 180;
      ty = POINTER_SIZE;
      break;
    case PortModelAlignment.RIGHT:
      degree = -90;
      tx = -POINTER_SIZE;
      break;
    }
    return [degree, tx, ty];
  }

  addCustomWidgetPoint(type, endpoint, point) {
    const [rotation, tx, ty] = this.endPointTranslation(endpoint.options.alignment);
    if(!point) {
      point = this.props.link.point(
        endpoint.getX()-tx, endpoint.getY()-ty, {'one': 1, 'many': 2}[type]
      );
    } else {
      point.setPosition(endpoint.getX()-tx, endpoint.getY()-ty);
    }

    return {
      type: type,
      point: point,
      rotation: rotation,
      tx: tx,
      ty: ty,
    };
  }

  generateCustomEndWidget({type, point, rotation, tx, ty}) {
    return (
      <CustomLinkEndWidget
        key={point.getID()}
        point={point}
        rotation={rotation}
        tx={tx}
        ty={ty}
        type={type}
        colorSelected={this.props.link.getOptions().selectedColor}
        color={this.props.link.getOptions().color}
        width={this.props.width}
      />
    );
  }

  draggingEvent(event, index) {
    let points = this.props.link.getPoints();
    // get moving difference. Index + 1 will work because links indexes has
    // length = points.lenght - 1
    let dx = Math.abs(points[index].getX() - points[index + 1].getX());
    let dy = Math.abs(points[index].getY() - points[index + 1].getY());

    // moving with y direction
    if (dx === 0) {
      this.calculatePositions(points, event, index, 'x');
    } else if (dy === 0) {
      this.calculatePositions(points, event, index, 'y');
    }
    this.props.link.setFirstAndLastPathsDirection();
  }

  handleMove = function(event) {
    this.props.link.getTargetPort();
    this.draggingEvent(event, this.dragging_index);
    this.props.link.fireEvent({}, 'positionChanged');
  }.bind(this);

  render() {
    //ensure id is present for all points on the path
    let points = this.props.link.getPoints();
    let paths = [];

    let onePoint = this.addCustomWidgetPoint('one', this.props.link.getSourcePort(), points[0]);
    let manyPoint = this.addCustomWidgetPoint('many', this.props.link.getTargetPort(), points[points.length-1]);

    if (!this.state.canDrag && points.length > 2) {
      // Those points and its position only will be moved
      for (let i = 1; i < points.length; i += points.length - 2) {
        if (i - 1 === 0) {
          if (this.props.link.getFirstPathXdirection()) {
            points[i].setPosition(points[i].getX(), points[i - 1].getY());
          } else {
            points[i].setPosition(points[i - 1].getX(), points[i].getY());
          }
        } else if (this.props.link.getLastPathXdirection()) {
          points[i - 1].setPosition(points[i - 1].getX(), points[i].getY());
        } else {
          points[i - 1].setPosition(points[i].getX(), points[i - 1].getY());
        }
      }
    }

    // If there is existing link which has two points add one
    if (points.length === 2 && !this.state.canDrag && onePoint.point.getX() != manyPoint.point.getX()) {
      this.props.link.addPoint(
        new PointModel({
          link: this.props.link,
          position: new Point(onePoint.point.getX(), manyPoint.point.getY()),
        })
      );
    }

    paths.push(this.generateCustomEndWidget(onePoint));

    for (let j = 0; j < points.length - 1; j++) {
      paths.push(
        this.generateLink(
          LinkWidget.generateLinePath(points[j], points[j + 1]),
          {
            'data-linkid': this.props.link.getID(),
            'data-point': j,
            onMouseDown: (event) => {
              if (event.button === 0) {
                this.setState({ canDrag: true });
                this.dragging_index = j;
                // Register mouse move event to track mouse position
                // On mouse up these events are unregistered check "this.handleUp"
                window.addEventListener('mousemove', this.handleMove);
                window.addEventListener('mouseup', this.handleUp);
              }
            },
            onMouseEnter: () => {
              this.setState({ selected: true });
              this.props.link.lastHoverIndexOfPath = j;
            },
          },
          j
        )
      );
    }
    paths.push(this.generateCustomEndWidget(manyPoint));

    this.refPaths = [];
    return <StyledG data-default-link-test={this.props.link.getOptions().testName}>{paths}</StyledG>;
  }
}

const LinkSegment = forwardRef(({model, selected, path, ...props}, ref)=>{

  return (
    <path
      ref={ref}
      className={['OneToMany-svgLink','OneToMany-svgLinkPath', (selected ? 'OneToMany-svgLinkSelected' : '')].join(' ')}
      stroke={model.getOptions().color}
      strokeWidth={model.getOptions().width}
      selected={selected}
      d={path}
      {...props}
    >
    </path>
  );
});
LinkSegment.displayName = 'LinkSegment';
LinkSegment.propTypes = {
  model: PropTypes.object,
  selected: PropTypes.bool,
  path: PropTypes.any,
};


export class OneToManyLinkFactory extends DefaultLinkFactory {
  constructor() {
    super('onetomany');
  }

  generateModel(event) {
    return new OneToManyLinkModel(event.initialConfig);
  }

  generateReactWidget(event) {
    return <OneToManyLinkWidget width={1} smooth={true} link={event.model} diagramEngine={this.engine} factory={this} />;
  }

  generateLinkSegment(model, selected, path) {
    return <LinkSegment model={model} selected={selected} path={path} />;
  }
}
