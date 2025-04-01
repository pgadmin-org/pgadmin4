import { TreeModel, IBasicFileSystemHost, Root } from 'react-aspen';
import { DecorationsManager } from 'aspen-decorations';

export class TreeModelX extends TreeModel {
  public readonly decorations: DecorationsManager;
  constructor(host: IBasicFileSystemHost, mountPath: string) {
    super(host, mountPath);
    this.decorations = new DecorationsManager(this.root as Root);
  }
}
