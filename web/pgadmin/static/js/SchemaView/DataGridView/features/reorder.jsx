/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';

import { SCHEMA_STATE_ACTIONS } from 'sources/SchemaView/SchemaState';

import { booleanEvaluator, registerOptionEvaluator } from '../../options';

import { ACTION_COLUMN } from './common';
import Feature from './feature';
import PropTypes from 'prop-types';


// Register the 'canReorder' options for the collection
registerOptionEvaluator('canReorder', booleanEvaluator, false, ['collection']);

export default class Reorder extends Feature {
  // Always add reorder column at the start of the columns list.
  static priority = 100;

  constructor() {
    super();
    this.canReorder = false;
    this.hoverIndex = null;
    this.moveRow = null;
  }

  setHoverIndex(index) {
    this.hoverIndex = index;
  }

  generateColumns({columns, columnVisibility, options}) {
    this.canReorder = options.canReorder;

    if (!this.canReorder) return;

    columnVisibility['reorder-cell'] = true;

    const Cell = function({row}) {
      const dragHandleRef = row?.reorderDragHandleRef;
      const handlerId = row?.dragHandlerId;

      if (!dragHandleRef)  return <></>;

      return (
        <div
          className='reorder-cell'
          data-handler-id={handlerId}
          ref={dragHandleRef ? dragHandleRef : null}>
          <DragIndicatorRoundedIcon fontSize="small" />
        </div>
      );
    };

    Cell.displayName = 'ReorderCell';
    Cell.propTypes = {
      row: PropTypes.object,
    };

    columns.splice(0, 0, {
      ...ACTION_COLUMN,
      id: 'btn-reorder',
      dataType: 'reorder',
      cell: Cell,
    });
  }

  onTable() {
    if (this.canReorder) {
      this.moveRow = (dragIndex, hoverIndex) => {
        this.dataDispatch?.({
          type: SCHEMA_STATE_ACTIONS.MOVE_ROW,
          path: this.accessPath,
          oldIndex: dragIndex,
          newIndex: hoverIndex,
        });
      };
    }
  }

  onRow({index, row, rowRef, classList}) {
    const instance = this;
    const reorderDragHandleRef = useRef(null);

    const [{ handlerId }, drop] = useDrop({
      accept: 'row',
      collect(monitor) {
        return {
          handlerId: monitor.getHandlerId(),
        };
      },
      hover(item, monitor) {
        if (!rowRef.current) return;

        item.hoverIndex = null;
        // Don't replace items with themselves
        if (item.index === index) return;

        // Determine rectangle on screen
        const hoverBoundry = rowRef.current?.getBoundingClientRect();

        // Determine mouse position
        const clientOffset = monitor.getClientOffset();

        // Get pixels to the top
        const hoverClientY = clientOffset.y - hoverBoundry.top;

        // Only perform the move when the mouse has crossed certain part of the
        // items height dragging downwards.
        if (
          item.index < index &&
          hoverClientY < (hoverBoundry.bottom - hoverBoundry.top)/3
        ) return;

        // Dragging upwards
        if (
          item.index > index &&
          hoverClientY > ((hoverBoundry.bottom - hoverBoundry.top) * 2 / 3)
        ) return;

        instance.setHoverIndex(index);
        item.hoverIndex = index;
      },
    });

    const [, drag, preview] = useDrag({
      type: 'row',
      item: () => {
        return {index};
      },
      end: (item) => {
        // Time to actually perform the action
        instance.setHoverIndex(null);
        if(item.hoverIndex >= 0) {
          instance.moveRow(item.index, item.hoverIndex);
        }
      }
    });

    if (!this.canReorder || !row) return;

    if (row)
      row.reorderDragHandleRef = reorderDragHandleRef;

    drag(row.reorderDragHandleRef);
    drop(rowRef);
    preview(rowRef);

    if (index == this.hoverIndex) {
      classList?.append('DataGridView-tableRowHovered');
    }

    row.dragHandlerId = handlerId;
  }
}
