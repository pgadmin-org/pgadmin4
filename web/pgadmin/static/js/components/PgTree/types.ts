import { IFileTreeHandle, FileEntry, Directory, TreeModel, FileType, IFileEntryItem, IItemRenderer, FileOrDir } from 'react-aspen'
import { IDisposable } from 'notificar'
import { TreeModelX } from './TreeModelX'
import React, { MouseEventHandler } from 'react'
import { MenuItem } from '../../helpers/Menu'


export interface IFileTreeXTriggerEvents {
    onEvent(event: string, path: string): boolean | Promise<boolean>
}

export interface IItemRendererX extends IItemRenderer {
    getBoundingClientRectForItem(item: FileEntry | Directory): ClientRect
}

// Here imagination is your limit! IFileTreeHandle has core low-level features you can build on top of as your application needs
export interface IFileTreeXHandle extends IFileTreeHandle {
    getActiveFile(): FileEntry | Directory
    setActiveFile(path: string)
    setActiveFile(file: FileEntry)
    setActiveFile(dir: Directory)

    getPseudoActiveFile(): FileEntry | Directory
    setPseudoActiveFile(path: string)
    setPseudoActiveFile(file: FileEntry)
    setPseudoActiveFile(dir: Directory)

    rename(path: string)
    rename(file: FileEntry)
    rename(dir: Directory)

    newFile(dirpath: string)
    newFile(dir: Directory)
    newFolder(dirpath: string)
    newFolder(dir: Directory)
    toggleDirectory(path: string)
    toggleDirectory(dir: Directory)

    first(file: FileEntry): FileEntry | Directory
    first(dir: Directory): FileEntry | Directory
    first(): FileEntry | Directory

    parent(file: FileEntry): Directory
    parent(dir: Directory): Directory

    hasParent(file: FileEntry): boolean
    hasParent(dir: Directory): boolean

    isOpen(file: FileEntry): boolean
    isOpen(dir: Directory): boolean

    isClosed(file: FileEntry): boolean
    isClosed(dir: Directory): boolean

    itemData(file: FileEntry): array
    itemData(dir: Directory): array

    children(file: FileEntry): array
    children(dir: Directory): array

    getModel(): TreeModelX
    /**
     * If document.activeElement === filetree wrapper element
     */
    hasDirectFocus(): boolean

    // events
    onBlur(callback: () => void): IDisposable
}

export interface IFileTreeXProps {
    height: number
    width: number
    model: TreeModelX

    /**
     * Same as unix's `mv` command as in `mv [SOURCE] [DEST]`
     */
    mv: (oldPath: string, newPath: string) => boolean | Promise<boolean>

    /**
     * Amalgam of unix's `mkdir` and `touch` command
     */
    create: (path: string, type: FileType) => IFileEntryItem | Promise<IFileEntryItem>
    onReady?: (handle: IFileTreeXHandle) => void
    onEvent?: (event: IFileTreeXTriggerEvents) => void
    onContextMenu?: (ev: React.MouseEvent, item?: FileOrDir) => void
    onScroll?: (ev: React.UIEvent<HTMLDivElement>) => void
}

export enum FileTreeXEvent {
    OnBlur,
    onTreeEvents,
}
