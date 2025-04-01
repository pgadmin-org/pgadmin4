import {
  EditorView,
  Decoration,
} from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

export const currentQueryHighlighterEffect = StateEffect.define({
  map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) })
});

const currentQueryHighlighterDeco = Decoration.mark({ class: 'cm-current-query' });

export const currentQueryHighlighterField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    value = value.map(tr.changes);
    for (let e of tr.effects) if (e.is(currentQueryHighlighterEffect)) {
      if (e.value.from < e.value.to) {
        return Decoration.set([currentQueryHighlighterDeco.range(e.value.from, e.value.to)]);
      }
      return Decoration.none;
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});

export default function currentQueryHighlighterExtn() {
  return [currentQueryHighlighterField];
}