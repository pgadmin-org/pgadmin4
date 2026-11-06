/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ERDCore from 'pgadmin.tools.erd/erd_tool/ERDCore';

describe('ERDCore modifier keys', ()=>{
  let engine, canvas;

  const fire = (event)=>{
    engine.getActionEventBus().fireAction({
      event: {
        preventDefault: ()=>{/* intentional */},
        stopPropagation: ()=>{/* intentional */},
        target: canvas,
        ...event,
      },
    });
  };
  const currentState = ()=>engine.getStateMachine().getCurrentState().getOptions().name;

  beforeEach(()=>{
    engine = new ERDCore().getEngine();
    canvas = document.createElement('div');
    document.body.appendChild(canvas);
    engine.setCanvas(canvas);
  });

  afterEach(()=>{
    canvas.remove();
  });

  it('draws a selection box when dragging with Shift held', ()=>{
    fire({type: 'keydown', key: 'Shift'});
    fire({type: 'mousedown', clientX: 10, clientY: 10, buttons: 1, shiftKey: true});
    expect(currentState()).toBe('selection-box');
  });

  it('pans the canvas once Shift is released, even if the keyup was missed', ()=>{
    fire({type: 'keydown', key: 'Shift'});
    fire({type: 'mousedown', clientX: 10, clientY: 10, buttons: 1, shiftKey: true});
    fire({type: 'mousemove', clientX: 50, clientY: 50, buttons: 1, shiftKey: true});
    fire({type: 'mouseup', clientX: 50, clientY: 50, buttons: 0, shiftKey: true});
    expect(currentState()).toBe('selecting');

    /* No keyup for Shift arrives, but the next mouse event says it is up */
    fire({type: 'mousedown', clientX: 10, clientY: 10, buttons: 1, shiftKey: false});
    expect(engine.getActionEventBus().getKeys()).not.toContain('shift');
    expect(currentState()).toBe('drag-canvas');
  });

  it('leaves keys alone for events without modifier flags', ()=>{
    fire({type: 'keydown', key: 'Shift'});
    fire({type: 'mousedown', clientX: 10, clientY: 10, buttons: 1});
    expect(engine.getActionEventBus().getKeys()).toContain('shift');
    expect(currentState()).toBe('selection-box');
  });
});
