import { FileEntry, Directory, FileType } from 'react-aspen'
import { IFileTreeXHandle } from '../types'

export class KeyboardHotkeys {
    private hotkeyActions = {
        'ArrowUp': () => this.jumpToPrevItem(),
        'ArrowDown': () => this.jumpToNextItem(),
        'ArrowRight': () => this.expandOrJumpToFirstChild(),
        'ArrowLeft': () => this.collapseOrJumpToFirstParent(),
        'Space': () => this.toggleDirectoryExpand(),
        'Enter': () => this.selectFileOrToggleDirState(),
        'Home': () => this.jumpToFirstItem(),
        'End': () => this.jumpToLastItem(),
        'Escape': () => this.resetSteppedOrSelectedItem(),
    }

    constructor(private readonly fileTreeX: IFileTreeXHandle) { }

    public handleKeyDown = (ev: React.KeyboardEvent) => {
        if (!this.fileTreeX.hasDirectFocus()) {
            return false
        }
        const { code } = ev.nativeEvent
        if (code in this.hotkeyActions) {
            ev.preventDefault()
            this.hotkeyActions[code]()
            return true
        }
    }

    private jumpToFirstItem = (): void => {
        const { root } = this.fileTreeX.getModel()
        this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(0), true)
    }

    private jumpToLastItem = (): void => {
        const { root } = this.fileTreeX.getModel()
        this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(root.branchSize - 1), true)
    }

    private jumpToNextItem = (): void => {
        const { root } = this.fileTreeX.getModel()
        let currentPseudoActive = this.fileTreeX.getActiveFile()
        if (!currentPseudoActive) {
            const selectedFile = this.fileTreeX.getActiveFile()
            if (selectedFile) {
                currentPseudoActive = selectedFile
            } else {
                return this.jumpToFirstItem()
            }
        }
        const idx = root.getIndexAtFileEntry(currentPseudoActive)
        if (idx + 1 > root.branchSize) {
            return this.jumpToFirstItem()
        } else if (idx > -1) {
            this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(idx + 1), true)
        }
    }

    private jumpToPrevItem = (): void => {
        const { root } = this.fileTreeX.getModel()
        let currentPseudoActive = this.fileTreeX.getActiveFile()
        if (!currentPseudoActive) {
            const selectedFile = this.fileTreeX.getActiveFile()
            if (selectedFile) {
                currentPseudoActive = selectedFile
            } else {
                return this.jumpToLastItem()
            }
        }
        const idx = root.getIndexAtFileEntry(currentPseudoActive)
        if (idx - 1 < 0) {
            return this.jumpToLastItem()
        } else if (idx > -1) {
            this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(idx - 1), true)
        }
    }

    private expandOrJumpToFirstChild(): void {
        const currentPseudoActive = this.fileTreeX.getActiveFile()
        if (currentPseudoActive && currentPseudoActive.type === FileType.Directory) {
            if ((currentPseudoActive as Directory).expanded) {
                return this.jumpToNextItem()
            } else {
                this.fileTreeX.openDirectory(currentPseudoActive as Directory)
            }
        }
    }

    private collapseOrJumpToFirstParent(): void {
        const currentPseudoActive = this.fileTreeX.getActiveFile()
        if (currentPseudoActive) {
            if (currentPseudoActive.type === FileType.Directory && (currentPseudoActive as Directory).expanded) {
                return this.fileTreeX.closeDirectory(currentPseudoActive as Directory)
            }
            this.fileTreeX.setActiveFile(currentPseudoActive.parent, true)
        }
    }

    private selectFileOrToggleDirState = (): void => {
        const currentPseudoActive = this.fileTreeX.getActiveFile()
        if (!currentPseudoActive) { return }
        if (currentPseudoActive.type === FileType.Directory) {
            this.fileTreeX.toggleDirectory(currentPseudoActive as Directory)
        } else if (currentPseudoActive.type === FileType.File) {
            this.fileTreeX.setActiveFile(currentPseudoActive as FileEntry, true)
        }
    }

    private toggleDirectoryExpand = (): void => {
        const currentPseudoActive = this.fileTreeX.getActiveFile()
        if (!currentPseudoActive) { return }
        if (currentPseudoActive.type === FileType.Directory) {
            this.fileTreeX.toggleDirectory(currentPseudoActive as Directory)
        }
    }

    private resetSteppedOrSelectedItem = (): void => {
        const currentPseudoActive = this.fileTreeX.getActiveFile()
        if (currentPseudoActive) {
            return this.resetSteppedItem()
        }
        this.fileTreeX.setActiveFile(null)
    }

    private resetSteppedItem = () => {
        this.fileTreeX.setActiveFile(null)
    }
}
