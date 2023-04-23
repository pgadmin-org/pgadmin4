/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useRef,useState, useEffect} from 'react';
import { makeStyles } from '@material-ui/core';
import clsx from 'clsx';
import {useDelayDebounce} from 'sources/custom_hooks';
import {onlineHelpSearch} from './online_help';
import {menuSearch} from './menuitems_help';
import $ from 'jquery';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';

function HelpArticleContents({isHelpLoading, isMenuLoading, helpSearchResult}) {
  return (isHelpLoading && !(isMenuLoading??true)) ? (
    <div>
      <div className='help-groups'>
        <span className='fa fa-question-circle'></span>
          &nbsp;HELP ARTICLES
        {Object.keys(helpSearchResult.data).length > 10
          ? '(10 of ' + Object.keys(helpSearchResult.data).length + ')'
          : '(' + Object.keys(helpSearchResult.data).length + ')'
        }
        { Object.keys(helpSearchResult.data).length > 10
          ? <a href={helpSearchResult.url} className='pull-right no-padding' target='_blank' rel='noreferrer'>
          Show all &nbsp;<span className='fas fa-external-link-alt' ></span></a> : ''
        }
      </div>
      <div className='pad-12'><div className="search-icon">{gettext('Searching...')}</div></div>
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

export function Search({closeModal}) {
  const classes = useModalStyles();
  const wrapperRef = useRef(null);
  const firstEleRef = useRef();
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
          <li key={ 'li-menu-' + i }><a tabIndex='0' id={ 'li-menu-' + i.label } href={'#'} className={ (i.isDisabled ? 'dropdown-item menu-groups-a disabled':'dropdown-item menu-groups-a')} key={ 'menu-' + i.label } onClick={
            () => {
              closeModal();
              i.callback();
            }
          }>
            {i.label}
            <span key={ 'menu-span-' + i.label }>{i.path}</span>
          </a>
          </li>);
      });
      $('[data-toggle="tooltip"]').tooltip();
      return menuItemsHtmlElement;
    }
  };


  const onInputValueChange = (value) => {
    let pooling = window.pooling;
    if(pooling){
      window.clearInterval(pooling);
    }
    resetSearchState();
    setSearchTerm('');
    if(value.length >= 3){
      setSearchTerm(value);
      setIsMenuLoading(true);
      setIsHelpLoading(true);
      setIsShowMinLengthMsg(false);
    }else{
      setIsMenuLoading(false);
      setIsHelpLoading(false);
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

  const showLoader = (loading) => {
    return loading ? <div className='pad-12'><div className="search-icon">{gettext('Searching...')}</div></div> : '';
  };

  useEffect(() => {
    setTimeout(() => {
      firstEleRef.current && firstEleRef.current.focus();
    }, 350);
  }, [firstEleRef.current]);

  return (
    <div id='quick-search-container' onClick={setSearchTerm}></div>,
    <ul id='quick-search-container' ref={wrapperRef} className={clsx('test', classes.setTop)} role="menu">
      <li>
        <ul id='myDropdown'>
          <li className='dropdown-item-input'>
            <input ref={firstEleRef} tabIndex='0' autoFocus type='text' autoComplete='off' className='form-control live-search-field'
              aria-label='live-search-field' id='live-search-field' placeholder={gettext('Quick Search')} onChange={(e) => {onInputValueChange(e.target.value);} } />
          </li>
          <div style={{marginBottom:0}}>
            <div>

              { isShowMinLengthMsg
                ? (<div className='pad-12 no-results'>
                  <span className='fa fa-info-circle'></span>
                   &nbsp;Please enter minimum 3 characters to search
                </div>)
                :''}
              <div >
                { (menuSearchResult.fetched && !(isMenuLoading??true) ) ?
                  <div>
                    <div className='menu-groups'>
                      <span className='fa fa-window-maximize'></span> &nbsp;{gettext('MENU ITEMS')} ({menuSearchResult.data.length})
                    </div>


                    {refactorMenuItems(menuSearchResult.data)}
                  </div> :  showLoader(isMenuLoading)}

                {(menuSearchResult.data.length == 0 && menuSearchResult.fetched && !(isMenuLoading??true)) ? (<div className='pad-12 no-results'><span className='fa fa-info-circle'></span> {gettext('No search results')}</div>):''}

                { (helpSearchResult.fetched && !(isHelpLoading??true)) ?
                  <div>
                    <div className='help-groups'>
                      <span className='fa fa-question-circle'></span> &nbsp;{gettext('HELP ARTICLES')} {Object.keys(helpSearchResult.data).length > 10 ?
                        <span>(10 of {Object.keys(helpSearchResult.data).length} )
                        </span>:
                        '(' + Object.keys(helpSearchResult.data).length + ')'}&nbsp;
                      { !helpSearchResult.clearedPooling ? <img src='/static/img/loading.gif' alt={gettext('Loading...')} className='help_loading_icon'/> :''}
                      { Object.keys(helpSearchResult.data).length > 10 ? <a href={helpSearchResult.url} className='pull-right no-padding' target='_blank' rel='noreferrer'>{gettext('Show all')} &nbsp;<span className='fas fa-external-link-alt' ></span></a> : ''}
                    </div>

                    {Object.keys(helpSearchResult.data).map( (value, index) => {
                      if(index <= 9) {  return <li key={ 'li-help-' + index }><a tabIndex='0' href={helpSearchResult.data[value]} key={ 'help-' + index } className='dropdown-item' target='_blank' rel='noreferrer'>{value}</a></li>; }
                    })}

                    {(Object.keys(helpSearchResult.data).length == 0) ? (<div className='pad-12 no-results'><span className='fa fa-info-circle'></span> {gettext('No search results')}</div>):''}

                  </div> : <HelpArticleContents isHelpLoading={isHelpLoading} isMenuLoading={isMenuLoading} helpSearchResult={helpSearchResult} /> }
              </div>
            </div>
          </div>
        </ul>
      </li>
      <div id='quick-search-iframe-container' />
    </ul>
  );
}


Search.propTypes = {
  closeModal: PropTypes.func
};
