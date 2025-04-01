import {GutterMarker, gutter} from '@codemirror/view';
import {StateField, StateEffect, RangeSet} from '@codemirror/state';

export const breakpointEffect = StateEffect.define({
  map: (val, mapping) => {
    return {pos: mapping.mapPos(val.pos), on: val.on, clear: val.clear, silent: val.silent};
  }
});

export const breakpointField = StateField.define({
  create() { return RangeSet.empty; },
  update(set, transaction) {
    set = set.map(transaction.changes);
    for (let e of transaction.effects) {
      if (e.is(breakpointEffect)) {
        if(e.value.clear) {
          return RangeSet.empty;
        }
        if (e.value.on)
          set = set.update({add: [breakpointMarker.range(e.value.pos)]});
        else
          set = set.update({filter: from => from != e.value.pos});
      }
    }
    return set;
  }
});

export function hasBreakpoint(view, pos) {
  let breakpoints = view.state.field(breakpointField);
  let has = false;
  breakpoints.between(pos, pos, () => {has = true;});
  return has;
}

export function toggleBreakpoint(view, pos, silent, val) {
  view.dispatch({
    effects: breakpointEffect.of({pos, on: typeof(val) == 'undefined' ? !hasBreakpoint(view, pos) : val, silent})
  });
}

export function clearBreakpoints(view) {
  view.dispatch({
    effects: breakpointEffect.of({clear: true, silent: true})
  });
}

const breakpointMarker = new class extends GutterMarker {
  toDOM() { return document.createTextNode('●'); }
};
  
const breakpointGutter = [
  breakpointField,
  gutter({
    class: 'cm-breakpoint-gutter',
    markers: v => v.state.field(breakpointField),
    initialSpacer: () => breakpointMarker,
    domEventHandlers: {
      mousedown(view, line) {
        toggleBreakpoint(view, line.from);
        return true;
      }
    }
  }),
];

export default breakpointGutter;