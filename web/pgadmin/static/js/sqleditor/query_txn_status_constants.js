/* psycopg2 transaction status constants
 * http://initd.org/psycopg/docs/extensions.html#transaction-status-constants
 */

module.exports = {
  TRANSACTION_STATUS_IDLE: 0,
  TRANSACTION_STATUS_ACTIVE: 1,
  TRANSACTION_STATUS_INTRANS: 2,
  TRANSACTION_STATUS_INERROR: 3,
  TRANSACTION_STATUS_UNKNOWN: 5,
};
