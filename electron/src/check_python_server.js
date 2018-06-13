const axios = require('axios');
const { electronLogger } = require('./logger');

function checkIfPythonServerIsAvailable(serverAddress) {
  return axios.get(serverAddress)
    .then(() => {
      return true;
    })
    .catch((error) => {
      return error.response !== undefined;
    });
}

function delayedCheckIfServerIsAvailable(serverAddress, functionToExecuteWhenApplicationIsUp) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      waitForPythonServerToBeAvailable(serverAddress, functionToExecuteWhenApplicationIsUp)
        .then((result) => {
          resolve(result);
        })
        .catch((result) => {
          reject(result);
        });
    }, 1000);
  });
}

function waitForPythonServerToBeAvailable(serverAddress, functionToExecuteWhenApplicationIsUp) {
  return checkIfPythonServerIsAvailable(serverAddress)
    .then((isAvailable) => {
      if (isAvailable) {
        return functionToExecuteWhenApplicationIsUp();
      }
      electronLogger.error('Server not available, waiting.....');
      return delayedCheckIfServerIsAvailable(serverAddress, functionToExecuteWhenApplicationIsUp);
    })
    .catch((error) => {
      electronLogger.error(`Error waiting for python server availability: ${error}\n ${error.stack}`);
    });
}

module.exports = {
  waitForPythonServerToBeAvailable,
};
