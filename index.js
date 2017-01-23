var oracledb = require('oracledb');
var Bluebird = require('bluebird');
var sql = require('mssql');

sql.Promise = Bluebird;

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

    if (this.options.schema) {
        this.schema = this.options.schema;
    }

    this.isMssql = this.options.driver === 'tedious' || this.options.driver === 'msnodesqlv8'
        || this.options.driver === 'msnodesql' || this.options.driver === 'tds';

    this.isOracle = !this.isMssql;
}

Infowatch.prototype.connect = function (options) {
    var self = this;

    return new Bluebird(function (resolve, reject) {
        if (self.isOracle) {
            oracledb.getConnection(options || self.options, function (err, connection) {
                if (err) {
                    reject(err);
                } else {
                    self.connection = connection;

                    if (!self.schema) {
                        self.findIWDMSchema()
                            .then(function (schema) {
                                self.schema = schema;
                                resolve(connection);
                            })
                            .catch(reject)
                    } else {
                        resolve(connection);
                    }
                }
            });
        } else if (self.isMssql) {
            sql.connect(options || self.options, function (err) {
                if (err) {
                    reject(err)
                } else {
                    self.connection = sql;
                    self.schema = 'dbo';
                    resolve(sql);
                }
            })
        }
    });
};

Infowatch.prototype._runSql = function (query, data) {
    var self = this;

    if (this.isOracle) {
        return Bluebird.fromCallback(function (cb) {
            self.connection.execute(query, data || {}, {outFormat: oracledb.OBJECT}, cb);
        }).then(function (result) {
            return result.rows;
        }).map(keysToLowerCase);
    } else {
        return new sql.Request().query(query).map(keysToLowerCase);
    }
};

Infowatch.prototype.findIWDMSchema = function () {
    var self = this;

    return this.getSchema()
        .filter(function (schema) {
            return self.getTables(schema)
                .filter(function (table) {
                    return table === 'WorkstationState' || table === 'UserToWorkstation';
                })
                .then(function (tables) {
                    return tables.length > 0;
                })
                .catch(function () {
                    return false;
                });
        })
        .then(function (schema) {
            if (schema.length > 0) {
                return schema[0];
            } else {
                throw new Error('Schema not found');
            }
        });
};

Infowatch.prototype.getSchema = function () {
    var sql = 'SELECT DISTINCT username FROM all_users';

    return this._runSql(sql).map(function (item) {
        return item.username;
    });
};

Infowatch.prototype.getTables = function (schema) {
    var sql = 'SELECT DISTINCT OBJECT_NAME FROM ALL_OBJECTS WHERE OBJECT_TYPE=:type AND OWNER=:schema';

    return this._runSql(sql, {
        type: 'TABLE',
        schema: schema
    }).map(function (item) {
        return item.object_name;
    });
};

Infowatch.prototype.getHosts = function () {
    var sql = 'SELECT ' +
        '"Workstation"."Id" as "id",' +
        '"WorkstationState"."Status" AS "status",' +
        '"WorkstationState"."AccessedAt" AS "access",' +
        '"WorkstationState"."IpAddress" AS "ip",' +
        '"WorkstationState"."OperationSystem" AS "os",' +
        '"Workstation"."Address" AS "hostname" ' +
        'FROM "' + this.schema + '"."Workstation","' + this.schema + '"."WorkstationState" ' +
        'WHERE "Workstation"."Uid"="WorkstationState"."Uid"';

    return this._runSql(sql);
};

Infowatch.prototype.getUsers = function (WorkstationId) {
    var sql;

    if (this.isOracle) {
        sql = 'SELECT ' +
            '"User"."Account" AS "login",' +
            '"User"."Sid" AS "sid",' +
            '"User"."FirstName" AS "fname",' +
            '"User"."MiddleName" AS "mname",' +
            '"User"."LastName" AS "lname" ' +
            'FROM "' + this.schema + '"."UserToWorkstation","' + this.schema + '"."User" ' +
            'WHERE "UserToWorkstation"."WorkstationId"=:id AND ' +
            '"UserToWorkstation"."UserId"="User"."Id"';

        return this._runSql(sql, [WorkstationId]);
    } else if (this.isMssql) {
        sql = 'SELECT ' +
            '"User"."Account" AS login,' +
            '"User"."Sid" AS sid,' +
            '"User"."FirstName" AS fname,' +
            '"User"."MiddleName" AS mname,' +
            '"User"."LastName" AS lname ' +
            'FROM "' + this.schema + '"."UserToWorkstation","' + this.schema + '"."User" ' +
            'WHERE "UserToWorkstation"."WorkstationId"=\'' + WorkstationId + '\' AND ' +
            '"UserToWorkstation"."UserId"="User"."Id"';

        return this._runSql(sql);
    }
};

Infowatch.prototype.disconnect = function () {
    var self = this;

    if (!self.connection) {
        return;
    }

    return new Bluebird(function (resolve, reject) {
        if (self.isOracle) {
            self.connection.release(function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        } else if (self.isMssql) {
            self.connection.close(function (err) {
                if (err) {
                    reject(err)
                } else {
                    resolve();
                }
            });
        }
    });
};

module.exports = Infowatch;
