/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import { messages } from '../fake_messages';
import Theme from 'sources/Theme';
import Wizard from '../../../pgadmin/static/js/helpers/wizard/Wizard';
import WizardStep from '../../../pgadmin/static/js/helpers/wizard/WizardStep';

describe('Wizard', () => {
  let mount;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(() => {
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('WizardPanel', () => {
    mount(
      <Theme>
        <Wizard
          stepList={['Test']}
          onStepChange={()=> {/*This is intentional (SonarQube)*/}}
          onSave={()=>{/*This is intentional (SonarQube)*/}}
          className={''}
          disableNextStep={()=>{return false;}}
        >
          <WizardStep stepId={0} className={''}>
          </WizardStep>
        </Wizard>
      </Theme>);
  });
});

