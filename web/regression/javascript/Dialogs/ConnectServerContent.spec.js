/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, fireEvent } from '@testing-library/react';
import { withTheme } from '../fake_theme';
import ConnectServerContent from '../../../pgadmin/static/js/Dialogs/ConnectServerContent';

const Themed = withTheme(ConnectServerContent);

function submit(data, {tick=false}={}) {
  const onOK = jest.fn();
  render(<Themed closeModal={jest.fn()} onOK={onOK} data={{
    prompt_password: true,
    allow_save_password: true,
    ...data,
  }} />);
  if(tick) {
    fireEvent.click(screen.getByRole('checkbox'));
  }
  fireEvent.click(document.querySelector('[data-test="save"]'));
  return onOK.mock.calls[0][0];
}

describe('ConnectServerContent save_password', () => {
  it('sends false when the server reported save_password and it was unticked', () => {
    const formData = submit({save_password: false});
    expect(formData.get('save_password')).toBe('false');
  });

  it('seeds the checkbox from the server setting and sends true', () => {
    const formData = submit({save_password: true});
    expect(formData.get('save_password')).toBe('true');
  });

  it('does not send the field when the prompt did not report it and it is unticked', () => {
    const formData = submit({});
    expect(formData.has('save_password')).toBe(false);
  });

  it('sends true when the prompt did not report it but the user ticked the box', () => {
    const formData = submit({}, {tick: true});
    expect(formData.get('save_password')).toBe('true');
  });
});
