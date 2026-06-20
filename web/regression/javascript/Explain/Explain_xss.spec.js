/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render } from '@testing-library/react';

import Analysis from '../../../pgadmin/static/js/Explain/Analysis';
import { nodeExplainTableData } from '../../../pgadmin/static/js/Explain/index';
import { withTheme } from '../fake_theme';

const ThemedAnalysis = withTheme(Analysis);


function newExplainContext() {
  return {
    explainTable: {
      rows: [],
      show_timings: false,
      show_rowsx: false,
      show_rows: false,
      show_plan_rows: false,
      statistics: {
        nodes: {},
        tables: {},
      },
    },
  };
}

function lastRow(ctx) {
  return ctx.explainTable.rows[ctx.explainTable.rows.length - 1];
}


describe('Explain nodeExplainTableData escaping', () => {
  // Regression: prior code concatenated Recheck Cond and Exact Heap Blocks
  // into the HTML string without _.escape(). All sibling extra-info fields
  // escaped, but those two did not. An attacker who could influence the
  // plan output (column names, expressions in a Recheck Cond) could inject
  // markup that would later flow through HTMLReactParse in Analysis.jsx.

  it('escapes Recheck Cond before storing as HTML', () => {
    const ctx = newExplainContext();
    nodeExplainTableData({
      'Node Type': 'Bitmap Heap Scan',
      'image_text': 'Bitmap Heap Scan',
      'Recheck Cond': '<img src=x onerror="alert(1)">',
    }, ctx);
    const extra = lastRow(ctx).node_extra_info.join('|');
    expect(extra).toContain('Recheck Cond');
    // _.escape converts < / > / " to entities so the markup cannot be
    // re-parsed into a real <img> element downstream. Asserting on the
    // angle-bracket entity is what actually matters here.
    expect(extra).not.toContain('<img');
    expect(extra).toContain('&lt;img');
  });

  it('escapes Exact Heap Blocks before storing as HTML', () => {
    const ctx = newExplainContext();
    nodeExplainTableData({
      'Node Type': 'Bitmap Heap Scan',
      'image_text': 'Bitmap Heap Scan',
      'Exact Heap Blocks': '<script>alert(1)</script>',
    }, ctx);
    const extra = lastRow(ctx).node_extra_info.join('|');
    expect(extra).toContain('Heap Blocks');
    expect(extra).not.toContain('<script');
    expect(extra).toContain('&lt;script');
  });

  it('escapes all previously-safe sibling fields too (regression)', () => {
    // Belt-and-braces: confirm the existing _.escape sites still work
    // after the diff so we don't accidentally regress any of them.
    const ctx = newExplainContext();
    nodeExplainTableData({
      'Node Type': 'Hash Join',
      'image_text': 'Hash Join',
      'Filter': '<i>filter</i>',
      'Index Cond': '<i>icond</i>',
      'Hash Cond': '<i>hcond</i>',
      'Join Filter': '<i>jfilter</i>',
    }, ctx);
    const extra = lastRow(ctx).node_extra_info.join('|');
    expect(extra).not.toContain('<i>');
    expect(extra).toContain('&lt;i&gt;');
  });
});


describe('Explain Analysis renders extraInfo sanitized', () => {
  // Verifies that the DOMPurify wrap added to Analysis NodeText actually
  // strips dangerous markup from extraInfo items before they reach the DOM.

  it('strips iframe/script from extraInfo items', () => {
    const explainTable = {
      rows: [{
        data: {
          'Node Type': 'Bitmap Heap Scan',
          'image_text': 'Bitmap Heap Scan',
          arr_id: 'row-1',
          level: [1],
          parent_node: '',
          _serial: 1,
        },
        display_text: 'Bitmap Heap Scan',
        tooltip_text: 'Bitmap Heap Scan',
        node_extra_info: [
          '<strong>Recheck Cond</strong>: ' +
            '<iframe srcdoc="&lt;script&gt;window.__xss=1&lt;/script&gt;">',
          '<script>window.__xss2=1</script>after',
        ],
      }],
      show_timings: false,
      show_rowsx: false,
      show_rows: false,
      show_plan_rows: false,
    };
    const ctrl = render(<ThemedAnalysis explainTable={explainTable} />);
    expect(ctrl.container.querySelector('iframe')).toBeNull();
    expect(ctrl.container.querySelector('script')).toBeNull();
    // Safe markup (<strong>) is preserved — extraInfo is developer-authored.
    expect(ctrl.container.querySelector('strong')).not.toBeNull();
    expect(window.__xss).toBeUndefined();
    expect(window.__xss2).toBeUndefined();
  });
});
