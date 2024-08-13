/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultButton, PgButtonGroup, PgIconButton, PrimaryButton } from '../../../../../static/js/components/Buttons';
import CloseIcon from '@mui/icons-material/CloseRounded';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import FolderIcon from '@mui/icons-material/Folder';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import CreateNewFolderRoundedIcon from '@mui/icons-material/CreateNewFolderRounded';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import gettext from 'sources/gettext';
import { FormFooterMessage, InputSelectNonSearch, InputText, MESSAGE_TYPE } from '../../../../../static/js/components/FormComponents';
import ListView from './ListView';
import { PgMenu, PgMenuDivider, PgMenuItem, usePgMenuGroup } from '../../../../../static/js/components/Menu';
import getApiInstance, { parseApiError } from '../../../../../static/js/api_instance';
import Loader from 'sources/components/Loader';
import url_for from 'sources/url_for';
import Uploader from './Uploader';
import GridView from './GridView';
import convert from 'convert-units';
import PropTypes from 'prop-types';
import { downloadBlob } from '../../../../../static/js/utils';
import ErrorBoundary from '../../../../../static/js/helpers/ErrorBoundary';
import { MY_STORAGE } from './FileManagerConstants';
import _ from 'lodash';

const StyledBox = styled(Box)(({theme}) => ({
  backgroundColor: theme.palette.background.default,
  '& .FileManager-toolbar': {
    padding: '4px',
    display: 'flex',
    ...theme.mixins.panelBorder?.bottom,
    '& .FileManager-sharedStorage': {
      width: '3rem !important',
    },
    '& .FileManager-inputFilename': {
      lineHeight: 1,
      width: '100%',
    },
    '& .FileManager-inputSearch': {
      marginLeft: '4px',
      lineHeight: 1,
      width: '130px',
    },
    '& .FileManager-storageName': {
      paddingLeft: '0.2rem'
    },
    '& .FileManager-sharedIcon': {
      width: '1.3rem'
    }
  },
  '& .FileManager-footer': {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder?.top,
    '& .FileManager-margin': {
      marginLeft: '0.25rem',
    },
  },
  '& .FileManager-footer1': {
    justifyContent: 'space-between',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    '& .FileManager-formatSelect': {
      '& .MuiSelect-select': {
        paddingTop: '4px',
        paddingBottom: '4px',
      }
    },
  },
  '& .FileManager-footerSaveAs': {
    justifyContent: 'initial',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
  },
  '& .FileManager-replaceOverlay': {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.otherVars.loader.backgroundColor,
    zIndex: 2,
    display: 'flex',
  },
  '& .FileManager-replaceDialog': {
    margin: 'auto',
    marginLeft: '1rem',
    marginRight: '1rem',
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.default,
    width: '100%',
    ...theme.mixins.panelBorder.all,
  },
}));

export function getComparator(sortColumn) {
  const key = sortColumn?.columnKey;
  const dir = sortColumn?.direction == 'ASC' ? 1 : -1;
  switch (key) {
  case 'Filename':
    return (a, b) => {
      return dir*(a['Filename'].localeCompare(b['Filename']));
    };
  case 'Properties.DateModified':
    return (a, b) => {
      try {
        let a1 = new Date(a['Properties']['Date Modified']);
        let b1 = new Date(b['Properties']['Date Modified']);
        if(a1 > b1) return dir*1;
        return dir*(a1 < b1 ? -1 : 0);
      } catch {
        return 0;
      }
    };
  case 'Properties.Size':
    return (a, b) => {
      const parseAndConvert = (columnVal)=>{
        if(columnVal.file_type != 'dir' && columnVal.file_type != 'drive' && columnVal['Properties']['Size']) {
          let [size, unit] = columnVal['Properties']['Size'].split(' ');
          return convert(size).from(unit.toUpperCase()).to('B');
        }
        return -1;
      };
      try {
        let a1 = parseAndConvert(a);
        let b1 = parseAndConvert(b);
        if(a1 > b1) return dir*1;
        return dir*(a1 < b1 ? -1 : 0);
      } catch {
        return 0;
      }
    };
  default:
    return ()=>0;
  }
}

export class FileManagerUtils {
  constructor(api, params) {
    this.api = api;
    this.params = params;
    this.config = {};
    this.currPath = '';
    this.separator = '/';
    this.storage_folder = '';
  }

  get transId() {
    return this.config.transId;
  }

  get fileConnectorUrl() {
    return `${url_for('file_manager.index')}filemanager/${this.transId}/`;
  }

  get fileRoot() {
    return this.config.options.fileRoot;
  }

  get allowedFileTypes() {
    return this.config.options?.allowed_file_types || [];
  }

  get showHiddenFiles() {
    return this.config.options?.show_hidden_files;
  }

  set showHiddenFiles(val) {
    this.config.options.show_hidden_files = val;
    this.api.put(url_for('file_manager.save_show_hidden_file_option', {
      trans_id: this.transId,
    }), {
      show_hidden: val,
    }).catch((error)=>{
      console.error(error);
      /* Do nothing */
    });
  }

  hasCapability(val) {
    return this.config?.options?.capabilities?.includes(val);
  }

  async initialize() {
    let res = await this.api.post(url_for('file_manager.init'), this.params);
    this.config = res.data.data;
    if(this.config.options.platform_type == 'win32') {
      this.separator = '\\';
    }
  }

  join(path1, path2) {
    if(path1.endsWith(this.separator)) {
      return path1 + path2;
    }
    return path1 + this.separator + path2;
  }

  getExt(filename) {
    if (filename.split('.').length == 1) {
      return '';
    }
    return filename.split('.').pop();
  }

  async getFolder(path, sharedFolder=null) {
    const newPath = path || this.fileRoot;
    let res = await this.api.post(this.fileConnectorUrl, {
      'path': newPath,
      'mode': 'getfolder',
      'file_type': this.config.options.last_selected_format || '*',
      'show_hidden': this.showHiddenFiles,
      'storage_folder': sharedFolder,
    });
    this.currPath = newPath;
    return res.data.data.result;
  }

  async addFolder(row, ss) {
    let res = await this.api.post(this.fileConnectorUrl, {
      'path': this.currPath,
      'mode': 'addfolder',
      'name': row.Filename,
      'storage_folder': ss
    });
    return {
      Filename: res.data.data.result.Name,
      Path: res.data.data.result.Path,
      file_type: 'dir',
      Properties: {
        'Date Modified': res.data.data.result['Date Modified'],
      }
    };
  }

  async renameItem(row, ss) {
    let res = await this.api.post(this.fileConnectorUrl, {
      'mode': 'rename',
      'old': row.Path,
      'new': row.Filename,
      'storage_folder': ss
    });
    return {
      ...row,
      Path: res.data.data.result['New Path'],
      Filename: res.data.data.result['New Name'],
    };
  }

  async deleteItem(row, ss, fileName) {
    const path = fileName ? this.join(row.Path, fileName) : row.Path;
    await this.api.post(this.fileConnectorUrl, {
      'mode': 'delete',
      'path': path,
      'storage_folder': ss
    });
    return path;
  }

  async uploadItem(fileObj, ss, onUploadProgress) {
    const formData = new FormData();
    formData.append('newfile', fileObj);
    formData.append('mode', 'add');
    formData.append('currentpath', this.join(this.currPath, ''));
    formData.append('storage_folder', ss);
    return this.api({
      method: 'POST',
      url: this.fileConnectorUrl,
      headers: { 'Content-Type': 'multipart/form-data' },
      data: formData,
      onUploadProgress: onUploadProgress,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async setLastVisitedDir(path, ss) {
    return this.api.post(url_for('file_manager.save_last_dir', {
      trans_id: this.transId,
    }), {
      'path': path,
      'storage_folder': ss
    });
  }

  async downloadFile(row, ss) {
    let res = await this.api({
      method: 'POST',
      url: this.fileConnectorUrl,
      responseType: 'blob',
      data: {
        'mode': 'download',
        'path': row.Path,
        'storage_folder': ss,
      },
    });
    downloadBlob(res.data, res.headers.filename);
  }

  setDialogView(view) {
    if(this.config.options != undefined)
      this.config.options.defaultViewMode = view;

    this.api.post(url_for('file_manager.save_file_dialog_view', {
      trans_id: this.transId,
    }), {view: view})
      .catch((err)=>{
        /* Do not fail anything */
        console.error(err);
      });
  }

  setFileType(fileType) {
    this.config.options.last_selected_format = fileType;
    this.api.post(url_for('settings.save_file_format_setting'), this.config.options)
      .catch((err)=>{
        /* Do not fail anything */
        console.error(err);
      });
  }

  async checkPermission(path, selectedStorage=MY_STORAGE) {
    try {
      let res = await this.api.post(this.fileConnectorUrl, {
        'path': path,
        'mode': 'permission',
        'storage_folder': selectedStorage
      });
      if (res.data.data.result.Code === 1) {
        return null;
      } else {
        return res.data.data.result.Error;
      }
    } catch (error) {
      return parseApiError(error);
    }
  }

  async isFileExists(path, fileName) {
    let res = await this.api.post(this.fileConnectorUrl, {
      'path': path,
      'name': fileName,
      'mode': 'is_file_exist',
    });
    return Boolean(res.data.data.result.Code);
  }

  async destroy() {
    await this.api.delete(url_for('file_manager.delete_trans_id', {
      'trans_id': this.transId,
    }));
  }

  isWinDrive(text) {
    return text && text.length == 2 && text.endsWith(':') && this.config?.options?.platform_type == 'win32';
  }

  dirname(path) {
    let ret = path;
    if(!path) {
      return ret;
    }
    if(path.endsWith(this.separator)) {
      ret = ret.slice(0, -1);
    }
    if(this.isWinDrive(ret)) {
      ret = this.separator;
    } else {
      ret = ret.slice(0, ret.lastIndexOf(this.separator)+1);
    }
    return ret;
  }

}

function ConfirmFile({text, onYes, onNo}) {
  return (
    <Box className='FileManager-replaceOverlay'>
      <Box margin={'8px'} className='FileManager-replaceDialog'>
        <Box padding={'1rem'}>{text}{}</Box>
        <Box className='FileManager-footer'>
          <DefaultButton data-test="no" startIcon={<CloseIcon />} onClick={onNo} >{gettext('No')}</DefaultButton>
          <PrimaryButton data-test="yes" className='FileManager-margin' startIcon={<CheckRoundedIcon />}
            onClick={onYes} autoFocus>{gettext('Yes')}</PrimaryButton>
        </Box>
      </Box>
    </Box>
  );
}
ConfirmFile.propTypes = {
  text: PropTypes.string,
  onYes: PropTypes.func,
  onNo: PropTypes.func
};

export default function FileManager({params, closeModal, onOK, onCancel, sharedStorages=[], restrictedSharedStorage=[]}) {


  const apiObj = useMemo(()=>getApiInstance(), []);
  const fmUtilsObj = useMemo(()=>new FileManagerUtils(apiObj, params), []);

  const {openMenuName, toggleMenu, onMenuClose} = usePgMenuGroup();
  const [loaderText, setLoaderText] = useState('Loading...');
  const [items, setItems] = useState([]);
  const [path, setPath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [saveAs, setSaveAs] = useState('');
  const [okBtnDisable, setOkBtnDisable] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [showUploader, setShowUploader] = useState(false);
  const [[confirmText, onConfirmYes], setConfirmFile] = useState([null, null]);
  const [fileType, setFileType] = useState('*');
  const [sortColumns, setSortColumns] = useState([]);
  const [selectedRow, setSelectedRow] = useState();
  const selectedRowIdx = useRef();
  const optionsRef = React.useRef(null);
  const saveAsRef = React.useRef(null);
  const sharedSRef = React.useRef(null);
  const [selectedSS, setSelectedSS] =  React.useState(MY_STORAGE);
  const [operation, setOperation] = useState({
    type: null, idx: null
  });

  const sortedItems = useMemo(()=>(
    [...items].sort(getComparator(sortColumns[0]))
  ), [items, sortColumns]);

  const filteredItems = useMemo(()=>{
    return sortedItems.filter((i)=>i.Filename?.toLowerCase().includes(search?.toLocaleLowerCase()));
  }, [items, sortColumns, search]);

  const itemsText = useMemo(()=>{
    let suffix = items.length == 1 ? 'item' : 'items';
    if(items.length == filteredItems.length) {
      return `${items.length} ${suffix}`;
    }
    return `${filteredItems.length} of ${items.length} ${suffix}`;
  }, [items, filteredItems]);

  const changeDir = async(storage) => {
    setSelectedSS(storage);
    fmUtilsObj.storage_folder = storage;
    await openDir('/', storage);
  };
  const openDir = async (dirPath, changeStoragePath=null)=>{
    setErrorMsg('');
    setLoaderText('Loading...');
    try {
      if(fmUtilsObj.isWinDrive(dirPath)) {
        dirPath += fmUtilsObj.separator;
      }
      let newItems = await fmUtilsObj.getFolder(dirPath || fmUtilsObj.currPath, changeStoragePath);
      setItems(newItems);
      setPath(fmUtilsObj.currPath);
      setTimeout(()=>{fmUtilsObj.setLastVisitedDir(dirPath || fmUtilsObj.currPath, changeStoragePath);}, 100);
    } catch (error) {
      console.error(error);
      setErrorMsg(parseApiError(error));
    }
    setLoaderText('');
  };

  const completeOperation = async (oldRow, newRow, rowIdx, selectedSS, func)=>{
    setOperation({});
    if(oldRow?.Filename == newRow.Filename) {
      setItems((prev)=>[
        ...prev.slice(0, rowIdx),
        oldRow,
        ...prev.slice(rowIdx+1)
      ]);
      return;
    }
    setItems((prev)=>[
      ...prev.slice(0, rowIdx),
      newRow,
      ...prev.slice(rowIdx+1)
    ]);
    try {
      const actualRow = await func(newRow, selectedSS);
      setItems((prev)=>[
        ...prev.slice(0, rowIdx),
        actualRow,
        ...prev.slice(rowIdx+1)
      ]);
    } catch (error) {
      setErrorMsg(parseApiError(error));
      if(oldRow) {
        setItems((prev)=>[
          ...prev.slice(0, rowIdx),
          oldRow,
          ...prev.slice(rowIdx+1)
        ]);
      } else {
        setItems((prev)=>[
          ...prev.slice(0, rowIdx),
          ...prev.slice(rowIdx+1)
        ]);
      }
    }
  };
  const onDownload = async ()=>{
    setLoaderText('Downloading...');
    try {
      await fmUtilsObj.downloadFile(filteredItems[selectedRowIdx.current], selectedSS);
    } catch (error) {
      setErrorMsg(parseApiError(error));
      console.error(error);
    }
    setLoaderText('');
  };
  const onAddFolder = ()=>{
    setItems((prev)=>[
      {Filename: 'Untitled Folder', file_type: 'dir'},
      ...prev,
    ]);
    setOperation({
      type: 'add',
      idx: 0,
      onComplete: async (row, rowIdx)=>{
        setErrorMsg('');
        setLoaderText('Creating folder...');
        await completeOperation(null, row, rowIdx, selectedSS, fmUtilsObj.addFolder.bind(fmUtilsObj));
        setLoaderText('');
      }
    });
  };
  const renameSelectedItem = (e)=>{
    e.keepOpen = false;
    setErrorMsg('');
    if(_.isUndefined(selectedRowIdx.current) || _.isNull(selectedRowIdx.current)) {
      return;
    }
    setOperation({
      type: 'rename',
      idx: selectedRowIdx.current,
      onComplete: async (row, rowIdx)=>{
        setErrorMsg('');
        setLoaderText('Renaming...');
        let oldRow = items[rowIdx];
        await completeOperation(oldRow, row, rowIdx, selectedSS,fmUtilsObj.renameItem.bind(fmUtilsObj));
        setLoaderText('');
      }
    });
  };
  const deleteSelectedItem = async (e)=>{
    e.keepOpen = false;
    setErrorMsg('');
    if(_.isUndefined(selectedRowIdx.current) || _.isNull(selectedRowIdx.current)) {
      return;
    }
    setConfirmFile([gettext('Are you sure you want to delete this file/folder?'), async ()=>{
      setConfirmFile([null, null]);
      setLoaderText('Deleting...');
      try {
        await fmUtilsObj.deleteItem(items[selectedRowIdx.current],selectedSS);
        setItems((prev)=>[
          ...prev.slice(0, selectedRowIdx.current),
          ...prev.slice(selectedRowIdx.current+1),
        ]);
      } catch (error) {
        setErrorMsg(parseApiError(error));
        console.error(error);
      }
      setLoaderText('');
    }]);
  };
  const toggleViewMode = (e, val)=>{
    e.keepOpen = false;
    setViewMode(val);
    fmUtilsObj.setDialogView(val);
  };
  const onOkClick = useCallback(async ()=>{
    setLoaderText('Please wait...');
    let onOkPath = null;
    if(params.dialog_type == 'create_file') {
      let newFileName = saveAs;
      // Add the extension if user has not added.
      if(fileType != '*' && !newFileName.endsWith(`.${fileType}`)) {
        newFileName += `.${fileType}`;
      }
      onOkPath = fmUtilsObj.join(fmUtilsObj.currPath, newFileName);
      let error = await fmUtilsObj.checkPermission(onOkPath, selectedSS);
      if(error) {
        setErrorMsg(error);
        setLoaderText('');
        return;
      }
      let exists = await fmUtilsObj.isFileExists(fmUtilsObj.currPath, newFileName);
      if(exists) {
        setLoaderText('');
        setConfirmFile([gettext('Are you sure you want to replace this file?'), async ()=>{
          await fmUtilsObj.setLastVisitedDir(fmUtilsObj.currPath, selectedSS);
          onOK?.(onOkPath, selectedSS);
          closeModal();
        }]);
        return;
      }
    } else if(selectedRowIdx?.current >= 0 && filteredItems[selectedRowIdx?.current]) {
      onOkPath = filteredItems[selectedRowIdx?.current]['Path'];
    }
    await fmUtilsObj.setLastVisitedDir(fmUtilsObj.currPath, selectedSS);
    onOK?.(onOkPath, selectedSS);
    closeModal();
  }, [filteredItems, saveAs, fileType]);
  const onItemEnter = useCallback(async (row)=>{
    if(row.file_type == 'dir' || row.file_type == 'drive') {
      await openDir(row.Path, selectedSS);
    } else if(params.dialog_type == 'select_file') {
      onOkClick();
    }
  }, [filteredItems]);
  const onItemSelect = useCallback((idx)=>{
    selectedRowIdx.current = idx;
    fewBtnDisableCheck();
  }, [filteredItems]);
  const onItemClick = useCallback((idx)=>{
    let row = filteredItems[selectedRowIdx.current];
    if(params.dialog_type == 'create_file' && row?.file_type != 'dir' && row?.file_type != 'drive') {
      setSaveAs(filteredItems[idx]?.Filename);
    }
  }, [filteredItems]);
  const fewBtnDisableCheck = ()=>{
    let disabled = true;
    let row = filteredItems[selectedRowIdx.current];
    if(params.dialog_type == 'create_file') {
      disabled = !saveAs?.trim();
    } else if(selectedRowIdx.current >= 0 && row) {
      let selectedfileType = row?.file_type;
      if(((selectedfileType == 'dir' || selectedfileType == 'drive') && fmUtilsObj.hasCapability('select_folder'))
      || (selectedfileType != 'dir' && selectedfileType != 'drive' && fmUtilsObj.hasCapability('select_file'))) {
        disabled = false;
      }
    }
    setOkBtnDisable(disabled);
    setSelectedRow(row);
  };
  useEffect(()=>{
    const init = async ()=>{
      await fmUtilsObj.initialize();
      if(params.dialog_type != 'select_folder') {
        setFileType(fmUtilsObj.config?.options?.last_selected_format || '*');
      }
      if(fmUtilsObj.config?.options?.defaultViewMode) {
        setViewMode(fmUtilsObj.config?.options?.defaultViewMode);
      } else {
        setViewMode('list');
      }
      if (fmUtilsObj.config.options.storage_folder == '') {
        setSelectedSS(MY_STORAGE);
      } else {
        fmUtilsObj.storage_folder = fmUtilsObj.config.options.storage_folder;
        setSelectedSS(fmUtilsObj.config.options.storage_folder);
      }

      let tempPath = params?.path;
      if (params?.dialog_type == 'storage_dialog' && (!params?.path?.includes('/') || !params?.path?.includes('\\'))) {
        tempPath = '/';
      }

      openDir(tempPath, fmUtilsObj.config.options.storage_folder);
      (params?.dialog_type != 'storage_dialog' && params?.path) && fmUtilsObj.setLastVisitedDir(params?.path, selectedSS);
    };
    init();
    setTimeout(()=>{ saveAsRef.current?.focus(); }, 300);
    return ()=>{
      fmUtilsObj.destroy();
    };
  }, []);

  useEffect(()=>{
    fewBtnDisableCheck();
  }, [saveAs, filteredItems.length]);

  const isNoneSelected = _.isUndefined(selectedRow);
  let okBtnText = params.btn_primary;
  if(!okBtnText) {
    okBtnText = gettext('Select');
    if(params.dialog_type == 'create_file' || params.dialog_type == 'create_folder') {
      okBtnText = gettext('Create');
    }
  }

  return (
    <ErrorBoundary>
      <StyledBox display="flex" flexDirection="column" height="100%">
        <Box flexGrow="1" display="flex" flexDirection="column" position="relative" overflow="hidden">
          <Loader message={loaderText} />
          {Boolean(confirmText) && <ConfirmFile text={confirmText} onNo={()=>setConfirmFile([null, null])} onYes={onConfirmYes}/>}
          <Box className='FileManager-toolbar'>
            <PgButtonGroup size="small" style={{flexGrow: 1}}>
              { sharedStorages.length > 0 &&
                <PgIconButton title={ selectedSS == MY_STORAGE ? gettext('My Storage') :gettext(selectedSS)} icon={ selectedSS == MY_STORAGE ? <><FolderIcon/><KeyboardArrowDownIcon style={{marginLeft: '-10px'}} /></> : <><FolderSharedIcon /><KeyboardArrowDownIcon style={{marginLeft: '-10px'}} /></>} splitButton
                  name="menu-shared-storage" ref={sharedSRef} onClick={toggleMenu} className='FileManager-sharedStorage'/>
              }
              <PgIconButton title={gettext('Home')} onClick={async ()=>{
                await openDir(fmUtilsObj.config?.options?.homedir, selectedSS);
              }} icon={<HomeRoundedIcon />} disabled={showUploader} />
              <PgIconButton title={gettext('Go Back')} onClick={async ()=>{
                await openDir(fmUtilsObj.dirname(fmUtilsObj.currPath), selectedSS);
              }} icon={<ArrowUpwardRoundedIcon />} disabled={!fmUtilsObj.dirname(fmUtilsObj.currPath) || showUploader} />
              <InputText size="small" className='FileManager-inputFilename'
                data-label="file-path"
                controlProps={{maxLength: null}}
                onKeyDown={async (e)=>{
                  if(e.code === 'Enter') {
                    e.preventDefault();
                    await openDir(path);
                  }
                }} value={path} onChange={setPath} readonly={showUploader} />

              <PgIconButton title={gettext('Refresh')} onClick={async ()=>{
                await openDir(path, selectedSS);
              }} icon={<SyncRoundedIcon />} disabled={showUploader} />
            </PgButtonGroup>
            <InputText type="search" className='FileManager-inputSearch' data-label="search" placeholder={gettext('Search')} value={search} onChange={setSearch} />
            <PgButtonGroup size="small" style={{marginLeft: '4px'}}>
              {params.dialog_type == 'storage_dialog' &&
              <PgIconButton title={gettext('Download')} icon={<GetAppRoundedIcon />}
                onClick={onDownload} disabled={showUploader || isNoneSelected || selectedRow?.file_type == 'dir' || selectedRow?.file_type == 'drive'} />}
              {fmUtilsObj.hasCapability('create') && !restrictedSharedStorage.includes(selectedSS) && <PgIconButton title={gettext('New Folder')} icon={<CreateNewFolderRoundedIcon />}
                onClick={onAddFolder} disabled={showUploader} />}
            </PgButtonGroup>
            <PgButtonGroup size="small" style={{marginLeft: '4px'}}>
              <PgIconButton title={gettext('Options')} icon={<MoreHorizRoundedIcon />}
                name="menu-options" ref={optionsRef} onClick={toggleMenu} disabled={showUploader} />
            </PgButtonGroup>
            <PgMenu
              anchorRef={optionsRef}
              open={openMenuName=='menu-options'}
              onClose={onMenuClose}
              label={gettext('Options')}
            >
              {fmUtilsObj.hasCapability('rename') && !restrictedSharedStorage.includes(selectedSS) && <PgMenuItem hasCheck onClick={renameSelectedItem} disabled={isNoneSelected}>
                {gettext('Rename')}
              </PgMenuItem>}
              {fmUtilsObj.hasCapability('delete') && !restrictedSharedStorage.includes(selectedSS) && <PgMenuItem hasCheck onClick={deleteSelectedItem} disabled={isNoneSelected}>
                {gettext('Delete')}
              </PgMenuItem>}
              {fmUtilsObj.hasCapability('upload') && !restrictedSharedStorage.includes(selectedSS) && <>
                <PgMenuDivider />
                <PgMenuItem hasCheck onClick={(e)=>{
                  e.keepOpen = false;
                  setShowUploader(true);
                }}>{gettext('Upload')}</PgMenuItem>
              </>}
              <PgMenuDivider />
              <PgMenuItem hasCheck checked={viewMode == 'list'} onClick={(e)=>toggleViewMode(e, 'list')}>{gettext('List View')}</PgMenuItem>
              <PgMenuItem hasCheck checked={viewMode == 'grid'} onClick={(e)=>toggleViewMode(e, 'grid')}>{gettext('Grid View')}</PgMenuItem>
              <PgMenuDivider />
              <PgMenuItem hasCheck checked={fmUtilsObj.showHiddenFiles} onClick={async (e)=>{
                e.keepOpen = false;
                fmUtilsObj.showHiddenFiles = !fmUtilsObj.showHiddenFiles;
                await openDir(fmUtilsObj.currPath, selectedSS);
              }}>{gettext('Show Hidden Files')}</PgMenuItem>
            </PgMenu>
            {
              sharedStorages.length > 0 &&
              <PgMenu
                anchorRef={sharedSRef}
                open={openMenuName=='menu-shared-storage'}
                onClose={onMenuClose}
                label={gettext(`${selectedSS}`)}
              >
                <PgMenuItem hasCheck value="my_storage" checked={selectedSS == MY_STORAGE} datalabel={'my_storage'}
                  onClick={async (option)=> {
                    option.keepOpen = false;
                    await changeDir(option.value);
                  }}><FolderIcon className='FileManager-sharedIcon'/><Box className='FileManager-storageName'>{gettext('My Storage')}</Box></PgMenuItem>

                {
                  sharedStorages.map((ss)=> {
                    return (
                      <PgMenuItem key={ss} hasCheck value={ss} checked={selectedSS == ss} datalabel={ss}
                        onClick={async(option)=> {
                          option.keepOpen = false;
                          await changeDir(option.value);
                        }}><FolderSharedIcon className='FileManager-sharedIcon'/><Box className='FileManager-storageName'>{gettext(ss)}</Box></PgMenuItem>);
                  })
                }

              </PgMenu>
            }
          </Box>
          <Box flexGrow="1" display="flex" flexDirection="column" position="relative" overflow="hidden">
            {showUploader &&
              <Uploader fmUtilsObj={fmUtilsObj}
                onClose={async (filesUploaded)=>{
                  setShowUploader(false);
                  if(filesUploaded) {
                    await openDir(fmUtilsObj.currPath, selectedSS);
                  }
                }}/>}
            {viewMode == 'list' &&
            <ListView key={fmUtilsObj.currPath} items={filteredItems} operation={operation} onItemEnter={onItemEnter}
              onItemSelect={onItemSelect} onItemClick={onItemClick} sortColumns={sortColumns} onSortColumnsChange={setSortColumns}/>}
            {viewMode == 'grid' &&
            <GridView key={fmUtilsObj.currPath} items={filteredItems} operation={operation} onItemEnter={onItemEnter}
              onItemSelect={onItemSelect} />}
            <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={_.escape(errorMsg)} closable onClose={()=>setErrorMsg('')}  />
            {params.dialog_type == 'create_file' &&
            <Box className={'FileManager-footer ' + 'FileManager-footerSaveAs'}>
              <span style={{whiteSpace: 'nowrap', marginRight: '4px'}}>Save As</span>
              <InputText inputRef={saveAsRef} autoFocus style={{height: '28px'}} value={saveAs} onChange={setSaveAs} />
            </Box>}
            {params.dialog_type != 'select_folder' &&
            <Box className={'FileManager-footer ' + 'FileManager-footer1'}>
              <Box>{itemsText}</Box>
              <Box>
                <span style={{marginRight: '8px'}}>File Format</span>
                <InputSelectNonSearch value={fileType} className='FileManager-formatSelect'
                  onChange={(e)=>{
                    let val = e.target.value;
                    fmUtilsObj.setFileType(val);
                    openDir(fmUtilsObj.currPath, selectedSS);
                    setFileType(val);
                  }}
                  options={fmUtilsObj.allowedFileTypes?.map((type)=>({
                    label: type == '*' ? gettext('All Files') : type, value: type
                  }))} />
              </Box>
            </Box>}
          </Box>
        </Box>
        <Box className='FileManager-footer'>
          <PgButtonGroup style={{flexGrow: 1}}>
          </PgButtonGroup>
          <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={()=>{
            onCancel?.();
            closeModal();
          }} >{gettext('Cancel')}</DefaultButton>
          {params.dialog_type != 'storage_dialog' &&
            <PrimaryButton data-test="save" className='FileManager-margin' startIcon={<CheckRoundedIcon />}
              onClick={onOkClick} disabled={okBtnDisable || showUploader}>{okBtnText}</PrimaryButton>}
        </Box>
      </StyledBox>
    </ErrorBoundary>
  );
}

FileManager.propTypes = {
  params: PropTypes.object,
  closeModal: PropTypes.func,
  onOK: PropTypes.func,
  onCancel: PropTypes.func,
  sharedStorages: PropTypes.array,
  restrictedSharedStorage: PropTypes.array,
};
