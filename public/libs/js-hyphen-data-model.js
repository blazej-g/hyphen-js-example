jsHyphen.factory("HyphenDataModel", ['HyphenIndexDb', 'OfflineOnlineService', function (HyphenIndexDb, OfflineOnlineService) {
    var HyphenDataModel = function (model, name, key) {
        this.model = model;
        this.modelName = name;
        this.key = key;
        this.data = [];
        var self = this;
        this.sorted = false;
        if (model.indexes) {
            Object.keys(model.indexes).forEach(function (key) {
                self["getBy" + model.indexes[key]] = function (id) {
                    if (!self["index" + model.indexes[key]]) {
                        self["index" + model.indexes[key]] = _(self.getData()).indexBy(function (data) {
                            return data[key];
                        });
                    }

                    return self["index" + model.indexes[key]][id];
                };
            });
        }

        if (model.groups) {
            Object.keys(model.groups).forEach(function (key) {
                self["getGroupBy" + model.groups[key]] = function (id) {
                    if (!self["group" + model.groups[key]]) {
                        self["group" + model.groups[key]] = _(self.getData()).groupBy(function (data) {
                            return data[key];
                        });
                    }

                    return self["group" + model.groups[key]][id];
                };
            });
        }
    };

    HyphenDataModel.prototype.data = [];

    var clearIndexes = function () {
        var self = this;
        if (self.model.indexes) {
            Object.keys(self.model.indexes).forEach(function (key) {
                self["index" + self.model.indexes[key]] = null;
            });
        }
    };

    var clearGroups = function () {
        var self = this;
        if (self.model.groups) {
            Object.keys(self.model.groups).forEach(function (key) {
                self["group" + self.model.groups[key]] = null;
            });
        }
    };

    HyphenDataModel.prototype.getData = function () {
        var self = this;

        if (self.model.sort && !self.sorted) {
            this.data = this.data = _(this.data).sortBy(function (ob) {
                if (self.model.sort.desc) {
                    if (ob[self.model.sort.desc]) {
                        return ob[self.model.sort.desc].toLowerCase();
                    } else {
                        return ob[self.model.sort.desc];
                    }
                }
                if (self.model.sort.asc) {
                    if (ob[self.model.sort.asc]) {
                        return ob[self.model.sort.asc].toLowerCase();
                    } else {
                        return ob[self.model.sort.asc];
                    }
                }
            });
            if (self.model.sort.desc) {
                this.data = this.data.reverse();
            }
            self.sorted = true;
            // console.log(this.data)
        }
        return this.data;
    };

    HyphenDataModel.prototype.where = function (condition) {
        return _(this.data).filter(function (el) {
            return el[condition.prop] === condition.value;
        });
    };

    HyphenDataModel.prototype.remove = function (dataParam, preventSync) {
        var self = this;
        var key = self.key;
        var data = Array.isArray(dataParam) ? dataParam : [dataParam];
        _(data).each(function (record) {
            //if app is in online mode or user explicit set prevent sync flag
            if (OfflineOnlineService.getState() || preventSync) {
                //HyphenIndexDb.deleteRecord(self.modelName, record[key]);
                var id = (record && record[key]) ? record[key] : record;
                this.data = _(this.data).filter(function (element) {
                    return element[key] !== id;
                });
            } else {
                if (record.action === "new") {
                    HyphenIndexDb.deleteRecord(self.modelName, record[key]);
                }
                else {
                    record.action = "deleted";
                    HyphenIndexDb.addOrUpdateRecord(record, self.modelName, record[key]);
                }

                var delId = (record && record[key]) ? record[key] : record;
                this.data = _(this.data).filter(function (element) {
                    return element[key] !== delId;
                });

            }
        }, this);

        clearIndexes.call(this);
        clearGroups.call(this);
        self.sorted = false;

    };

    HyphenDataModel.prototype.add = function (records, preventSync) {
        var self = this;
        var addData = JSON.parse(JSON.stringify(records));
        var key = self.key;
        var data = Array.isArray(addData) ? addData : [addData];

        _(data).each(function (record) {
            if (!record[key]) {
                throw new Error("Key is not defined for '" + self.modelName + "', record cannot be added. Record" + record);
            }

            var element = _(self.data).find(function (el) {
                return el[key] === record[key];
            });

            //update
            if (element) {
                var newRecord = _.extend(new self.model(record), record);
                self.data = _([newRecord].concat(self.data)).uniq(false, function (element) {
                    return element[key];
                });

                if (!OfflineOnlineService.getState() && !preventSync) {
                    if (record.action !== "new") {
                        record.action = "updated";
                    }
                    HyphenIndexDb.updateRecordStore(record, self.modelName, record[key]);
                }
            } else {
                //create
                if (!OfflineOnlineService.getState() && !preventSync) {
                    record.action = "new";
                    HyphenIndexDb.addRecordToStore(record, self.modelName, record[key]);
                }
                record = _.extend(new self.model(record), record);
                self.data.push(record);
            }
        });

        clearIndexes.call(this);
        clearGroups.call(this);
        self.sorted = false;
    };

    return HyphenDataModel;
}])
;