export class FakeModel {
  constructor() {
    this.values = {};
  }

  set(key, value) {
    this.values[key] = value;
  }

  get(key) {
    return this.values[key];
  }

  unset(key) {
    delete this.values[key];
  }

  toJSON() {
    return Object.assign({}, this.values);
  }
}
