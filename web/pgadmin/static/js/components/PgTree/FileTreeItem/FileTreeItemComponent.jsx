import cn from 'classnames';
import { useSingleAndDoubleClick } from '../../../custom_hooks';
import { FileEntry, ItemType, FileType} from 'react-aspen';
import * as React from 'react';
import PropTypes from 'prop-types';

export default function FileTreeItemComponent({item, itemType, decorations, handleContextMenu, handleDragStartItem, handleMouseEnter, handleMouseLeave, handleItemClicked, handleItemDoubleClicked, handleDivRef}){
  const onClick = useSingleAndDoubleClick(handleItemClicked, handleItemDoubleClicked) ;
  const isRenamePrompt = itemType === ItemType.RenamePrompt;
  const isNewPrompt = itemType === ItemType.NewDirectoryPrompt || itemType === ItemType.NewFilePrompt;
  const isDirExpanded = itemType === ItemType.Directory
    ? item.expanded
    : itemType === ItemType.RenamePrompt && item.target.type === FileType.Directory
      ? item.target.expanded
      : false;
  const fileOrDir =
            (itemType === ItemType.File ||
                itemType === ItemType.NewFilePrompt ||
                (itemType === ItemType.RenamePrompt && (item).target.constructor === FileEntry))
              ? 'file'
              : 'directory';

  if (item.parent?.parent && item.parent?.path) {
    item.resolvedPathCache = item.parent.path + '/' + item._metadata.data.id;
  }

  const itemChildren = item.children && item.children.length > 0 && item._metadata.data._type.indexOf('coll-') !== -1 ? '(' + item.children.length + ')' : '';
  const extraClasses = item._metadata.data.extraClasses ? item._metadata.data.extraClasses.join(' ') : '';
  const tags = item._metadata.data?.tags ?? [];

  return(
    <div
      className={cn('file-entry', {
        renaming: isRenamePrompt,
        prompt: isRenamePrompt || isNewPrompt,
        new: isNewPrompt,
      }, fileOrDir, decorations ? decorations.classlist : null, `depth-${item.depth}`, extraClasses)}
      data-depth={item.depth}
      onContextMenu={handleContextMenu}
      onClick={onClick}
      onDragStart={handleDragStartItem}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={()=>{/* taken care by parent */}}
      // required for rendering context menus when opened through context menu button on keyboard
      ref={handleDivRef}
      draggable={true}>

      {!isNewPrompt && fileOrDir === 'directory' ?
        <i className={cn('directory-toggle', isDirExpanded ? 'open' : '')} />
        : null
      }

      <span className='file-label'>
        {
          item._metadata?.data?.icon ?
            <i className={cn('file-icon', item._metadata?.data?.icon ? item._metadata.data.icon : fileOrDir)} /> : null
        }
        <span className='file-name'>
          { _.unescape(item._metadata?.data._label)}
        </span>
        <span className='children-count'>{itemChildren}</span>
        {tags.map((tag)=>(
          <div key={tag.text} className='file-tag' style={{'--tag-color': tag.color}}>
            {tag.text}
          </div>
        ))}
      </span>
    </div>);

}

FileTreeItemComponent.propTypes = {
  item: PropTypes.object, 
  itemType: PropTypes.number,
  decorations: PropTypes.object,
  handleContextMenu: PropTypes.func, 
  handleDragStartItem:PropTypes.func,
  handleMouseEnter:PropTypes.func,
  handleMouseLeave:PropTypes.func,
  handleItemClicked:PropTypes.func,
  handleItemDoubleClicked:PropTypes.func,
  handleDivRef:PropTypes.func

};