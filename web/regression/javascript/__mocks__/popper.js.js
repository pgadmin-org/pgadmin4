import PopperJs from 'popper.js';

export default class Popper {
  static placements = PopperJs.placements;

  constructor() {
    return {
      destroy: () => {},
      scheduleUpdate: () => {},
      update: () => {},
    };
  }
}
