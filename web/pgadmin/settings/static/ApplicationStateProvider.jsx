/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import getApiInstance from '../../static/js/api_instance';
import url_for from 'sources/url_for';

const ApplicationStateContext = React.createContext();

export const useApplicationState = ()=>useContext(ApplicationStateContext);

export function retrieveDataFromLocalStorgae(sqlId){
  let sqlValue = JSON.parse(localStorage.getItem(sqlId));
  localStorage.removeItem(sqlId);   
  return sqlValue;
}

export function ApplicationStateProvider({children}){
  const saveToolData = (data) =>{
    getApiInstance().post(
      url_for('settings.save_application_state'),
      JSON.stringify(data),
    ).catch((error)=>{console.error(error);});
  };

  const value = useMemo(()=>({
    saveToolData,
  }), []);

  return <ApplicationStateContext.Provider value={value}>
    {children}
  </ApplicationStateContext.Provider>;

}

ApplicationStateProvider.propTypes = {
  children: PropTypes.object
};