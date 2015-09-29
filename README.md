# infowatch

### Usage
```javascript
var options = {
    user: "iwdm",
    password: "xxXX1234",
    connectString: "192.168.23.150/iwtm"
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
