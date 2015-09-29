var oracledb = require('oracledb');
var Bluebird = require('bluebird');

function keysToLowerCase(obj) {
    var key, keys = Object.keys(obj);
    var n = keys.length;
    var newobj = {};

    while (n--) {
        key = keys[n];
        newobj[key.toLowerCase()] = obj[key];
    }

    return newobj;
}

function Infowatch(options) {
    this.options = options;
    this.connection = null;
}

Infowatch.prototype.connect = function (options) {
    var self = this;

    return new Bluebird(function (resolve, reject) {
        oracledb.getConnection(options || self.options, function (err, connection) {
            if (err) {
                reject(err);
            } else {
                self.connection = connection;
                resolve(connection);
            }
        });
    });
};

Infowatch.prototype.getHosts = function () {
    var self = this;
    var sql = 'SELECT ' +
        '"Workstation"."Id" as id,' +
        '"WorkstationState"."Status" AS status,' +
        '"WorkstationState"."IpAddress" AS ip,' +
        '"WorkstationState"."OperationSystem" AS os,' +
        '"Workstation"."Address" AS hostname ' +
        'FROM "IWDM"."Workstation","IWDM"."WorkstationState" ' +
        'WHERE "Workstation"."Uid"="WorkstationState"."Uid"';

    return new Bluebird(function (resolve, reject) {
        self.connection.execute(sql, {}, {outFormat: oracledb.OBJECT}, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result.rows.map(keysToLowerCase));
            }
        });
    });
};

Infowatch.prototype.getUsers = function (WorkstationId) {
    var self = this;
    var sql = 'SELECT ' +
        '"User"."Account" AS login,' +
        '"User"."Sid" AS sid,' +
        '"User"."FirstName" AS fname,' +
        '"User"."MiddleName" AS mname,' +
        '"User"."LastName" AS lname ' +
        'FROM "IWDM"."UserToWorkstation","IWDM"."User" ' +
        'WHERE "UserToWorkstation"."WorkstationId"=:id AND ' +
        '"UserToWorkstation"."UserId"="User"."Id"';

    return new Bluebird(function (resolve, reject) {
        self.connection.execute(sql, [WorkstationId], {outFormat: oracledb.OBJECT}, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result.rows.map(keysToLowerCase));
            }
        });
    });
};

Infowatch.prototype.disconnect = function () {
    var self = this;

    if (!self.connection) {
        return;
    }

    return new Bluebird(function (resolve, reject) {
        self.connection.release(function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    });
};

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