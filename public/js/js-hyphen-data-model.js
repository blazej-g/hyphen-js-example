jsHyphen.factory("HyphenDataModel", ['HyphenIndexDb', 'OfflineOnlineService', function (HyphenIndexDb, OfflineOnlineService) {
    var HyphenDataModel = function (model, name) {
        this.model = model;
        this.modelName = name;
        this.data = [];
        var self = this;
        _(model.indexes).each(function (index) {
            self["getBy" + index.name] = function (id) {
                if (!self["index" + index.name]) {
                    self["index" + index.name] = _(self.getData()).indexBy(function (data) {
                        return data[index.key];
                    });
                }

                return self["index" + index.name][id];
            };
        });
    };

    HyphenDataModel.prototype.data = [];

    var clearIndexes = function () {
        var self = this;
        _(this.model.indexes).each(function (index) {
            self["index" + index.name] = null;
        });
    };

    HyphenDataModel.prototype.getData = function () {
        return _(this.data).filter(function (el) {
            return el.action !== "deleted";
        });
    };

    HyphenDataModel.prototype.where = function (condition) {
        return _(this.data).filter(function (el) {
            return el[condition.prop] === condition.value;
        });
    };

    HyphenDataModel.prototype.remove = function (dataParam, preventSync) {
        var self = this;
        var key = this.model.key;
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

    };

    HyphenDataModel.prototype.add = function (records, preventSync) {
        var self = this;
        var addData = JSON.parse(JSON.stringify(records));
        var key = this.model.key;
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
                var newRecord =  _.extend(new self.model(record), record);
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
                    HyphenIndexDb.addRecordToStore(record, self.modelName);
                }
                record = _.extend(new self.model(record), record);
                self.data.push(record);
            }
        });

        clearIndexes.call(this);
    };

    return HyphenDataModel;
}]);