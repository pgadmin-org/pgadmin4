/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render } from '@testing-library/react';

import Theme from 'sources/Theme';
import Wizard from '../../../pgadmin/static/js/helpers/wizard/Wizard';
import WizardStep from '../../../pgadmin/static/js/helpers/wizard/WizardStep';

describe('Wizard', () => {
  it('WizardPanel', () => {
    render(
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

