/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {render} from '@testing-library/react';
import getApiInstance from '../../../../pgadmin/static/js/api_instance';
import {MESSAGE_TYPE} from '../../../../pgadmin/static/js/components/FormComponents';
import {CloudWizardEventsContext} from '../../../../pgadmin/misc/cloud/static/js/CloudWizard';
import {GoogleCredentials} from '../../../../pgadmin/misc/cloud/static/js/google';

let mockCredSchemaProps;

jest.mock('../../../../pgadmin/misc/cloud/static/js/CloudWizard', ()=>{
  const mockReact = require('react');
  return {CloudWizardEventsContext: mockReact.createContext(null)};
});

jest.mock('../../../../pgadmin/misc/cloud/static/js/google_schema.ui', ()=>({
  GoogleCredSchema: jest.fn(function(props) {
    mockCredSchemaProps = props;
  }),
  GoogleClusterSchema: jest.fn(()=>({})),
  GoogleDatabaseSchema: jest.fn(()=>({})),
}));

jest.mock('../../../../pgadmin/static/js/SchemaView', ()=>()=>null);

jest.mock('../../../../pgadmin/static/js/api_instance', ()=>({
  __esModule: true, default: jest.fn(),
}));

jest.mock('sources/url_for', ()=>({
  __esModule: true, default: jest.fn((endpoint)=>endpoint),
}));

jest.mock('pgbrowser/node_ajax', ()=>({
  getNodeAjaxOptions: jest.fn(()=>Promise.resolve([])),
  getNodeListById: jest.fn(()=>[]),
}));

function renderCredentials() {
  const fireEvent = jest.fn();
  render(
    <CloudWizardEventsContext.Provider value={{fireEvent}}>
      <GoogleCredentials cloudProvider="google" setGoogleCredData={()=>{}} />
    </CloudWizardEventsContext.Provider>
  );
  return fireEvent;
}

function mockRejection(rejection) {
  getApiInstance.mockReturnValue(
    {post: jest.fn(()=>Promise.reject(rejection))});
}

describe('Google credentials authentication failure', ()=>{
  it('shows the message the server sent and resets the wizard', async ()=>{
    const fireEvent = renderCredentials();
    mockRejection({response: {data: {
      errormsg: 'The client secret file is not a valid Google OAuth client secret JSON file.'}}});

    await expect(mockCredSchemaProps.authenticateGoogle('/tmp/secret.json'))
      .rejects.toThrow(
        'The client secret file is not a valid Google OAuth client secret JSON file.');

    expect(fireEvent).toHaveBeenCalledWith('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD', [
      MESSAGE_TYPE.ERROR,
      'The client secret file is not a valid Google OAuth client secret JSON file.']);
    expect(fireEvent).toHaveBeenCalledWith('SET_CRED_VERIFICATION_INITIATED', false);
  });

  it('falls back to the request error and resets the wizard', async ()=>{
    const fireEvent = renderCredentials();
    mockRejection(new Error('boom'));

    await expect(mockCredSchemaProps.authenticateGoogle('/tmp/secret.json'))
      .rejects.toThrow('Error during authentication: Error: boom');

    expect(fireEvent).toHaveBeenCalledWith('SET_ERROR_MESSAGE_FOR_CLOUD_WIZARD', [
      MESSAGE_TYPE.ERROR, 'Error during authentication: Error: boom']);
    expect(fireEvent).toHaveBeenCalledWith('SET_CRED_VERIFICATION_INITIATED', false);
  });
});
