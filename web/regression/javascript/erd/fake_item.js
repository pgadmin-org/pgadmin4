import _ from 'lodash';

export class FakeNode {
  constructor(data, id='nid1') {
    this.data = data || {};
    this.id = id;
  }
  setSelected() {/*This is intentional (SonarQube)*/}
  getColumns() {return this.data.columns;}
  getID() {return this.id;}
  setData(data) {this.data = data;}
  getData() {return this.data;}
  getPosition() {return {x: 30, y: 30};}
  setPosition() {/*This is intentional (SonarQube)*/}
  serializeData() {return this.getData();}
  getPortName(attnum) {return `port-${attnum}`;}
  getPort() {return null;}
  getPorts() {return null;}
  addPort(obj) {return obj;}
  getColumnAt(pos) {return _.find(this.getColumns()||[], (c)=>c.attnum==pos);}
  remove() {/*This is intentional (SonarQube)*/}
  getSchemaTableName() {return [this.data.schema, this.data.name];}
  cloneData(tabName) {
    let retVal = {...this.data};
    retVal.name = tabName;
    return retVal;
  }
  setMetadata() {/* no-op */}
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
  setSelected() {/*This is intentional (SonarQube)*/}
  getID() {return this.id;}
  getData() {return this.data;}
  getSourcePort() {return {remove: ()=>{/*This is intentional (SonarQube)*/}};}
  setSourcePort() {/*This is intentional (SonarQube)*/}
  getTargetPort() {return {remove: ()=>{/*This is intentional (SonarQube)*/}};}
  setTargetPort() {/*This is intentional (SonarQube)*/}
  remove() {/*This is intentional (SonarQube)*/}
}

export class FakePort {
  getLinks() {return null;}
}
