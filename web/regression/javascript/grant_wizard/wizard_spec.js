/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import { messages } from '../fake_messages';
// import GrantWizard from '../../../pgadmin/tools/grant_wizard/static/js/grant_wizard_view';
import Theme from 'sources/Theme';
import Wizard from '../../../pgadmin/browser/static/js/WizardView';
import WizardStep from '../../../pgadmin/browser/static/js/WizardStep';

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
          onStepChange={()=> {}}
          onSave={()=>{}}
          className={''}
          disableNextStep={()=>{return false;}}
        >
          <WizardStep stepId={0} className={''}>
          </WizardStep>
        </Wizard>
      </Theme>);
  });
});

