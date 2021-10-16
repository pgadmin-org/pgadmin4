import _ from 'lodash';

export class FakeNode {
  constructor(data, id='nid1') {
    this.data = data || {};
    this.id = id;
  }
  setSelected() {}
  getColumns() {return this.data.columns;}
  getID() {return this.id;}
  setData(data) {this.data = data;}
  getData() {return this.data;}
  getPosition() {return {x: 30, y: 30};}
  setPosition() {}
  serializeData() {return this.getData();}
  getPortName(attnum) {return `port-${attnum}`;}
  getPort() {return null;}
  addPort(obj) {return obj;}
  getColumnAt(pos) {return _.find(this.getColumns()||[], (c)=>c.attnum==pos);}
  remove() {}
  getSchemaTableName() {return [this.data.schema, this.data.name];}
  cloneData(tabName) {
    let retVal = {...this.data};
    retVal.name = tabName;
    return retVal;
  }
  getMetadata() {
    return {
      is_promise: false,
    };
  }
}

export class FakeLink {
  constructor(data, id='lid1') {
    this.data = data;
    this.id = id;
  }
  setSelected() {}
  getID() {return this.id;}
  getData() {return this.data;}
  getSourcePort() {return {remove: ()=>{}};}
  setSourcePort() {}
  getTargetPort() {return {remove: ()=>{}};}
  setTargetPort() {}
  remove() {}
}
