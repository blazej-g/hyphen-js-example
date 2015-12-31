jsHyphen.factory("HyphenDataModel", ['HyphenIndexDb', function (HyphenIndexDb) {
    var HyphenDataModel = function (model, name) {
        this.model = model;
        this.modelName = name;
        this.data = [];
        var self = this;
        _(model.indexes).each(function (index) {
            self["getBy" + index.name] = function (id) {
                if (!self["index" + index.name])
                    self["index" + index.name] = _(self.getData()).indexBy(function (data) {
                        return data[index.key];
                    });

                return self["index" + index.name][id];
            }
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
            return el.action != "deleted";
        })
    }

    HyphenDataModel.prototype.remove = function (data) {
        var self = this;
        var key = this.model.key;
        var data = Array.isArray(data) ? data : [data];
        _(data).each(function (record) {
            if ((navigator.onLine && !window.hjom) || record.action == "new") {
                //HyphenIndexDb.deleteRecord(self.modelName, record[key]);
                var id = (record && record[key]) ? record[key] : record;
                this.data = _(this.data).filter(function (element) {
                    return element[key] != id;
                });
            } else {
                record.action = "deleted";
                HyphenIndexDb.addOrUpdateRecord(record, self.modelName, record[key]);
                var id = (record && record[key]) ? record[key] : record;
                this.data = _(this.data).map(function (element) {
                    if (element[key] == id) {
                        element.action = "deleted";
                    }
                    return element;
                });
            }
        }, this);

        clearIndexes.call(this);

    };

    HyphenDataModel.prototype.add = function (data) {
        var self = this;
        data = JSON.parse(JSON.stringify(data));
        var key = this.model.key;
        var data = Array.isArray(data) ? data : [data];

        _(data).each(function (record) {
            var index;
            if (!record[key])
                throw new Error("Key is not defined for '" + self.modelName + "', record cannot be added");

            var existEl = _(self.data).find(function (el, ind) {
                index = ind;
                return el[key] == record[key];
            });

            if (existEl) {
                if (!navigator.onLine)
                    if (record.action != "new")
                        record.action = "updated";
                self.data[index] = _.extend(new self.model(record), record);
                ;

                if (!navigator.onLine) {
                    HyphenIndexDb.updateRecordStore(record, self.modelName, record[key]);
                }
            } else {
                if (!navigator.onLine)
                    record.action = "new";

                record = _.extend(new self.model(record), record);
                self.data.push(record);
                if (!navigator.onLine) {
                    HyphenIndexDb.addRecordToStore(record, self.modelName);
                }
            }
        });

        /*
         this.data = _(data).chain().map(function (val) {
         //extend given objects
         return _.extend(new this.model(val), val);
         }, this).
         concat(this.data).uniq(false, function (element) {
         return element[key];
         }).value();
         */
        clearIndexes.call(this);
    };

    return HyphenDataModel;
}]);