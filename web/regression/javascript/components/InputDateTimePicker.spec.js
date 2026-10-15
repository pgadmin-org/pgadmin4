/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import {render} from '@testing-library/react';
import {DatePicker, DateTimePicker, TimePicker} from '@mui/x-date-pickers';
import {InputDateTimePicker} from '../../../pgadmin/static/js/components/FormComponents';

jest.mock('@mui/x-date-pickers', () => ({
  DatePicker: jest.fn(() => null),
  DateTimePicker: jest.fn(() => null),
  TimePicker: jest.fn(() => null),
}));

describe('InputDateTimePicker clock mode', () => {
  beforeEach(() => jest.clearAllMocks());

  describe.each([
    ['Date', DatePicker],
    ['Time', TimePicker],
    ['DateTime', DateTimePicker],
  ])('%s picker', (pickerType, Picker) => {
    it.each([false, true, undefined])('forwards ampm=%s unchanged', (ampm) => {
      const controlProps = {pickerType};
      if (ampm !== undefined) {
        controlProps.ampm = ampm;
      }
      render(<InputDateTimePicker value={null} onChange={jest.fn()}
        controlProps={controlProps} />);
      expect(Picker).toHaveBeenCalled();
      expect(Picker.mock.calls[0][0].ampm).toBe(ampm);
    });
  });
});
