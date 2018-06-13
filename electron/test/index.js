const Application = require('spectron').Application;
const electron = require('electron');
const path = require('path');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);

describe('pgAdmin4', () => {
  let app;

  before(() => {
    app = new Application({
      path: electron,
      args: [
        path.join(__dirname, '..'),
      ],
      waitTimeout: 50000,
    });
    chaiAsPromised.transferPromiseness = app.transferPromiseness;
    return app.start();
  });

  after(() => {
    if (app && app.isRunning()) {
      return app.stop();
    }
    return undefined;
  });

  it('launches pgadmin4 with a loading page', () => {
    return app.client.getText('body').should.eventually.equal('pgAdmin4 Loading...')
      .waitUntil(() => {
        return app.client.windowByIndex(0).isVisible('#dockerContainer');
      }, 30000)
      .getText('body').should.eventually.include('Please select an object in the tree view.').and.not.include('pgAdmin4 Loading...');
  }).timeout(90000);
});
