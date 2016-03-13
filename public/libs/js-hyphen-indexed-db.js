jsHyphen.factory("IndexedDbCommandBase", ['$q', function () {
    var IndexedDbCommandBase = function (name, version) {
        var selfObj = this;
        this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        if (!this.indexedDB) {
            console.log("Indexed db not supported, offline mode not supported");
        }

        var request = window.indexedDB.open(name, version);

        request.onsuccess = function (event) {
            selfObj.db = event.target.result;
            selfObj.stores = event.target.result.objectStoreNames;
            if (selfObj.openEvent) {
                selfObj.openEvent(event);
            }
            console.log("Local db initialized");

        }
        request.onerror = function (event) {
            console.log(event);
        };
        request.onupgradeneeded = function (event) {
            selfObj.db = event.target.result;
            if (selfObj.upgradeEvent) {
                selfObj.upgradeEvent(event);
            }
        };

        request.oncomplete = function (event) {
            console.log(event);
        }

    }

    IndexedDbCommandBase.prototype.isInitialized = function () {
        return this.db ? true : false;
    }


    return IndexedDbCommandBase;
}]);

jsHyphen.factory("IndexedDbCommands", ['$q', 'IndexedDbCommandBase', function ($q, IndexedDbCommandBase) {
    var IndexedDbCommands = function (name, version) {
        IndexedDbCommandBase.call(this, name, version);
    }

    IndexedDbCommands.prototype = Object.create(IndexedDbCommandBase.prototype);

    IndexedDbCommands.prototype.closeDb = function () {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }


    IndexedDbCommands.prototype.createStore = function (store, key, transaction) {
        var request = transaction.target.result.createObjectStore(store, {
            autoIncrement: false
        });

        return request;
    }

    IndexedDbCommands.prototype.removeStore = function (store, transaction) {
        var request = transaction.target.result.deleteObjectStore(store, transaction);
        return request;
    }

    IndexedDbCommands.prototype.clear = function (store) {
        var transaction = this.db.transaction(store, "readwrite");
        var storeObject = transaction.objectStore(store)
        var request = storeObject.clear();
        return request;
    }

    IndexedDbCommands.prototype.addRecord = function (data, store, id) {
        var transaction = this.db.transaction(store, "readwrite");
        var storeObject = transaction.objectStore(store);
        storeObject.add(data, id);
    }

    IndexedDbCommands.prototype.addOrUpdateRecord = function (record, store, id) {
        var self = this;
        var transaction = this.db.transaction(store, "readwrite");
        var storeObject = transaction.objectStore(store);
        var request = storeObject.get(id);
        request.onerror = function () {
            console.log('can not get record ' + record);
        };
        request.onsuccess = function () {
            // Do something with the request.result!
            if (request.result) {
                self.updateRecord(record, store, id);
            } else {
                self.addRecord(record, store, id);
            }
        };
    }

    IndexedDbCommands.prototype.updateRecord = function (data, store, id) {
        var objectStore = this.db.transaction(store, "readwrite").objectStore(store);
        var request = objectStore.get(id);
        request.onsuccess = function () {
            objectStore.put(data, id);
        };
    }

    IndexedDbCommands.prototype.deleteRecord = function (store, id) {
        var objectStore = this.db.transaction(store, "readwrite").objectStore(store);
        objectStore.delete(id);
    }

    IndexedDbCommands.prototype.getStoreData = function (store) {
        var transaction = this.db.transaction(store.name, "readwrite");
        var dbStore = transaction.objectStore(store.name);
        var request = dbStore.openCursor();
        var data = [];
        var deferred = $q.defer();
        request.onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
                data.push(cursor.value);
                cursor.continue();
            } else {
                deferred.resolve({data: data, model: store});
            }
        }
        request.onerror = function (event) {
            deferred.resolve(event);
        };
        return deferred.promise;
    }

    return IndexedDbCommands;
}])
;

jsHyphen.factory("HyphenIndexDb", ['IndexedDbCommands', function (IndexedDbCommands) {

    var indexedDb;
    var HyphenIndexDb = function (name, version, stores) {
        indexedDb = new IndexedDbCommands(name, version, stores);
    };

    HyphenIndexDb.getStoreData = function (store) {
        return indexedDb.getStoreData(store);
    }

    HyphenIndexDb.removeStore = function (stores, transaction) {
        return indexedDb.removeStore(stores, transaction);
    }

    HyphenIndexDb.close = function () {
        return indexedDb.closeDb();
    }

    HyphenIndexDb.addRecordToStore = function (data, store, id) {
        return indexedDb.addRecord(data, store, id);
    }
    HyphenIndexDb.updateRecordStore = function (data, store, id) {
        return indexedDb.updateRecord(data, store, id);
    }
    HyphenIndexDb.deleteRecord = function (store, id) {
        return indexedDb.deleteRecord(store, id);
    }

    HyphenIndexDb.upgradeEvent = function (method) {
        return indexedDb.upgradeEvent = method;
    }

    HyphenIndexDb.openEvent = function (method) {
        return indexedDb.openEvent = method;
    }

    HyphenIndexDb.createStore = function (store, key, transaction) {
        return indexedDb.createStore(store, key, transaction);
    }
    HyphenIndexDb.clear = function (store) {
        return indexedDb.clear(store);
    }
    HyphenIndexDb.getStores = function () {
        return indexedDb.stores;
    }
    HyphenIndexDb.addOrUpdateRecord = function (record, store, id) {
        return indexedDb.addOrUpdateRecord(record, store, id);
    }
    HyphenIndexDb.isInitialized = function () {
        if (indexedDb) {
            return indexedDb.isInitialized();
        }
        else {
            return false;
        }
    }
    HyphenIndexDb.closeDb = function () {
        if (indexedDb) {
            indexedDb.closeDb();
        }
    }

    return HyphenIndexDb;
}]);