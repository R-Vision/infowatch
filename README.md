# infowatch

### Usage
```javascript
// Oracle
var options = {
    user: "username",
    password: "password",
    connectString: "192.168.23.150/iwtm"
};

// MSSQL
var options = {
    user: "username",
    password: "password",
    server: "hostname",
    database: 'iwdm',
    domain: 'DOMAIN'
};

var infowatch = new Infowatch(options);

infowatch
    .connect()
    .then(function () {
        return infowatch.getHosts();
    })
    .map(function (host) {
        host.users = infowatch.getUsers(host.id);
        return Bluebird.props(host);
    }, {concurrency: 1})
    .then(function (hosts) {
        console.log(hosts);
    })
    .finally(function () {
        return infowatch.disconnect();
    });
```
