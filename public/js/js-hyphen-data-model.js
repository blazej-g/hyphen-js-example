jsHyphen.factory("HyphenDataModel", ['HyphenIndexDb', function (HyphenIndexDb) {
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

    HyphenDataModel.prototype.remove = function (dataParam) {
        var self = this;
        var key = this.model.key;
        var data = Array.isArray(dataParam) ? dataParam : [dataParam];
        _(data).each(function (record) {
            if (navigator.onLine) {
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

    HyphenDataModel.prototype.add = function (records) {
        var self = this;
        var addData = JSON.parse(JSON.stringify(records));
        var key = this.model.key;
        var data = Array.isArray(addData) ? addData : [addData];

        _(data).each(function (record) {
            var index;
            if (!record[key]) {
                throw new Error("Key is not defined for '" + self.modelName + "', record cannot be added. Record" + record);
            }

            var existEl = _(self.data).find(function (el, ind) {
                index = ind;
                return el[key] === record[key];
            });

            if (existEl) {
                if (!navigator.onLine) {
                    if (record.action !== "new") {
                        record.action = "updated";
                    }
                }

                self.data[index] = _.extend(new self.model(record), record);

                if (!navigator.onLine) {
                    HyphenIndexDb.updateRecordStore(record, self.modelName, record[key]);
                }
            } else {
                if (!navigator.onLine) {
                    record.action = "new";
                }

                record = _.extend(new self.model(record), record);
                self.data.push(record);
                if (!navigator.onLine) {
                    HyphenIndexDb.addRecordToStore(record, self.modelName);
                }
            }
        });

        clearIndexes.call(this);
    };

    return HyphenDataModel;
}]);