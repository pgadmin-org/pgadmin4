import * as React from 'react';
import {
  FileTree,
  Directory,
  FileEntry,
  ItemType,
  IFileTreeHandle,
  WatchEvent,
  FileType,
  IItemRendererProps,
  FileOrDir
} from 'react-aspen';
import { Decoration, TargetMatchMode } from 'aspen-decorations';
import { FileTreeItem } from '../FileTreeItem';
import { Notificar, DisposablesComposite } from 'notificar';
import { IFileTreeXHandle, IFileTreeXProps, FileTreeXEvent, IFileTreeXTriggerEvents } from '../types';
import { KeyboardHotkeys } from '../services/keyboardHotkeys';
import { TreeModelX } from '../TreeModelX';
import AutoSizer from 'react-virtualized-auto-sizer';

export class FileTreeX extends React.Component<IFileTreeXProps> {
  private fileTreeHandle: IFileTreeXHandle;
  private activeFileDec: Decoration;
  private pseudoActiveFileDec: Decoration;
  private activeFile: FileOrDir;
  private pseudoActiveFile: FileOrDir;
  private wrapperRef: React.RefObject<HTMLDivElement> = React.createRef();
  private events: Notificar<FileTreeXEvent>;
  private disposables: DisposablesComposite;
  private keyboardHotkeys: KeyboardHotkeys;
  private fileTreeEvent: IFileTreeXTriggerEvents;
  private hoverTimeoutId: React.RefObject<number|null> = React.createRef<number|null>();
  private hoverDispatchId: React.RefObject<number|null> = React.createRef<number|null>();
  constructor(props: IFileTreeXProps) {
    super(props);
    this.events = new Notificar();
    this.disposables = new DisposablesComposite();
    this.activeFileDec = new Decoration('active');
    this.pseudoActiveFileDec = new Decoration('pseudo-active');
  }

  render() {
    const { height, model, disableCache } = this.props;
    const { decorations } = model;

    return <div
      onKeyDown={this.handleKeyDown}
      className='file-tree'
      onBlur={this.handleBlur}
      onClick={this.handleClick}
      onScroll={this.props.onScroll}
      ref={this.wrapperRef}
      style={{
        height: height ? height : 'calc(100vh - 60px)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }}
      tabIndex={-1}>
      <AutoSizer onResize={this.onResize}>
        {({ width, height }) => (
          <FileTree
            height={height}
            width={width}
            model={model}
            itemHeight={FileTreeItem.renderHeight}
            onReady={this.handleTreeReady}
            disableCache={disableCache ? disableCache : false}
          >
            {(props: IItemRendererProps) => <FileTreeItem
              item={props.item}
              itemType={props.itemType}
              decorations={decorations.getDecorations(props.item as FileEntry|Directory)}
              onClick={this.handleItemClicked}
              onDoubleClick={this.handleItemDoubleClicked}
              onContextMenu={this.handleItemCtxMenu}
              onMouseEnter={this.onItemMouseEnter}
              onMouseLeave={this.onItemMouseLeave}
              changeDirectoryCount={this.changeDirectoryCount}
              events={this.events}/>}
          </FileTree>
        )}
      </AutoSizer>
    </div>;
  }

  public componentDidMount() {
    for(const child of this.props.model.root.children) {
      this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'loaded', child);
    }
  }

  componentWillUnmount() {
    const { model } = this.props;
    model.decorations.removeDecoration(this.activeFileDec);
    model.decorations.removeDecoration(this.pseudoActiveFileDec);
    this.disposables.dispose();
  }

  private handleTreeEvent = () => {
    this.fileTreeEvent = this.props.onEvent;
  };

  private handleTreeReady = (handle: IFileTreeHandle) => {
    const { onReady, model } = this.props;
    const scrollDiv = this.wrapperRef.current?.querySelector('div')?.querySelector('div');
    if(this.props.onScroll) {
      scrollDiv?.addEventListener('scroll', (ev: any)=>this.props.onScroll?.(ev));
    }

    this.fileTreeHandle = {
      ...handle,
      getModel: () => this.props.model,
      getActiveFile: () => this.activeFile,
      setActiveFile: this.setActiveFile,
      getPseudoActiveFile: () => this.pseudoActiveFile,
      setPseudoActiveFile: this.setPseudoActiveFile,
      toggleDirectory: this.toggleDirectory,
      closeDir: this.closeDir,
      newFile: async (dirOrPath: Directory | string) => this.supervisePrompt(await handle.promptNewFile(dirOrPath as string)),
      newFolder: async (dirOrPath: Directory | string) => this.supervisePrompt(await handle.promptNewDirectory(dirOrPath as string)),
      onBlur: (callback) => this.events.add(FileTreeXEvent.OnBlur, callback),
      hasDirectFocus: () => this.wrapperRef.current === document.activeElement,
      first: this.first,
      parent: this.parent,
      hasParent: this.hasParent,
      isOpen: this.isOpen,
      isClosed: this.isClosed,
      itemData: this.itemData,
      children: this.children,
      getItemFromDOM: this.getItemFromDOM,
      getDOMFromItem: this.getDOMFromItem,
      onTreeEvents: (callback) => this.events.add(FileTreeXEvent.onTreeEvents, callback),
      addIcon: this.addIcon,
      addCssClass: this.addCssClass,
      create: this.create,
      remove: this.remove,
      update: this.update,
      refresh: this.refresh,
      setLabel: this.setLabel,
      unload: this.unload,
      deSelectActiveFile: this.deSelectActiveFile,
      resize: this.resize,
      showLoader: this.showLoader,
      hideLoader: this.hideLoader,
    };

    model.decorations.addDecoration(this.activeFileDec);
    model.decorations.addDecoration(this.pseudoActiveFileDec);

    this.disposables.add(this.fileTreeHandle.onDidChangeModel((prevModel: TreeModelX, newModel: TreeModelX) => {
      this.setActiveFile(null);
      this.setPseudoActiveFile(null);
      prevModel.decorations.removeDecoration(this.activeFileDec);
      prevModel.decorations.removeDecoration(this.pseudoActiveFileDec);
      newModel.decorations.addDecoration(this.activeFileDec);
      newModel.decorations.addDecoration(this.pseudoActiveFileDec);
    }));

    this.disposables.add(this.fileTreeHandle.onBlur(() => {
      this.setPseudoActiveFile(null);
    }));

    this.keyboardHotkeys = new KeyboardHotkeys(this.fileTreeHandle, this.events);

    if (typeof onReady === 'function') {
      onReady(this.fileTreeHandle);
    }
  };

  private onItemMouseEnter = (ev: React.MouseEvent, item: FileEntry | Directory) => {
    clearTimeout(this.hoverDispatchId.current??undefined);
    (this.hoverDispatchId as any).current = setTimeout(()=>{
      clearTimeout(this.hoverTimeoutId.current??undefined);
      this.events.dispatch(FileTreeXEvent.onTreeEvents, ev, 'hovered', item);
    }, 500);
  };

  private onItemMouseLeave = (ev: React.MouseEvent) => {
    clearTimeout(this.hoverTimeoutId.current??undefined);
    clearTimeout(this.hoverDispatchId.current??undefined);
    (this.hoverTimeoutId as any).current = setTimeout(()=>{
      this.events.dispatch(FileTreeXEvent.onTreeEvents, ev, 'hovered', null);
    }, 100);
  };

  private setActiveFile = async (fileOrDirOrPath: FileOrDir | string, ensureVisible, align): Promise<void> => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === this.props.model.root) { return; }
    if (this.activeFile !== fileH) {
      if (this.activeFile) {
        this.activeFileDec.removeTarget(this.activeFile);
      }
      if (fileH) {
        this.activeFileDec.addTarget(fileH as Directory, TargetMatchMode.Self);
      }
      this.activeFile = fileH;
      this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'selected', fileH);

      if (fileH && ensureVisible === true) {
        const alignTree = align !== undefined && align !== null ? align : 'auto';
        await this.fileTreeHandle.ensureVisible(fileH, alignTree);
      }
    }
  };

  private ensureVisible = async (fileOrDirOrPath: FileOrDir | string): Promise<void> => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH) {
      await this.fileTreeHandle.ensureVisible(fileH);
    }
  };

  private deSelectActiveFile = async (fileOrDirOrPath: FileOrDir | string): Promise<void> => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === this.props.model.root) { return; }
    if (this.activeFile === fileH) {
      this.activeFileDec.removeTarget(this.activeFile);
      this.activeFile = null;
    }
  };

  private setPseudoActiveFile = async (fileOrDirOrPath: FileOrDir | string): Promise<void> => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === this.props.model.root) { return; }
    if (this.pseudoActiveFile !== fileH) {
      if (this.pseudoActiveFile) {
        this.pseudoActiveFileDec.removeTarget(this.pseudoActiveFile);
      }
      if (fileH) {
        this.pseudoActiveFileDec.addTarget(fileH as Directory, TargetMatchMode.Self);
      }
      this.pseudoActiveFile = fileH;
    }
    if (fileH) {
      await this.fileTreeHandle.ensureVisible(fileH);
    }
    this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'selected', fileH);
  };

  private create = async (parentDir, itemData): Promise<void> => {
    if (parentDir == undefined || parentDir == null) {
      parentDir = this.props.model.root;
    }
    const {create, model } = this.props;
    const isOpen = parentDir.isExpanded;
    let maybeFile = undefined;

    if (isOpen && (parentDir._children == null || parentDir._children.length == 0)) {
      await this.fileTreeHandle.closeDirectory(parentDir as Directory);
    }
    if (!parentDir.isExpanded && (parentDir._children == null || parentDir._children.length == 0)) {
      await this.fileTreeHandle.openDirectory(parentDir as Directory);
    } else {
      await this.fileTreeHandle.openDirectory(parentDir as Directory);
      maybeFile = await create(parentDir.path, itemData);
      if (maybeFile && maybeFile.type && maybeFile.name) {
        model.root.inotify({
          type: WatchEvent.Added,
          directory: parentDir.path,
          file: maybeFile,
        });
      }
    }
    this.changeDirectoryCount(parentDir);
    const newItem = parentDir._children.find((c) => c._metadata.data.id === itemData.id);
    newItem.resolvedPathCache = newItem.parent.path + '/' + newItem._metadata.data.id;
    return newItem;
  };

  private update = async (item, itemData): Promise<void> => {
    item._metadata.data = itemData;
    await this.props.update(item.path, itemData);
    this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'updated', item);
  };

  private refresh = async (item): Promise<void> => {
    const isOpen = item.isExpanded;
    if (item.children && item.children.length > 0) {
      for(const entry of item.children) {
        await this.remove(entry).then(() => {/*intentional*/}, () => {console.warn('Error removing item');});
      }
    }
    if (isOpen) {
      const ref = FileTreeItem.itemIdToRefMap.get(item.id);

      if (ref) {
        this.showLoader(ref);
      }

      await this.fileTreeHandle.closeDirectory(item as Directory);
      await this.fileTreeHandle.openDirectory(item as Directory);
      await this.changeResolvePath(item as Directory);
      this.changeDirectoryCount(item);

      if (ref) {
        this.hideLoader(ref);
      }
    }
  };

  private unload = async (item): Promise<void> => {
    const isOpen = item.isExpanded;
    if (item.children && item.children.length > 0) {
      for(const entry of item.children) {
        await this.remove(entry).then(() => {/*intentional*/}, error => {console.warn(error);});
      }
    }
    if (isOpen) {
      await this.fileTreeHandle.closeDirectory(item as Directory);
      this.changeDirectoryCount(item);
    }
  };

  private remove = async (item): Promise<void> => {
    const {remove, model } = this.props;
    const path = item.path;
    await remove(path, false);
    const dirName = model.root.pathfx.dirname(path);
    const fileName = model.root.pathfx.basename(path);
    const parent = item.parent;
    if (dirName === parent.path) {
      const item_1 = parent._children.find((c) => c._metadata && c._metadata.data.id === fileName);
      if (item_1) {
        parent.unlinkItem(item_1);
        if (parent._children.length == 0) { parent._children = null; }
        this.changeDirectoryCount(parent);
        this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'removed', item);
      }
      else {
        console.warn('Item not found');
      }
    }
  };

  private first = async (fileOrDirOrPath: FileOrDir | string) => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === undefined || fileH === null) { return this.props.model.root.children[0]; }

    if (fileH.branchSize > 0) {
      return fileH.children[0];
    }
    return null;
  };

  private parent = async (fileOrDirOrPath: FileOrDir | string) => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === FileType.Directory || fileH === FileType.File) {
      return fileH.parent;
    }

    return null;
  };


  private hasParent = async (fileOrDirOrPath: FileOrDir | string) => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === FileType.Directory || fileH === FileType.File) {
      return fileH.parent ? true : false;
    }

    return false;
  };

  private children = async (fileOrDirOrPath: FileOrDir | string) => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === FileType.Directory) {
      return fileH.children;
    }

    return null;
  };


  private isOpen = async (fileOrDirOrPath: FileOrDir | string) => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === FileType.Directory) {
      return fileH.isExpanded;
    }

    return false;
  };

  private isClosed = async (fileOrDirOrPath: FileOrDir | string) => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === FileType.Directory || fileH === FileType.File) {
      return !fileH.isExpanded;
    }

    return false;
  };

  private itemData = async (fileOrDirOrPath: FileOrDir | string) => {
    const fileH = typeof fileOrDirOrPath === 'string'
      ? await this.fileTreeHandle.getFileHandle(fileOrDirOrPath)
      : fileOrDirOrPath;

    if (fileH === FileType.Directory || fileH === FileType.File) {
      return fileH._metadata.data;
    }

    return null;
  };

  private setLabel = async(pathOrDir: string | Directory, label: string): Promise<void> => {
    const dir = typeof pathOrDir === 'string'
      ? await this.fileTreeHandle.getFileHandle(pathOrDir)
      : pathOrDir;

    const ref = FileTreeItem.itemIdToRefMap.get(dir.id);
    if (ref) {
      ref.style.background = 'none';
      const label$ = ref.querySelector('span.file-name') as HTMLDivElement;

      if (label$) {
        if (typeof(label) == 'object' && label.label) {
          label = label.label;
        }
        label$.innerHTML = label;
      }

    }

  };

  private changeDirectoryCount = async(pathOrDir: string | Directory): Promise<void> => {
    const dir = typeof pathOrDir === 'string'
      ? await this.fileTreeHandle.getFileHandle(pathOrDir)
      : pathOrDir;

    if (dir.type === FileType.Directory && dir._metadata.data && dir._metadata.data.is_collection === true) {
      const ref = FileTreeItem.itemIdToRefMap.get(dir.id);
      if (ref) {
        ref.style.background = 'none';
        const label$ = ref.querySelector('span.children-count') as HTMLDivElement;
        if(dir.children && dir.children.length > 0) {
          label$.innerHTML = '(' + dir.children.length + ')';
        } else {
          label$.innerHTML = '';
        }
      }
    }

  };

  private closeDir = async (pathOrDir: string | Directory) => {
    const dir = typeof pathOrDir === 'string'
      ? await this.fileTreeHandle.getFileHandle(pathOrDir)
      : pathOrDir;

    if (dir.type === FileType.Directory) {
      if ((dir as Directory).expanded) {
        this.fileTreeHandle.closeDirectory(dir as Directory);
        this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'closed', dir);

      }
    }
  };

  private toggleDirectory = async (pathOrDir: string | Directory) => {
    const dir = typeof pathOrDir === 'string'
      ? await this.fileTreeHandle.getFileHandle(pathOrDir)
      : pathOrDir;

    if (dir.type === FileType.Directory) {
      if ((dir as Directory).expanded) {
        this.fileTreeHandle.closeDirectory(dir as Directory);
        this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'closed', dir);

      } else {
        const ref = FileTreeItem.itemIdToRefMap.get(dir.id);
        if (ref) {
          this.showLoader(ref);
        }

        await this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'beforeopen', dir);
        await this.fileTreeHandle.openDirectory(dir as Directory);
        await this.changeResolvePath(dir as Directory);

        if (ref) {
          this.hideLoader(ref);
        }

        this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'opened', dir);
      }
    }
  };

  private addIcon = async (pathOrDir: string | Directory, icon) => {
    const dir = typeof pathOrDir === 'string'
      ? await this.fileTreeHandle.getFileHandle(pathOrDir)
      : pathOrDir;

    const ref = FileTreeItem.itemIdToRefMap.get(dir.id);
    if (ref) {
      const label$ = ref.querySelector('.file-label i') as HTMLDivElement;
      label$.className = icon.icon;
    }

  };

  private addCssClass = async (pathOrDir: string | Directory, cssClass) => {
    const dir = typeof pathOrDir === 'string'
      ? await this.fileTreeHandle.getFileHandle(pathOrDir)
      : pathOrDir;

    const ref = FileTreeItem.itemIdToRefMap.get(dir.id);
    if (ref) {
      ref.classList.add(cssClass);
      if (!dir._metadata.data.extraClasses)
        dir._metadata.data.extraClasses = [];

      dir._metadata.data.extraClasses.push(cssClass);
    }

  };

  private showLoader = (ref: HTMLDivElement) => {
    // get label ref and add loading class
    ref.style.background = 'none';
    const label$ = ref.querySelector('i.directory-toggle') as HTMLDivElement;
    if (label$)  label$.classList.add('loading');
  };

  private hideLoader = (ref: HTMLDivElement) => {
    // remove loading class.
    ref.style.background = 'none';
    const label$ = ref.querySelector('i.directory-toggle') as HTMLDivElement;
    if (label$) label$.classList.remove('loading');
  };

  private handleBlur = () => {
    this.events.dispatch(FileTreeXEvent.OnBlur);
  };

  private handleItemClicked = async (ev: React.MouseEvent, item: FileOrDir, type: ItemType) => {
    if (type === ItemType.Directory && ev.target.className.includes('directory-toggle')) {
      await this.toggleDirectory(item as Directory);
    }
    await this.setActiveFile(item as FileEntry);

  };

  private handleItemDoubleClicked = async (ev: React.MouseEvent, item: FileOrDir) => {
    await this.toggleDirectory(item as Directory);
    await this.setActiveFile(item as FileEntry);

  };

  private getItemFromDOM = (clientReact) => {
    return FileTreeItem.refToItemIdMap.get(clientReact);
  };

  private getDOMFromItem = (item: FileOrDir) => {
    return FileTreeItem.itemIdToRefMap.get(item.id);
  };

  private handleClick = (ev: React.MouseEvent) => {
    // clicked in "blank space"
    if (ev.currentTarget === ev.target) {
      this.setPseudoActiveFile(null);
    }
  };

  private handleItemCtxMenu = (ev: React.MouseEvent, item: FileOrDir) => {
    return this.props.onContextMenu?.(ev, item);
  };

  private handleKeyDown = (ev: React.KeyboardEvent) => {
    return this.keyboardHotkeys.handleKeyDown(ev);
  };

  private onResize = () => {
    if (this.wrapperRef.current != null) {
      this.resize();
    }
  };

  private resize = (scrollX, scrollY) => {
    const scrollXPos = scrollX ? scrollX : 0;
    const scrollYPos = scrollY ? scrollY : this.props.model.state.scrollOffset;
    const div = this.wrapperRef.current.querySelector('div').querySelector('div') as HTMLDivElement;
    div.scroll(scrollXPos, scrollYPos);

  };

  private changeResolvePath = async (item: FileOrDir): Promise<void> => {
    // Change the path as per pgAdmin requirement: Item Id wise
    if (item.type === FileType.File) {
      item.resolvedPathCache = item.parent.path + '/' + item._metadata.data.id;
    }
    if (item.type === FileType.Directory && item.children && item.children.length > 0) {
      for(const entry of item.children) {
        entry.resolvedPathCache = entry.parent.path + '/' + entry._metadata.data.id;
      }
    }
  };
}

export { IFileTreeXHandle, IFileTreeXProps };
