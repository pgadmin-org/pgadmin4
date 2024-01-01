/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import ConnectionBar, {STATUS} from 'pgadmin.tools.erd/erd_tool/components/ConnectionBar';
import Theme from '../../../../pgadmin/static/js/Theme';
import { render, screen } from '@testing-library/react';

describe('ERD ConnectionBar', ()=>{
  it('<ConnectionBar /> comp', ()=>{
    const connBar = render(<Theme><ConnectionBar status={STATUS.DISCONNECTED} title="test title"/></Theme>);

    expect(screen.getAllByRole('button').at(1).textContent).toBe('test title');

    connBar.rerender(
      <Theme><ConnectionBar status={STATUS.CONNECTING} title="test title"/></Theme>
    );
    expect(screen.getAllByRole('button').at(1).textContent).toBe('(Obtaining connection...) test title');

    connBar.rerender(
      <Theme><ConnectionBar status={STATUS.CONNECTING} title="test title" bgcolor='#000' fgcolor='#fff'/></Theme>
    );
    const styles = screen.getAllByRole('button').at(1).style;
    expect(styles.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(styles.color).toBe('rgb(255, 255, 255)');
  });
});
