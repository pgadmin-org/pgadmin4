/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import {render} from '@testing-library/react';
import {genericBeforeEach, getEditView} from '../genericFunctions';
import pgAdmin from '../fake_pgadmin';
import { getBinaryPathSchema } from '../../../pgadmin/preferences/static/js/components/binary_path.ui';

let mockPost = jest.fn();
jest.mock('sources/api_instance', () => () => ({ post: mockPost }));

describe('BinaryPathschema', ()=>{

  let schemaObj = getBinaryPathSchema();
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
  });



  beforeEach(()=>{
    genericBeforeEach();
    mockPost.mockReset();
    pgAdmin.Browser.notifier.alert.mockClear();
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('validate path - empty path', ()=>{
    let validate = _.find(schemaObj.fields, (f)=>f.id=='binaryPath').validate;
    let status = validate('');
    expect(status).toBe(true);
  });

  it('validate path - renders bold labels and line breaks, not raw markup', async ()=>{
    mockPost.mockResolvedValue({
      data: {
        data: [
          {utility: 'pg_dump', version: null},
          {utility: 'psql', version: 'psql 17.2'},
        ],
      },
    });

    let validate = _.find(schemaObj.fields, (f)=>f.id=='binaryPath').validate;
    let status = validate('/some/path');
    expect(status).toBe(true);

    // Let the post().then() microtask run.
    await Promise.resolve();
    await Promise.resolve();

    expect(pgAdmin.Browser.notifier.alert).toHaveBeenCalledTimes(1);
    const [title, node] = pgAdmin.Browser.notifier.alert.mock.calls[0];
    expect(title).toBe('Validate binary path');

    const ctrl = render(node);
    expect(ctrl.container.querySelectorAll('b')).toHaveLength(2);
    expect(ctrl.container.textContent).toContain('pg_dump:');
    expect(ctrl.container.textContent).toContain('not found on the specified binary path.');
    expect(ctrl.container.textContent).toContain('psql:');
    expect(ctrl.container.textContent).toContain('psql 17.2');
    // No literal markup should ever appear in the rendered text.
    expect(ctrl.container.textContent).not.toContain('<b>');
    expect(ctrl.container.textContent).not.toContain('<br/>');
  });

});
