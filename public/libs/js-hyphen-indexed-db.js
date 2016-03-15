jsHyphen.factory("IndexedDbCommandBase", ['$q', function () {
    var IndexedDbCommandBase = function (name, version) {
        var self = this;
        this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        if (!this.indexedDB) {
            console.log("Indexed db not supported, offline mode not supported");
        }
        var request;
        if(version) {
            request = window.indexedDB.open(name, version);
        }else{
            request = window.indexedDB.open(name, version);
        }
        request.onsuccess = function (event) {
            self.db = event.target.result;
            //IndexedDbC self.db;
            if (self.openEvent) {
                self.openEvent(event);
            }


        }
        request.onerror = function (event) {
            console.log(event);
        };
        request.onupgradeneeded = function (event) {
            if (self.upgradeEvent) {
                self.upgradeEvent(event);
            }
        };

        request.oncomplete = function (event) {
            console.log(event);
        }
    }

    return IndexedDbCommandBase;
}]);

jsHyphen.factory("HyphenIndexDb", ['$q', 'IndexedDbCommandBase', function ($q, IndexedDbCommandBase) {
    var HyphenIndexDb = function (name, version) {
        IndexedDbCommandBase.call(this, name, version);
        HyphenIndexDb.instance = this;
    }
    HyphenIndexDb.prototype = Object.create(IndexedDbCommandBase.prototype);

    //static methods

    HyphenIndexDb.closeDb = function () {
        this.db=HyphenIndexDb.instance.db;
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    HyphenIndexDb.isInitialized = function () {
        if (HyphenIndexDb.instance && HyphenIndexDb.instance.db) {
            return true;
        }
        else {
            return false;
        }
    }

    HyphenIndexDb.addRecordToStore = function (data, store, id) {
        var transaction = HyphenIndexDb.instance.db.transaction(store, "readwrite");
        var storeObject = transaction.objectStore(store);
        storeObject.add(data, id);
    }

    HyphenIndexDb.addOrUpdateRecord = function (record, store, id) {
        var self = this;
        var transaction = HyphenIndexDb.instance.db.transaction(store, "readwrite");
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
                self.addRecordToStore(record, store, id);
            }
        };
    }

    HyphenIndexDb.updateRecordStore = function (data, store, id) {
        var objectStore = HyphenIndexDb.instance.db.transaction(store, "readwrite").objectStore(store);
        var request = objectStore.get(id);
        request.onsuccess = function () {
            objectStore.put(data, id);
        };
    }

    //instance methods
    HyphenIndexDb.deleteRecord = function (store, id) {
        var objectStore = HyphenIndexDb.instance.db.transaction(store, "readwrite").objectStore(store);
        objectStore.delete(id);
    }

    HyphenIndexDb.prototype.createStore = function (store, key, transaction) {
        var request = transaction.target.result.createObjectStore(store, {
            autoIncrement: false
        });

        return request;
    }

    HyphenIndexDb.prototype.removeStore = function (store, transaction) {
        var request = transaction.target.result.deleteObjectStore(store, transaction);
        return request;
    }


    HyphenIndexDb.prototype.upgradeEvent = function (method) {
        return this.upgradeEvent = method;
    }

    HyphenIndexDb.prototype.openEvent = function (method) {
        return this.openEvent = method;
    }

    HyphenIndexDb.prototype.getStoreData = function (store) {
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

    return HyphenIndexDb;
}]);