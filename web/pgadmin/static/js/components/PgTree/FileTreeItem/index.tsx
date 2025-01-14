/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as React from 'react';
import { ClasslistComposite } from 'aspen-decorations';
import { Directory, FileEntry, IItemRendererProps, ItemType, FileOrDir} from 'react-aspen';
import {IFileTreeXTriggerEvents, FileTreeXEvent } from '../types';
import { Notificar } from 'notificar';
import FileTreeItemComponent from './FileTreeItemComponent';
interface IItemRendererXProps {
    /**
     * In this implementation, decoration are null when item is `PromptHandle`
     *
     * If you would like decorations for `PromptHandle`s, then get them using `DecorationManager#getDecorations(<target>)`.
     * Where `<target>` can be either `NewFilePromptHandle.parent` or `RenamePromptHandle.target` depending on type of `PromptHandle`
     *
     * To determine the type of `PromptHandle`, use `IItemRendererProps.itemType`
     */
    decorations: ClasslistComposite
    onClick: (ev: React.MouseEvent, item: FileEntry | Directory, type: ItemType) => void
    onContextMenu: (ev: React.MouseEvent, item: FileEntry | Directory) => void
    onMouseEnter: (ev: React.MouseEvent, item: FileEntry | Directory) => void
    onMouseLeave: (ev: React.MouseEvent, item: FileEntry | Directory) => void
    onItemHovered: (ev: React.MouseEvent, item: FileEntry | Directory, type: ItemType) => void
    events: Notificar<FileTreeXEvent>
}

// DO NOT EXTEND FROM PureComponent!!! You might miss critical changes made deep within `item` prop
// as far as efficiency is concerned, `react-aspen` works hard to ensure unnecessary updates are ignored
export class FileTreeItem extends React.Component<IItemRendererXProps & IItemRendererProps> {
  public static getBoundingClientRectForItem(item: FileEntry | Directory): DOMRect {
    const divRef = FileTreeItem.itemIdToRefMap.get(item.id);
    if (divRef) {
      return divRef.getBoundingClientRect();
    }
    return null;
  }

  // ensure this syncs up with what goes in CSS, (em, px, % etc.) and what ultimately renders on the page
  public static readonly renderHeight: number = 24;
  private static readonly itemIdToRefMap: Map<number, HTMLDivElement> = new Map();
  private static readonly refToItemIdMap: Map<number, HTMLDivElement> = new Map();
  private readonly fileTreeEvent: IFileTreeXTriggerEvents;

  constructor(props) {
    super(props);
    // used to apply decoration changes, you're welcome to use setState or other mechanisms as you see fit
    this.forceUpdate = this.forceUpdate.bind(this);
  }

  public render() {
    const { item, itemType, decorations } = this.props;
    return(
      <div>
        <FileTreeItemComponent
          item={item}
          itemType={itemType}
          decorations={decorations}
          handleContextMenu={this.handleContextMenu}
          handleDragStartItem={this.handleDragStartItem}
          handleMouseEnter={this.handleMouseEnter}
          handleMouseLeave={this.handleMouseLeave}
          handleItemClicked={this.handleClick}
          handleItemDoubleClicked={this.handleDoubleClick}
          handleDivRef={this.handleDivRef}/>
      </div>
    );
  }

  public componentDidMount() {
    this.events = this.props.events;
    this.props.item.resolvedPathCache = this.props.item.parent.path + '/' + this.props.item._metadata.data.id;
    if (this.props.decorations) {
      this.props.decorations.addChangeListener(this.forceUpdate);
    }
    this.setActiveFile(this.props.item);
  }

  private readonly setActiveFile = async (FileOrDir): Promise<void> => {
    this.props.changeDirectoryCount(FileOrDir.parent);
    if(FileOrDir._loaded !== true) {
      this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'added', FileOrDir);
    }
    FileOrDir._loaded = true;
  };

  public componentWillUnmount() {
    if (this.props.decorations) {
      this.props.decorations.removeChangeListener(this.forceUpdate);
    }
  }

  public componentDidUpdate(prevProps: IItemRendererXProps) {
    if (prevProps.decorations) {
      prevProps.decorations.removeChangeListener(this.forceUpdate);
    }
    if (this.props.decorations) {
      this.props.decorations.addChangeListener(this.forceUpdate);
    }
  }

  private readonly handleDivRef = (r: HTMLDivElement) => {
    if (r === null) {
      FileTreeItem.itemIdToRefMap.delete(this.props.item.id);
    } else {
      FileTreeItem.itemIdToRefMap.set(this.props.item.id, r);
      FileTreeItem.refToItemIdMap.set(r, this.props.item);
    }
  };

  private readonly handleContextMenu = (ev: React.MouseEvent) => {
    const { item, itemType, onContextMenu } = this.props;
    if (itemType === ItemType.File || itemType === ItemType.Directory) {
      onContextMenu(ev, item as FileOrDir);
    }
  };

  private readonly handleClick = (ev: React.MouseEvent) => {
    const { item, itemType, onClick } = this.props;
    if (itemType === ItemType.File || itemType === ItemType.Directory) {
      onClick(ev, item as FileEntry, itemType);
    }
  };

  private readonly handleDoubleClick = (ev: React.MouseEvent) => {
    const { item, itemType, onDoubleClick } = this.props;
    if (itemType === ItemType.File || itemType === ItemType.Directory) {
      onDoubleClick(ev, item as FileEntry, itemType);
    }
  };

  private readonly handleMouseEnter = (ev: React.MouseEvent) => {
    const { item, itemType, onMouseEnter } = this.props;
    if (itemType === ItemType.File || itemType === ItemType.Directory) {
      onMouseEnter?.(ev, item as FileEntry);
    }
  };

  private readonly handleMouseLeave = (ev: React.MouseEvent) => {
    const { item, itemType, onMouseLeave } = this.props;
    if (itemType === ItemType.File || itemType === ItemType.Directory) {
      onMouseLeave?.(ev, item as FileEntry);
    }
  };

  private readonly handleDragStartItem = (e: React.DragEvent) => {
    const { item, itemType, events } = this.props;
    if (itemType === ItemType.File || itemType === ItemType.Directory) {
      const ref = FileTreeItem.itemIdToRefMap.get(item.id);
      if (ref) {
        events.dispatch(FileTreeXEvent.onTreeEvents, e, 'dragstart', item);
      }
    }
  };
}
