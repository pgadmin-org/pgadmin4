import {
  EditorView,
  Decoration,
} from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

export const activeLineEffect = StateEffect.define({
  map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) })
});

const activeLineDeco = Decoration.line({ class: 'cm-activeLine' });

export const activeLineField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    for (let e of tr.effects) if (e.is(activeLineEffect)) {
      if(e.value.clear || e.value.from == -1) {
        return Decoration.none;
      }
      const line = tr.state.doc.line(e.value.from);
      return Decoration.set([activeLineDeco.range(line.from)]);
    }
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});


export default function activeLineExtn() {
  return [activeLineField];
}