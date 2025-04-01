import { styled } from '@mui/material/styles';
import React, { useContext } from 'react';
import { PANELS, QUERY_TOOL_EVENTS, MAX_QUERY_LENGTH } from '../QueryToolConstants';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import _ from 'lodash';
import { Box, Grid, List, ListItem, ListItemButton, ListSubheader } from '@mui/material';
import url_for from 'sources/url_for';
import { QueryToolConnectionContext, QueryToolContext, QueryToolEventsContext } from '../QueryToolComponent';
import moment from 'moment';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import ExplicitRoundedIcon from '@mui/icons-material/ExplicitRounded';
import { SaveDataIcon, CommitIcon, RollbackIcon, ViewDataIcon } from '../../../../../../static/js/components/ExternalIcon';
import { InputSwitch } from '../../../../../../static/js/components/FormComponents';
import CodeMirror from '../../../../../../static/js/components/ReactCodeMirror';
import { DefaultButton } from '../../../../../../static/js/components/Buttons';
import { useDelayedCaller, useForceUpdate } from '../../../../../../static/js/custom_hooks';
import Loader from 'sources/components/Loader';
import { LayoutDockerContext, LAYOUT_EVENTS } from '../../../../../../static/js/helpers/Layout';
import PropTypes from 'prop-types';
import { parseApiError } from '../../../../../../static/js/api_instance';
import * as clipboard from '../../../../../../static/js/clipboard';
import EmptyPanelMessage from '../../../../../../static/js/components/EmptyPanelMessage';

const Root = styled('div')(({ theme }) => ({
  display: 'flex',
  height: '100%',
  '.QuerySources-leftRoot': {
    flexBasis: '50%',
    maxWidth: '50%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.otherVars.editorToolbarBg,
    ...theme.mixins.panelBorder.right,
    '& .QuerySources-header': {
      padding: '0.25rem',
      display: 'flex',
      flexWrap: 'wrap',
      '& .QuerySources-removeBtnMargin': {
        marginLeft: '0.25rem',
      },
    },
    '& .QuerySources-listRoot': {
      ...theme.mixins.panelBorder.top,
      '& .QuerySources-removePadding': {
        padding: 0,
        '& .QuerySources-listSubheader': {
          padding: '0.25rem',
          lineHeight: 'unset',
          color: theme.palette.text.muted,
          backgroundColor: theme.palette.background.default,
          ...theme.mixins.panelBorder.bottom,
          ...theme.mixins.fontSourceCode,
        },
        '& .QuerySources-fontSourceCode': {
          ...theme.mixins.fontSourceCode,
          userSelect: 'text',
        },
        '& .QuerySources-itemError': {
          backgroundColor: theme.palette.error.light,
          '&.Mui-selected': {
            backgroundColor: theme.palette.error.light,
            '&:hover': {
              backgroundColor: theme.palette.error.light,
            }
          }
        },
      },
    },
  },
  '& .QuerySources-detailsQuery': {
    marginTop: '0.5rem',
    ...theme.mixins.panelBorder.all,
    '& .QuerySources-copyBtn': {
      borderRadius: 0,
      paddingLeft: '8px',
      paddingRight: '8px',
      borderTop: 'none',
      borderLeft: 'none',
      borderColor: theme.otherVars.borderColor,
      fontSize: '13px',
    },
    '& .QuerySources-queryMargin': {
      marginTop: '12px',
    },
  },
  '& .QuerySources-infoHeader': {
    fontSize: '13px',
    padding: '0.5rem',
    backgroundColor: theme.otherVars.editorToolbarBg,
  },
}));

export const QuerySources = {
  EXECUTE: {
    ICON_CSS_CLASS: 'fa fa-play',
  },
  EXPLAIN: {
    ICON_CSS_CLASS: 'fa fa-hand-pointer',
  },
  EXPLAIN_ANALYZE: {
    ICON_CSS_CLASS: 'fa fa-list-alt',
  },
  COMMIT: {
    ICON_CSS_CLASS: 'pg-font-icon icon-commit',
  },
  ROLLBACK: {
    ICON_CSS_CLASS: 'pg-font-icon icon-rollback',
  },
  SAVE_DATA: {
    ICON_CSS_CLASS: 'pg-font-icon icon-save_data_changes',
  },
  VIEW_DATA: {
    ICON_CSS_CLASS: 'pg-font-icon icon-view_data',
  },
};

function getDateFormatted(date) {
  if (pgAdmin['pgadmin_server_locale'] !== '')
    return date.toLocaleDateString(pgAdmin['pgadmin_server_locale']);
  return date.toLocaleDateString();
}

function getTimeFormatted(time) {
  if (pgAdmin['pgadmin_server_locale'] !== '')
    return time.toLocaleTimeString(pgAdmin['pgadmin_server_locale']);
  return time.toLocaleTimeString();
}

class QueryHistoryUtils {
  constructor() {
    this._entries = [];
    this.showInternal = true;
  }

  dateAsGroupKey(date) {
    return moment(date).format('YYYY MM DD');
  }

  getItemKey(entry) {
    return this.dateAsGroupKey(entry.start_time) + this.formatEntryDate(entry.start_time) + (entry.subKey ?? '');
  }

  formatEntryDate(date) {
    return moment(date).format('HH:mm:ss');
  }

  isDaysBefore(date, before) {
    return (
      getDateFormatted(date) ===
      getDateFormatted(moment().subtract(before, 'days').toDate())
    );
  }

  getDatePrefix(date) {
    let prefix = '';
    if (this.isDaysBefore(date, 0)) {
      prefix = gettext('Today - ');
    } else if (this.isDaysBefore(date, 1)) {
      prefix = gettext('Yesterday - ');
    }
    return prefix;
  }

  addEntry(entry) {
    entry.groupKey = this.dateAsGroupKey(entry.start_time);
    entry.itemKey = this.getItemKey(entry);
    let existEntry = _.find(this._entries, (e)=>e.itemKey==entry.itemKey);
    if(existEntry) {
      entry.itemKey = this.getItemKey(entry) + _.uniqueId();
    }
    let insertIndex = _.sortedIndexBy(this._entries, entry, (e)=>e.itemKey);
    this._entries = [
      ...this._entries.slice(0, insertIndex),
      entry,
      ...this._entries.slice(insertIndex),
    ];
  }

  getEntries() {
    if(!this.showInternal) {
      return this._entries.filter((e)=>!e.is_pgadmin_query);
    }
    return this._entries;
  }

  getEntry(itemKey) {
    return _.find(this.getEntries(), (e)=>e.itemKey==itemKey);
  }

  getGroupHeader(entry) {
    return this.getDatePrefix(entry.start_time)+getDateFormatted(entry.start_time);
  }

  getGroups() {
    return _.sortedUniqBy(this.getEntries().map((e)=>[e.groupKey, this.getGroupHeader(e)]), (g)=>g[0]).reverse();
  }

  getGroupEntries(groupKey) {
    return this.getEntries().filter((e)=>e.groupKey==groupKey).reverse();
  }

  getNextItemKey(currKey) {
    let nextIndex = this.getEntries().length-1;
    if(currKey) {
      let currIndex = _.findIndex(this.getEntries(), (e)=>e.itemKey==currKey);
      if(currIndex == 0) {
        nextIndex = currIndex;
      } else {
        nextIndex = currIndex - 1;
      }
    }
    return this.getEntries()[nextIndex]?.itemKey;
  }

  getPrevItemKey(currKey) {
    let nextIndex = this.getEntries().length-1;
    if(currKey) {
      let currIndex = _.findIndex(this.getEntries(), (e)=>e.itemKey==currKey);
      if(currIndex == this.getEntries().length-1) {
        nextIndex = currIndex;
      } else {
        nextIndex = currIndex + 1;
      }
    }
    return this.getEntries()[nextIndex]?.itemKey;
  }

  clear(itemKey) {
    if(itemKey) {
      let nextKey = this.getNextItemKey(itemKey);
      let removeIdx = _.findIndex(this._entries, (e)=>e.itemKey==itemKey);
      this._entries.splice(removeIdx, 1);
      return nextKey;
    } else {
      this._entries = [];
    }
  }

  size() {
    return this._entries.length;
  }
}

function QuerySourceIcon({source}) {
  switch(JSON.stringify(source)) {
  case JSON.stringify(QuerySources.EXECUTE):
    return <PlayArrowRoundedIcon style={{marginLeft: '-4px'}} data-label="ExecuteIcon" />;
  case JSON.stringify(QuerySources.EXPLAIN):
    return <ExplicitRoundedIcon data-label="ExplainIcon" />;
  case JSON.stringify(QuerySources.EXPLAIN_ANALYZE):
    return <AssessmentRoundedIcon data-label="ExplainAnalyzeIcon" />;
  case JSON.stringify(QuerySources.COMMIT):
    return <CommitIcon style={{marginLeft: '-4px'}}/>;
  case JSON.stringify(QuerySources.ROLLBACK):
    return <RollbackIcon style={{marginLeft: '-4px'}}/>;
  case JSON.stringify(QuerySources.SAVE_DATA):
    return <SaveDataIcon style={{marginLeft: '-4px'}}/>;
  case JSON.stringify(QuerySources.VIEW_DATA):
    return <ViewDataIcon style={{marginLeft: '-4px'}}/>;
  default:
    return <></>;
  }
}
QuerySourceIcon.propTypes = {
  source: PropTypes.object,
};

function HistoryEntry({entry, formatEntryDate, itemKey, selectedItemKey, onClick}) {
  return <ListItemButton component='li' tabIndex="0" data-label="history-entry" data-pgadmin={entry.is_pgadmin_query} ref={(ele)=>{
    selectedItemKey==itemKey && ele?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }} className={'QuerySources-fontSourceCode ' + (entry.status ? '' : 'QuerySources-itemError')} selected={selectedItemKey==itemKey} onClick={onClick}>
    <Box whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden" >
      <QuerySourceIcon source={entry.query_source}/>
      {entry.query}
    </Box>
    <Box fontSize="12px">
      {formatEntryDate(entry.start_time)}
    </Box>
  </ListItemButton>;
}

const EntryPropType = PropTypes.shape({
  info: PropTypes.string,
  status: PropTypes.bool,
  start_time: PropTypes.objectOf(Date),
  query: PropTypes.string,
  row_affected: PropTypes.number,
  total_time: PropTypes.string,
  message: PropTypes.string,
  query_source: PropTypes.object,
  is_pgadmin_query: PropTypes.bool,
});
HistoryEntry.propTypes = {
  entry: EntryPropType,
  formatEntryDate: PropTypes.func,
  itemKey: PropTypes.string,
  selectedItemKey: PropTypes.string,
  onClick: PropTypes.func,
};

function QueryHistoryDetails({entry}) {

  const [copyText, setCopyText] = React.useState(gettext('Copy'));
  const eventBus = React.useContext(QueryToolEventsContext);
  const revertCopiedText = useDelayedCaller(()=>{
    setCopyText(gettext('Copy'));
  });

  const onCopyClick = React.useCallback(()=>{
    clipboard.copyToClipboard(entry.query);
    setCopyText(gettext('Copied!'));
    revertCopiedText(1500);
  }, [entry]);

  const onCopyToEditor = React.useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.COPY_TO_EDITOR, entry.query);
  }, [entry]);

  if(!entry) {
    return <Box display="flex" height="100%">
      <EmptyPanelMessage text={gettext('Select an history entry to see details.')} />
    </Box>;
  }

  return (
    <>
      {entry.info && <Box className='QuerySources-infoHeader'>{entry.info}</Box>}
      <Box padding="0.5rem" data-label="history-detail">
        <Grid container>
          <Grid item sm={4}>{getDateFormatted(entry.start_time) + ' ' + getTimeFormatted(entry.start_time)}</Grid>
          <Grid item sm={4}>{entry?.row_affected > 0 && entry.row_affected}</Grid>
          <Grid item sm={4}>{entry.total_time}</Grid>
        </Grid>
        <Grid container>
          <Grid item sm={4}>{gettext('Date')}</Grid>
          <Grid item sm={4}>{gettext('Rows affected')}</Grid>
          <Grid item sm={4}>{gettext('Duration')}</Grid>
        </Grid>
        <Box className='QuerySources-detailsQuery'>
          <DefaultButton size="xs" className='QuerySources-copyBtn' onClick={onCopyClick}>{copyText}</DefaultButton>
          <DefaultButton size="xs" className='QuerySources-copyBtn' onClick={onCopyToEditor}>{gettext('Copy to Query Editor')}</DefaultButton>
          <CodeMirror
            value={entry.query}
            readonly={true}
            options={{
              foldGutter: false,
              lineNumbers: false,
              gutters: [],
            }}
            className='QuerySources-queryMargin'
          />
        </Box>
        <Box marginTop="0.5rem">
          <Box>{gettext('Messages')}</Box>
          <Box className='QuerySources-fontSourceCode' fontSize="13px" whiteSpace="pre-wrap">{_.isObject(entry.message) ? JSON.stringify(entry.message) : entry.message}</Box>
        </Box>
      </Box>
    </>
  );
}

QueryHistoryDetails.propTypes = {
  entry: EntryPropType,
};

export function QueryHistory() {
  const qhu = React.useRef(new QueryHistoryUtils());
  const queryToolCtx = React.useContext(QueryToolContext);
  const queryToolConnCtx = React.useContext(QueryToolConnectionContext);

  const eventBus = React.useContext(QueryToolEventsContext);
  const [selectedItemKey, setSelectedItemKey] = React.useState(1);
  const [showInternal, setShowInternal] = React.useState(true);
  const forceUpdate = useForceUpdate();
  const [loaderText, setLoaderText] = React.useState('');
  const selectedEntry = qhu.current.getEntry(selectedItemKey);
  const layoutDocker = useContext(LayoutDockerContext);
  const listRef = React.useRef();

  React.useEffect(()=>{
    layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.ACTIVE, (currentTabId)=>{
      currentTabId == PANELS.HISTORY && listRef.current?.focus();
    });
  }, []);

  const fetchQueryHistory = async() =>{
    if(!queryToolConnCtx.connected) {
      return;
    }
    setLoaderText(gettext('Fetching history...'));
    try {
      let {data: respData} = await queryToolCtx.api.get(url_for('sqleditor.get_query_history', {
        'trans_id': queryToolCtx.params.trans_id,
      }));
      respData.data.result.forEach((h)=>{
        try {
          h = JSON.parse(h);
          h.start_time_orig = h.start_time;
          h.start_time = new Date(h.start_time);
          qhu.current.addEntry(h);
        } catch {
          /* skip the hist record */
          return;
        }
      });
      setSelectedItemKey(qhu.current.getNextItemKey());
    } catch (error) {
      console.error(error);
      pgAdmin.Browser.notifier.error(gettext('Failed to fetch query history.') + parseApiError(error));
    }
    setLoaderText('');

    const pushHistory = (h)=>{
      // Do not store query text if max lenght exceeds.
      if(h?.query?.length > MAX_QUERY_LENGTH) {
        h = {
          ...h,
          query: gettext(`-- Query text not stored as it exceeds maximum length of ${MAX_QUERY_LENGTH}`)
        };
      }
      qhu.current.addEntry(h);
      forceUpdate();
    };

    listRef.current?.focus();
    eventBus.registerListener(QUERY_TOOL_EVENTS.PUSH_HISTORY, pushHistory);
    return ()=>eventBus.deregisterListener(QUERY_TOOL_EVENTS.PUSH_HISTORY, pushHistory);
  };

  React.useEffect(() =>{
    fetchQueryHistory();
  },[queryToolConnCtx.connected]);

  const onRemove = async ()=>{
    setLoaderText(gettext('Removing history entry...'));
    try {
      await queryToolCtx.api.delete(url_for('sqleditor.clear_query_history', {
        'trans_id': queryToolCtx.params.trans_id,
      }), {
        data: {
          query: selectedEntry.query,
          start_time: selectedEntry.start_time,
        }
      });
      setSelectedItemKey(qhu.current.clear(selectedItemKey));
    } catch (error) {
      console.error(error);
      pgAdmin.Browser.notifier.error(gettext('Failed to remove query history.') + parseApiError(error));
    }
    setLoaderText('');
  };

  const onRemoveAll = React.useCallback(()=>{
    queryToolCtx.modal.confirm(gettext('Clear history'),
      gettext('Are you sure you wish to clear the history?') + '</br>' +
      gettext('This will remove all of your query history from this and other sessions for this database.'),
      async function() {
        setLoaderText(gettext('Removing history...'));
        try {
          await queryToolCtx.api.delete(url_for('sqleditor.clear_query_history', {
            'trans_id': queryToolCtx.params.trans_id,
          }));
          qhu.current.clear();
          setSelectedItemKey(null);
        } catch (error) {
          console.error(error);
          pgAdmin.Browser.notifier.error(gettext('Failed to remove query history.') + parseApiError(error));
        }
        setLoaderText('');
      },
      function() {
        return true;
      }
    );

  }, []);

  const onKeyPressed = (e) => {
    if (e.keyCode == '38') {
      e.preventDefault();
      setSelectedItemKey(qhu.current.getPrevItemKey(selectedItemKey));
    } else if (e.keyCode == '40') {
      e.preventDefault();
      setSelectedItemKey(qhu.current.getNextItemKey(selectedItemKey));
    }
  };

  return (
    <Root>
      <Loader message={loaderText} />
      {React.useMemo(()=>(
        <>
          {qhu.current.size() == 0 ?
            <EmptyPanelMessage text={gettext('No history found')} />:
            <>
              <Box className='QuerySources-leftRoot'>
                <Box className='QuerySources-header'>
                  <Box marginRight="auto">
                    {gettext('Show queries generated internally by pgAdmin?')}
                    <InputSwitch value={showInternal} onChange={(e)=>{
                      setShowInternal(e.target.checked);
                      qhu.current.showInternal = e.target.checked;
                      setSelectedItemKey(qhu.current.getNextItemKey());
                    }} />
                  </Box>
                  <Box>
                    <DefaultButton size="small" disabled={!selectedItemKey} onClick={onRemove}>{gettext('Remove')}</DefaultButton>
                    <DefaultButton size="small" disabled={!qhu.current?.getGroups()?.length}
                      className='QuerySources-removeBtnMargin' onClick={onRemoveAll}>{gettext('Remove All')}</DefaultButton>
                  </Box>
                </Box>
                <Box flexGrow="1" overflow="auto" className='QuerySources-listRoot'>
                  <List ref={listRef} subheader={<li />} tabIndex="0" onKeyDown={onKeyPressed}>
                    {qhu.current.getGroups().map(([groupKey, groupHeader]) => (
                      <ListItem key={`section-${groupKey}`} className='QuerySources-removePadding'>
                        <List className='QuerySources-removePadding'>
                          <ListSubheader className='QuerySources-listSubheader'>{groupHeader}</ListSubheader>
                          {qhu.current.getGroupEntries(groupKey).map((entry) => (
                            <HistoryEntry key={entry.itemKey} entry={entry} formatEntryDate={qhu.current.formatEntryDate}
                              itemKey={entry.itemKey} selectedItemKey={selectedItemKey} onClick={()=>{setSelectedItemKey(entry.itemKey);}}/>
                          ))}
                        </List>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
              <Box flexBasis="50%" maxWidth="50%" overflow="auto">
                <QueryHistoryDetails entry={selectedEntry}/>
              </Box>
            </>}
        </>
      ), [selectedItemKey, showInternal, qhu.current.size()])}
    </Root>
  );
}
