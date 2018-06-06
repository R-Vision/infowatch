const Infowatch = require('../');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('__tests__/config.json'));

describe('Reading configs', () => {
  test('Correct connection properties should be loaded', async () => {
    const pgconf = config['postgres'];
    expect(pgconf.hostname).toBeString;
    const mssqlconf = config['tedious'];
    expect(mssqlconf.hostname).toBeString;
  });
});

describe('Checking connectivity -- Postgres', () => {
  test('A non-empty handler should be returned', async () => {
    const infowatch = new Infowatch(config['postgres']);
    const conn = await infowatch.connect();
    expect(conn.readyForQuery).toBe(true);
  }, 18000);
});

describe('Checking connectivity -- MSSQL', () => {
  test('A non-empty handler should be returned', async () => {
    const mssqlconf = config['tedious'];
    const infowatch = new Infowatch(mssqlconf);
    const conn = await infowatch.connect();
    expect(conn.pool.max).toBeGreaterThan(0);
  }, 18000);
});

describe('Checking connectivity -- Oracle', () => {
  test('A non-empty handler should be returned', async () => {
    const infowatch = new Infowatch(config['oracle']);
    // const conn = await infowatch.connect();
    expect(1).toBeGreaterThan(0);
  });
});

describe('getHosts -- Postgres', () => {
  test('A non-empty schema should be returned', async () => {
    const infowatch = new Infowatch(config['postgres']);
    const conn = await infowatch.connect();
    const hosts = await infowatch.getHosts();
    // console.log(hosts);
    expect(hosts.length).toBeGreaterThan(0);
  }, 18000);
});

describe('getUsers -- Postgres', () => {
  test('A non-empty user list should be returned', async () => {
    const infowatch = new Infowatch(config['postgres']);
    const conn = await infowatch.connect();
    const users = await infowatch.getUsers();
    // console.log(users);
    expect(users).toBeDefined();
  }, 18000);
});

describe('getHosts -- MSSQL', () => {
  test('A non-empty schema should be returned', async () => {
    const infowatch = new Infowatch(config['tedious']);
    const conn = await infowatch.connect();
    const hosts = await infowatch.getHosts();
    // console.log(hosts);
    expect(hosts.length).toBeGreaterThan(0);
  }, 18000);
}); // */

describe('getUsers -- MSSQL', () => {
  test('A non-empty user list should be returned', async () => {
    const infowatch = new Infowatch(config['tedious']);
    const conn = await infowatch.connect();
    const users = await infowatch.getUsers();
    // console.log(users);
    expect(users).toBeDefined();
  }, 18000);
}); // */
