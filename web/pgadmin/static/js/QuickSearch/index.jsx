/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useRef,useState, useEffect} from 'react';
import { CircularProgress, Typography, makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import {useDelayDebounce} from 'sources/custom_hooks';
import {onlineHelpSearch} from './online_help';
import {menuSearch} from './menuitems_help';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import { InputText } from '../components/FormComponents';
import EmptyPanelMessage from '../components/EmptyPanelMessage';

const useStyles = makeStyles((theme)=>({
  helpGroup: {
    backgroundColor: theme.palette.grey[400],
    padding: '6px',
    fontSize: '0.85em',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
  },
  searchItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 8px',
    textDecoration: 'none',
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    '&:hover, &:focus': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      outline: 'none !important',
    },
    '&.disabled': {
      opacity: 0.6,
      pointerEvents: 'none',
    }
  },
  showAll: {
    marginLeft: 'auto',
    color: 'inherit',
    textDecoration: 'none'
  },
  loaderRoot: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px',
    justifyContent: 'center',
  },
  loader: {
    height: '25px !important',
    width: '25px !important',
    marginRight: '8px',
  },
}));

function SearchLoader({loading=false}) {
  const classes = useStyles();
  if(loading) {
    return (
      <div className={classes.loaderRoot}>
        <CircularProgress className={classes.loader} />
        <Typography>{gettext('Searching...')}</Typography>
      </div>
    );
  }
  return <></>;
}
SearchLoader.propTypes = {
  loading: PropTypes.bool
};

function HelpArticleContents({isHelpLoading, isMenuLoading, helpSearchResult}) {
  const classes = useStyles();
  return (isHelpLoading && !(isMenuLoading??true)) ? (
    <div>
      <div className={classes.helpGroup}>
        <span className='fa fa-question-circle'></span>
          &nbsp;HELP ARTICLES&nbsp;
        {Object.keys(helpSearchResult.data).length > 10
          ? '(10 of ' + Object.keys(helpSearchResult.data).length + ')'
          : '(' + Object.keys(helpSearchResult.data).length + ')'
        }
        { Object.keys(helpSearchResult.data).length > 10
          ? <a href={helpSearchResult.url} target='_blank' rel='noreferrer'>
          Show all &nbsp;<span className='fas fa-external-link-alt' ></span></a> : ''
        }
      </div>
      <SearchLoader loading={true} />
    </div>) : '';
}

HelpArticleContents.propTypes = {
  helpSearchResult: PropTypes.object,
  isHelpLoading: PropTypes.bool,
  isMenuLoading: PropTypes.bool
};

const useModalStyles = makeStyles(() => ({
  setTop: {
    marginTop: '-20px',
  }
}));

export default function QuickSearch({closeModal}) {
  const modalClasses = useModalStyles();
  const classes = useStyles();
  const wrapperRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isShowMinLengthMsg, setIsShowMinLengthMsg] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(false);
  const [isHelpLoading, setIsHelpLoading] = useState(false);
  const [menuSearchResult, setMenuSearchResult] = useState({
    fetched: false,
    data: [],
  });
  const [helpSearchResult, setHelpSearchResult] = useState({
    fetched: false,
    clearedPooling: true,
    url: '',
    data: [],
  });

  const [showResults, setShowResults] = useState(false);

  const resetSearchState = () => {
    setMenuSearchResult(state => ({
      ...state,
      fetched: false,
      data: [],
    }));

    setHelpSearchResult(state => ({
      ...state,
      fetched: false,
      clearedPooling: true,
      url: '',
      data: {},
    }));
  };

  // Below will be called when any changes has been made to state
  useEffect(() => {
    if(menuSearchResult.fetched){
      setIsMenuLoading(false);
    }

    if(helpSearchResult.fetched){
      setIsHelpLoading(false);
    }
  }, [menuSearchResult, helpSearchResult]);

  const initSearch = (param) => {
    if(param.length < 3) {
      return;
    }
    setIsMenuLoading(true);
    setIsHelpLoading(true);

    onlineHelpSearch(param,  {
      state: helpSearchResult,
      setState: setHelpSearchResult,
    });
    menuSearch(param, {
      state: menuSearchResult,
      setState: setMenuSearchResult,
    });
  };

  // Debounse logic to avoid multiple re-render with each keypress
  useDelayDebounce(initSearch, searchTerm, 1000);

  const toggleDropdownMenu = () => {
    let pooling = window.pooling;
    if(pooling){
      window.clearInterval(pooling);
    }
    document.getElementsByClassName('live-search-field')[0].value = '';
    setTimeout(function(){
      document.getElementById('live-search-field').focus();
    },100);
    resetSearchState();
    setShowResults(!showResults);
    setIsMenuLoading(false);
    setIsHelpLoading(false);
    setIsShowMinLengthMsg(false);
  };

  const refactorMenuItems = (items) => {
    if(items.length > 0){
      let menuItemsHtmlElement = [];
      items.forEach((i) => {
        menuItemsHtmlElement.push(
          <div key={ 'li-menu-' + i.label }><a tabIndex={i.isDisabled ? '-1' : '0'} id={ 'li-menu-' + i.label } href={'#'} className={ (i.isDisabled ? clsx(classes.searchItem, 'disabled'):classes.searchItem)} onClick={
            () => {
              closeModal();
              i.callback();
            }
          }>
            {i.label}
            <span key={ 'menu-span-' + i.label }>{i.path}</span>
          </a>
          </div>);
      });
      return menuItemsHtmlElement;
    }
  };


  const onInputValueChange = (value) => {
    let pooling = window.pooling;
    if(pooling){
      window.clearInterval(pooling);
    }
    resetSearchState();
    setSearchTerm(value);
    if(value.length >= 3){
      setIsMenuLoading(true);
      setIsHelpLoading(true);
      setIsShowMinLengthMsg(false);
    }

    if(value.length < 3 && value.length > 0){
      setIsShowMinLengthMsg(true);
    }

    if(value.length == 0){
      setIsShowMinLengthMsg(false);
    }
  };

  const useOutsideAlerter = (ref) => {
    useEffect(() => {
      /**
           * Alert if clicked on outside of element
           */
      function handleClickOutside(event) {
        if (ref.current && !ref.current.contains(event.target)) {
          let input_element = document.getElementById('live-search-field');
          if(input_element == null){
            return;
          }
          let input_value = input_element.value;
          if(input_value && input_value.length > 0){
            toggleDropdownMenu();
          }
        }
      }
      // Bind the event listener
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        // Unbind the event listener on clean up
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);
  };

  useOutsideAlerter(wrapperRef);

  return (
    <div id='quick-search-container' onClick={setSearchTerm}></div>,
    <div id='quick-search-container' ref={wrapperRef} className={clsx('test', modalClasses.setTop)} role="menu">
      <div>
        <div>
          <div style={{padding: '2px 2px 2px 2px'}}>
            <InputText value={searchTerm} autoComplete='off' autoFocus
              aria-label='live-search-field' cid='live-search-field' placeholder={gettext('Quick Search')} onChange={onInputValueChange} />
          </div>
          <div>
            { isShowMinLengthMsg &&
              <EmptyPanelMessage text={gettext('Please enter minimum 3 characters to search')}
                style={{marginTop: '12px'}}
              />
            }
            <div >
              { (menuSearchResult.fetched && !(isMenuLoading??true) ) ?
                <div>
                  <div className={classes.helpGroup}>
                    <span className='fa fa-bars'></span> &nbsp;{gettext('MENU ITEMS')} ({menuSearchResult.data.length})
                  </div>

                  {refactorMenuItems(menuSearchResult.data)}
                </div> : ''

              }
              <SearchLoader loading={isMenuLoading} />
              {(menuSearchResult.data.length == 0 && menuSearchResult.fetched && !(isMenuLoading??true)) &&
                <EmptyPanelMessage text={gettext('No search results')}
                  style={{marginTop: '12px'}}
                />
              }

              { (helpSearchResult.fetched && !(isHelpLoading??true)) ?
                <div>
                  <div className={classes.helpGroup}>
                    <span className='fa fa-question-circle'></span> &nbsp;{gettext('HELP ARTICLES')} {Object.keys(helpSearchResult.data).length > 10 ?
                      <span> (10 of {Object.keys(helpSearchResult.data).length})</span>:
                      '(' + Object.keys(helpSearchResult.data).length + ')'}&nbsp;
                    { !helpSearchResult.clearedPooling ? <CircularProgress style={{height: '18px', width: '18px'}} /> :''}
                    { Object.keys(helpSearchResult.data).length > 10 ? <a href={helpSearchResult.url} className={classes.showAll} target='_blank' rel='noreferrer'>{gettext('Show all')} &nbsp;<span className='fas fa-external-link-alt' ></span></a> : ''}
                  </div>

                  {Object.keys(helpSearchResult.data).map( (value, index) => {
                    if(index <= 9) {  return <div key={ 'li-help-' + value }><a tabIndex='0' href={helpSearchResult.data[value]} className={classes.searchItem} target='_blank' rel='noreferrer'>{value}</a></div>; }
                  })}

                  {(Object.keys(helpSearchResult.data).length == 0) &&
                    <EmptyPanelMessage text={gettext('No search results')}
                      style={{marginTop: '12px'}}
                    />
                  }

                </div> : <HelpArticleContents isHelpLoading={isHelpLoading} isMenuLoading={isMenuLoading} helpSearchResult={helpSearchResult} /> }
            </div>
          </div>
        </div>
      </div>
      <div id='quick-search-iframe-container' />
    </div>
  );
}


QuickSearch.propTypes = {
  closeModal: PropTypes.func
};
