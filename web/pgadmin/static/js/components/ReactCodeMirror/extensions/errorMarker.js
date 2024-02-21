import {
  EditorView,
  Decoration,
} from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

export const errorMarkerEffect = StateEffect.define({
  map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) })
});

const errorMakerDeco = Decoration.mark({ class: 'cm-error-highlight' });

export const errorMakerField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(underlines, tr) {
    underlines = underlines.map(tr.changes);
    for (let e of tr.effects) if (e.is(errorMarkerEffect)) {
      if (e.value.clear) {
        return Decoration.none;
      }
      underlines = underlines.update({
        add: [errorMakerDeco.range(e.value.from, e.value.to)]
      });
    }
    return underlines;
  },
  provide: f => EditorView.decorations.from(f)
});


export default function errorMarkerExtn() {
  return [errorMakerField];
}