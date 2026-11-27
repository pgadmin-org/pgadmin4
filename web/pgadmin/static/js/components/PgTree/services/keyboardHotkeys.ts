import { Notificar } from 'notificar';
import { FileEntry, Directory, FileType } from 'react-aspen';
import { FileTreeXEvent, IFileTreeXHandle } from '../types';
import { collapseTarget } from './collapse';

export class KeyboardHotkeys {
  private readonly hotkeyActions = {
    'ArrowUp': () => this.jumpToPrevItem(),
    'ArrowDown': () => this.jumpToNextItem(),
    'ArrowRight': () => this.expandOrJumpToFirstChild(),
    'ArrowLeft': () => this.collapseOrJumpToFirstParent(),
    'Shift+ArrowLeft': () => this.collapseAllOrParent(),
    'Space': () => this.toggleDirectoryExpand(),
    'Enter': () => this.selectFileOrToggleDirState(),
    'Home': () => this.jumpToFirstItem(),
    'End': () => this.jumpToLastItem(),
    'Escape': () => this.resetSteppedOrSelectedItem(),
    'Ctrl+KeyC': () => this.copyEntry(),
  };

  constructor(private readonly fileTreeX: IFileTreeXHandle, private readonly events: Notificar<FileTreeXEvent>) { }

  public handleKeyDown = (ev: React.KeyboardEvent) => {
    if (!this.fileTreeX.hasDirectFocus()) {
      return false;
    }
    let { code } = ev.nativeEvent;

    if((ev.nativeEvent.ctrlKey || ev.nativeEvent.metaKey) && ev.nativeEvent.key !== 'Control') {
      code = `Ctrl+${code}`;
    }
    // Shift is only significant where a Shift binding exists, so Shift with
    // any other key still behaves as the key on its own.
    if (ev.nativeEvent.shiftKey && `Shift+${code}` in this.hotkeyActions) {
      code = `Shift+${code}`;
    }
    if (code in this.hotkeyActions) {
      ev.preventDefault();
      this.hotkeyActions[code]();
      return true;
    }
  };

  private readonly jumpToFirstItem = (): void => {
    const { root } = this.fileTreeX.getModel();
    this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(0), true);
  };

  private readonly jumpToLastItem = (): void => {
    const { root } = this.fileTreeX.getModel();
    this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(root.branchSize - 1), true);
  };

  private readonly jumpToNextItem = (): void => {
    const { root } = this.fileTreeX.getModel();
    let currentPseudoActive = this.fileTreeX.getActiveFile();
    if (!currentPseudoActive) {
      const selectedFile = this.fileTreeX.getActiveFile();
      if (selectedFile) {
        currentPseudoActive = selectedFile;
      } else {
        return this.jumpToFirstItem();
      }
    }
    const idx = root.getIndexAtFileEntry(currentPseudoActive);
    if (idx + 1 > root.branchSize) {
      return this.jumpToFirstItem();
    } else if (idx > -1) {
      this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(idx + 1), true);
    }
  };

  private readonly jumpToPrevItem = (): void => {
    const { root } = this.fileTreeX.getModel();
    let currentPseudoActive = this.fileTreeX.getActiveFile();
    if (!currentPseudoActive) {
      const selectedFile = this.fileTreeX.getActiveFile();
      if (selectedFile) {
        currentPseudoActive = selectedFile;
      } else {
        return this.jumpToLastItem();
      }
    }
    const idx = root.getIndexAtFileEntry(currentPseudoActive);
    if (idx - 1 < 0) {
      return this.jumpToLastItem();
    } else if (idx > -1) {
      this.fileTreeX.setActiveFile(root.getFileEntryAtIndex(idx - 1), true);
    }
  };

  private expandOrJumpToFirstChild(): void {
    const currentPseudoActive = this.fileTreeX.getActiveFile();
    if (currentPseudoActive && currentPseudoActive.type === FileType.Directory) {
      if ((currentPseudoActive as Directory).expanded) {
        return this.jumpToNextItem();
      } else {
        this.fileTreeX.openDirectory(currentPseudoActive as Directory);
      }
    }
  }

  private collapseOrJumpToFirstParent(): void {
    const currentPseudoActive = this.fileTreeX.getActiveFile();
    if (currentPseudoActive) {
      if (currentPseudoActive.type === FileType.Directory && (currentPseudoActive as Directory).expanded) {
        return this.fileTreeX.closeDirectory(currentPseudoActive as Directory);
      }
      this.fileTreeX.setActiveFile(currentPseudoActive.parent, true);
    }
  }

  // Collapses the active node and everything beneath it, or, when it is not
  // an expanded directory, its parent, which then becomes the active node.
  private async collapseAllOrParent(): Promise<void> {
    const current = this.fileTreeX.getActiveFile();
    const target = collapseTarget(current, this.fileTreeX.getModel().root);
    if (!target) { return; }
    await this.fileTreeX.collapseAll(target);
    if (target !== current) {
      this.fileTreeX.setActiveFile(target, true);
    }
  }

  private readonly selectFileOrToggleDirState = (): void => {
    const currentPseudoActive = this.fileTreeX.getActiveFile();
    if (!currentPseudoActive) { return; }
    if (currentPseudoActive.type === FileType.Directory) {
      this.fileTreeX.toggleDirectory(currentPseudoActive as Directory);
    } else if (currentPseudoActive.type === FileType.File) {
      this.fileTreeX.setActiveFile(currentPseudoActive as FileEntry, true);
    }
  };

  private readonly toggleDirectoryExpand = (): void => {
    const currentPseudoActive = this.fileTreeX.getActiveFile();
    if (!currentPseudoActive) { return; }
    if (currentPseudoActive.type === FileType.Directory) {
      this.fileTreeX.toggleDirectory(currentPseudoActive as Directory);
    }
  };

  private readonly resetSteppedOrSelectedItem = (): void => {
    const currentPseudoActive = this.fileTreeX.getActiveFile();
    if (currentPseudoActive) {
      return this.resetSteppedItem();
    }
    this.fileTreeX.setActiveFile(null);
  };

  private readonly resetSteppedItem = () => {
    this.fileTreeX.setActiveFile(null);
  };

  private readonly copyEntry = () => {
    const currentPseudoActive = this.fileTreeX.getActiveFile();
    this.events.dispatch(FileTreeXEvent.onTreeEvents, null, 'copied', currentPseudoActive);
  };
}
