import cn from 'classnames'
import * as React from 'react'
import { ClasslistComposite } from 'aspen-decorations'
import { Directory, FileEntry, IItemRendererProps, ItemType, PromptHandle, RenamePromptHandle, FileType, FileOrDir} from 'react-aspen'
import {IFileTreeXTriggerEvents, FileTreeXEvent } from '../types'
import _ from 'lodash'
import { Notificar } from 'notificar'

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
    events: Notificar<FileTreeXEvent>
}

// DO NOT EXTEND FROM PureComponent!!! You might miss critical changes made deep within `item` prop
// as far as efficiency is concerned, `react-aspen` works hard to ensure unnecessary updates are ignored
export class FileTreeItem extends React.Component<IItemRendererXProps & IItemRendererProps> {
    public static getBoundingClientRectForItem(item: FileEntry | Directory): ClientRect {
        const divRef = FileTreeItem.itemIdToRefMap.get(item.id)
        if (divRef) {
            return divRef.getBoundingClientRect()
        }
        return null
    }

    // ensure this syncs up with what goes in CSS, (em, px, % etc.) and what ultimately renders on the page
    public static readonly renderHeight: number = 24
    private static readonly itemIdToRefMap: Map<number, HTMLDivElement> = new Map()
    private static readonly refToItemIdMap: Map<number, HTMLDivElement> = new Map()
    private fileTreeEvent: IFileTreeXTriggerEvents

    constructor(props) {
        super(props)
        // used to apply decoration changes, you're welcome to use setState or other mechanisms as you see fit
        this.forceUpdate = this.forceUpdate.bind(this)
    }

    public render() {
        const { item, itemType, decorations } = this.props

        const isRenamePrompt = itemType === ItemType.RenamePrompt
        const isNewPrompt = itemType === ItemType.NewDirectoryPrompt || itemType === ItemType.NewFilePrompt
        const isPrompt = isRenamePrompt || isNewPrompt
        const isDirExpanded = itemType === ItemType.Directory
            ? (item as Directory).expanded
            : itemType === ItemType.RenamePrompt && (item as RenamePromptHandle).target.type === FileType.Directory
                ? ((item as RenamePromptHandle).target as Directory).expanded
                : false

        const fileOrDir =
            (itemType === ItemType.File ||
                itemType === ItemType.NewFilePrompt ||
                (itemType === ItemType.RenamePrompt && (item as RenamePromptHandle).target.constructor === FileEntry))
                ? 'file'
                : 'directory'

        if (this.props.item.parent && this.props.item.parent.path) {
          this.props.item.resolvedPathCache = this.props.item.parent.path + "/" + this.props.item._metadata.data.id
        }

        const itemChildren = item.children && item.children.length > 0 && item._metadata.data._type.indexOf('coll-') !== -1 ? "(" + item.children.length + ")" : ""
        const is_root = this.props.item.parent.path === '/browser'
        const extraClasses = item._metadata.data.extraClasses ? item._metadata.data.extraClasses.join(' ') : ''

        return (
            <div
                className={cn('file-entry', {
                    renaming: isRenamePrompt,
                    prompt: isRenamePrompt || isNewPrompt,
                    new: isNewPrompt,
                }, fileOrDir, decorations ? decorations.classlist : null, `depth-${item.depth}`, extraClasses)}
                data-depth={item.depth}
                onContextMenu={this.handleContextMenu}
                onClick={this.handleClick}
                onDoubleClick={this.handleDoubleClick}
                onDragStart={this.handleDragStartItem}
                // required for rendering context menus when opened through context menu button on keyboard
                ref={this.handleDivRef}
                draggable={true}>

                {!isNewPrompt && fileOrDir === 'directory' ?
                    <i className={cn('directory-toggle', isDirExpanded ? 'open' : '')} />
                    : null
                }

                <span className='file-label'>
                    {
                        item._metadata && item._metadata.data.icon ?
                        <i className={cn('file-icon', item._metadata && item._metadata.data.icon ? item._metadata.data.icon : fileOrDir)} /> : null
                    }
                    <span className='file-name'>
                        { _.unescape(this.props.item.getMetadata('data')._label)}
                        <span className='children-count'>{itemChildren}</span>
                    </span>

                </span>
            </div>)
    }

    public componentDidMount() {
        this.events = this.props.events
        this.props.item.resolvedPathCache = this.props.item.parent.path + "/" + this.props.item._metadata.data.id
        if (this.props.decorations) {
            this.props.decorations.addChangeListener(this.forceUpdate)
        }
        this.setActiveFile(this.props.item)
    }

    private setActiveFile = async (FileOrDir): Promise<void> => {
        this.props.changeDirectoryCount(FileOrDir.parent)
        if(FileOrDir._loaded !== true) {
            this.events.dispatch(FileTreeXEvent.onTreeEvents, window.event, 'added', FileOrDir)
        }
        FileOrDir._loaded = true
    }

    public componentWillUnmount() {
        if (this.props.decorations) {
            this.props.decorations.removeChangeListener(this.forceUpdate)
        }
    }

    public componentDidUpdate(prevProps: IItemRendererXProps) {
        if (prevProps.decorations) {
            prevProps.decorations.removeChangeListener(this.forceUpdate)
        }
        if (this.props.decorations) {
            this.props.decorations.addChangeListener(this.forceUpdate)
        }
    }

    private handleDivRef = (r: HTMLDivElement) => {
        if (r === null) {
            FileTreeItem.itemIdToRefMap.delete(this.props.item.id)
        } else {
            FileTreeItem.itemIdToRefMap.set(this.props.item.id, r)
            FileTreeItem.refToItemIdMap.set(r, this.props.item)
        }
    }

    private handleContextMenu = (ev: React.MouseEvent) => {
        const { item, itemType, onContextMenu } = this.props
        if (itemType === ItemType.File || itemType === ItemType.Directory) {
            onContextMenu(ev, item as FileOrDir)
        }
    }

    private handleClick = (ev: React.MouseEvent) => {
        const { item, itemType, onClick } = this.props
        if (itemType === ItemType.File || itemType === ItemType.Directory) {
            onClick(ev, item as FileEntry, itemType)
        }
    }

    private handleDoubleClick = (ev: React.MouseEvent) => {
        const { item, itemType, onDoubleClick } = this.props
        if (itemType === ItemType.File || itemType === ItemType.Directory) {
            onDoubleClick(ev, item as FileEntry, itemType)
        }
    }

    private handleDragStartItem = (e: React.DragEvent) => {
        const { item, itemType, events } = this.props
        if (itemType === ItemType.File || itemType === ItemType.Directory) {
            const ref = FileTreeItem.itemIdToRefMap.get(item.id)
            if (ref) {
                events.dispatch(FileTreeXEvent.onTreeEvents, e, 'dragstart', item)
            }
        }
    }
}
