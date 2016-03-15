var jsHyphen = angular.module('jsHyphen', []);

(function () {

    //var publicApi = {};
    //jsHyphen.value('jsHyphen', publicApi);

    jsHyphen.provider("Hyphen", [function () {
        var provider = {};
        provider.initialize = function () {

        };
        provider.$get = ['$rootScope', '$http', '$q', 'BasicModel', 'HyphenIndexDb', '$injector', '$timeout', 'CacheService', 'HyphenSynchronizer', 'OfflineOnlineService',
            function ($rootScope, $http, $q, BasicModel, HyphenIndexDb, $injector, $timeout, CacheService, HyphenSynchronizer, OfflineOnlineService) {
                var service = {};
                var hyphenConfiguration;
                var hyphenIndexDb;
                var stores = [];
                var storesToRemove = [];
                var hyphenSynchronizer;

                service.initialize = function (configuration) {
                    this.configuration = configuration;
                    hyphenConfiguration = configuration;
                    hyphenSynchronizer = new HyphenSynchronizer(configuration);

                    configuration.model.forEach(function (entity) {
                        service[entity.model] = new BasicModel(entity, configuration);
                        var str = {
                            name: entity.model,
                            key: entity.key,
                            priority: entity.priority,
                            sync: entity.sync,
                            foreignKeys: entity.foreignKeys
                        };

                        if (entity.sync) {
                            stores.push(str);
                        } else {
                            storesToRemove.push(str);
                        }
                    });
                };

                service.dispose = function () {
                    CacheService.clearCache();
                    HyphenIndexDb.closeDb();
                };

                service.getState = function () {
                    return OfflineOnlineService.getState();
                };

                service.switchToOffline = function () {
                    OfflineOnlineService.setOffline();
                };
                service.switchToOnline = function () {
                    OfflineOnlineService.setOnline();
                };

                service.initializeDb = function (identifier) {
                    if (!identifier) {
                        throw new Error("Db identifier not provided for initializeDb function");
                    }
                    if (!HyphenIndexDb.isInitialized()) {
                        var dbName = this.configuration.dbName + identifier;
                        hyphenIndexDb = new HyphenIndexDb(dbName, (new Date / 1e3 | 0) * 100, stores, identifier);
                        hyphenIndexDb.upgradeEvent(function (event) {
                            _(stores).each(function (st) {
                                if (!_(event.target.transaction.db.objectStoreNames).contains(st.name)) {
                                    hyphenIndexDb.createStore(st.name, st.key, event);
                                } else {
                                    //recreate object stores if the key path is defined
                                    if(event.target.transaction.objectStore(st.name).keyPath){
                                        var result = hyphenIndexDb.removeStore(st.name);
                                        if(result) {
                                            result.onsuccess = function (event) {
                                                hyphenIndexDb.createStore(st.name, st.key);
                                            }
                                            request.onerror = function (event) {
                                                console.log(event);
                                            }
                                        }else{
                                            hyphenIndexDb.createStore(st.name, st.key, event);
                                        }
                                    }
                                    console.log("Store " + st + "already exist and will be not created again");
                                }
                            });

                            _(storesToRemove).each(function (st) {
                                if (_(event.target.transaction.db.objectStoreNames).contains(st.name)) {
                                    hyphenIndexDb.removeStore(st.name, event);
                                }
                            });
                        });

                        //event called from indexed db
                        hyphenIndexDb.openEvent(function () {
                            readFromIndexDb(stores);
                        });
                    } else {
                        console.log("db already initialized");
                    }
                };

                $rootScope.$on('hyphenOnline', function (event) {
                    if (hyphenIndexDb) {
                        readFromIndexDb(stores);
                    }
                });

                var syncModelsPromise;
                var readFromIndexDb = function (dbStores) {
                    syncModelsPromise = $q.defer();
                    var readPromises = [];
                    _(dbStores).each(function (store) {
                        var indexReadPromise = hyphenIndexDb.getStoreData(store);
                        readPromises.push(indexReadPromise);
                    });

                    $q.all(readPromises).then(function (result) {
                        hyphenSynchronizer.synchronize(result);
                    }, function (reason) {
                        console.log(reason);
                    });

                    return readPromises;
                }

                return service;
            }];
        return provider;
    }]);

    jsHyphen.factory("HyphenSynchronizer", ['$rootScope', 'HyphenDataStore', '$injector', 'HyphenIndexDb', '$q', function ($rootScope, HyphenDataStore, $injector, HyphenIndexDb, $q) {

        var HyphenSynchronizer = function (configuration) {
            this.configuration = configuration;
        }

        HyphenSynchronizer.prototype.syncedStors = [];

        HyphenSynchronizer.prototype.sortStores = function (stores) {
            return _(stores).sortBy(function (d) {
                return d.model.priority;
            });
        }

        HyphenSynchronizer.prototype.chainStoreSync = function (stores) {
            var self = this;
            var store = this.stores[0];
            if (store) {
                if (store.data.length > 0)
                    self.syncedStors.push(angular.copy(store));
                $rootScope.$broadcast("syncStoreStart", store);
                self.synchronizeStore(store).then(function (result) {
                    $rootScope.$broadcast("syncStoreSuccess", store, result);
                    stores.shift();
                    self.chainStoreSync(stores);
                }, function (reason) {
                    $rootScope.$broadcast("syncError", reason);
                })
            } else {
                $rootScope.$broadcast("syncSuccess", self.syncedStors);
                self.syncedStors = [];
            }
        }

        HyphenSynchronizer.prototype.synchronize = function (stores) {
            $rootScope.$broadcast("syncStart", stores);

            this.stores = this.sortStores(stores);
            this.chainStoreSync(this.stores);
        }
        HyphenSynchronizer.prototype.synchronizeStore = function (syncStore) {
            var self = this;
            var syncPromises = [];
            if (syncStore.data.length > 0) {
                var entitySyncModel = $injector.get(syncStore.model.name);
                _(syncStore.data).each(function (record) {
                    var promise;
                    var id = record[syncStore.model.key];
                    $rootScope.$broadcast("syncRecordStart", record);
                    switch (record.action) {
                        case "new":
                            promise = entitySyncModel.new(angular.copy(record)).then(function (result) {
                                self.updateIds(id, result.data[syncStore.model.key], syncStore.model.key, syncStore.model.foreignKeys);
                                HyphenDataStore.getStores()[syncStore.model.name].remove(id);
                                HyphenIndexDb.deleteRecord(syncStore.model.name, id);
                                $rootScope.$broadcast("syncRecordSuccess", result);
                            }, function (error) {
                                HyphenIndexDb.deleteRecord(syncStore.model.name, id);
                                console.log("can not remove synchronized record for 'Add' action with id = " + error);
                            });
                            break;
                        case "updated":
                            promise = entitySyncModel.update(record).then(function (result) {
                                HyphenIndexDb.deleteRecord(syncStore.model.name, id);
                                $rootScope.$broadcast("syncRecordSuccess", result);
                            }, function (error) {
                                console.log("can not remove synchronized record for 'Update' action with id = " + error);
                            });
                            break;
                        case "deleted":
                            promise = entitySyncModel.delete(record).then(function (result) {
                                HyphenIndexDb.deleteRecord(syncStore.model.name, record[syncStore.model.key]);
                                $rootScope.$broadcast("syncRecordSuccess", result);
                            }, function (error) {
                                console.log("can not remove synchronized record for 'Delete' action with id = record[syncStore.model.key]. " + error);
                            });

                            break;
                        default:
                            console.log("action not defined");
                    }
                    syncPromises.push(promise);
                })
            }
            return $q.all(syncPromises);
        }

        HyphenSynchronizer.prototype.updateIds = function (oldId, newId, key, foreignKeys) {
            _(this.stores).each(function (store) {
                _(store.data).each(function (data) {
                    _(foreignKeys).each(function (fKey) {
                        if (Number(data[fKey]) === Number(oldId)) {
                            data[fKey] = newId;
                        }
                    });
                })
            });
        };

        HyphenSynchronizer.prototype.removeSyncedRecord = function (oldId, key) {
            _(this.stores).each(function (store) {
                store.data = _(store.data).filter(function (data) {
                    return data[key] === oldId
                })
            });
        };

        return HyphenSynchronizer;

    }]);

    jsHyphen.factory("HyphenDataStore", ['HyphenDataModel', function (HyphenDataModel) {
        var HyphenDataStore = function (store, entityModel, key) {
            HyphenDataStore.prototype.stores[store] = new HyphenDataModel(entityModel, store, key);
        }

        HyphenDataStore.prototype.stores = {}
        HyphenDataStore.actions = {};

        HyphenDataStore.actions.delete = function (data, store) {
            HyphenDataStore.prototype.stores[store].removeDataOnline(data);
        }

        HyphenDataStore.actions.save = function (data, store) {
            HyphenDataStore.prototype.stores[store].addData(data);
        }

        HyphenDataStore.actions.custom = function (data, store, options) {
            options.responseHandler(data, HyphenDataStore.actions);
        }

        HyphenDataStore.saveResult = function (data, store, options) {
            if (options.processResponse !== false) {
                if (options.responseHandler) {
                    options.responseHandler(data, HyphenDataStore.prototype.stores);

                } else {
                    if (options.method === "delete" || options.action === "delete") {
                        HyphenDataStore.prototype.stores[store].remove(data);
                    }
                    else {
                        HyphenDataStore.prototype.stores[store].add(data);
                    }
                }
            }
        };

        HyphenDataStore.getStores = function () {
            return HyphenDataStore.prototype.stores;
        }

        HyphenDataStore.clearStores = function () {
            _(HyphenDataStore.prototype.stores).each(function (st) {
                st.data = [];
            });
        }

        return HyphenDataStore;
    }]);

    jsHyphen.factory("BasicModel", ['ApiCallFactory', 'HyphenDataStore', '$injector', '$q', 'CacheService', 'OfflineOnlineService', function
        (ApiCallFactory, HyphenDataStore, $injector, $q, CacheService, OfflineOnlineService) {
        var BasicModel = function (modelData, configuration) {
            this.entityModel = null;
            try {
                this.entityModel = $injector.get(modelData.model);
            } catch (e) {
                throw new Error("Model not defned for: " + modelData.model + e.message);
            }
            var dataStore = new HyphenDataStore(modelData.model, this.entityModel, modelData.key);

            //entities public properties
            this.dataModel = dataStore.stores[modelData.model];
            this.api = {};
            this.api.loading = 0;
            var apiCallFactory = new ApiCallFactory();
            _(modelData.rest).each(function (rest) {
                var self = this;
                var apiCall = apiCallFactory.createApiCall(rest, configuration, modelData.model);
                this.api[rest.name] = {};
                self.api[rest.name].loading = 0;

                this.api[rest.name].call = function (params) {
                    var promise;
                    //initialize promise for every call!!!
                    var actionPromise = $q.defer();
                    var cacheItem = rest.name + modelData.model + JSON.stringify(params);

                    if (OfflineOnlineService.getState()) {
                        if (!CacheService.isCached(cacheItem)) {
                            apiCall.dataSet = self.api[rest.name].data;
                            promise = apiCall.invoke.call(apiCall, params);
                            self.api[rest.name].loading++;
                            self.api.loading++;
                            self.api[rest.name].loaded = false;
                            promise.then(function (result) {
                                self.api[rest.name].loading--;
                                self.api.loading--;
                                self.api[rest.name].loaded = true;

                                actionPromise.resolve(angular.copy(result));
                                result.data = configuration.responseInterceptor ?
                                    configuration.responseInterceptor(result.data, rest, dataStore.stores[modelData.model]) :
                                    result.data;
                                HyphenDataStore.saveResult(result.data, modelData.model, rest);

                            }, function (reason) {
                                self.api[rest.name].loading--;
                                self.api.loading--;
                                actionPromise.reject(reason);
                            });
                        } else {
                            actionPromise.resolve([]);
                        }
                    } else {
                        if (self.entityModel[rest.name + "Offline"]) {
                            // try {
                            self.entityModel[rest.name + "Offline"](params, self.api[rest.name].data, HyphenDataStore.prototype.stores);
                            actionPromise.resolve(self.api[rest.name].data);
                            //} catch (error) {
                            //    console.warn(error);
                            //    actionPromise.reject("can not save data in offline" + error);
                            // }

                        } else {
                            var message = "No offline method: " + modelData.model + "." + rest.name + "Offline";
                            console.warn(message)
                            throw new Error(message);
                        }
                    }

                    //if the method is defined as callOnce, call method only first time and return empty arry every next time
                    if (rest.cache && rest.method !== "get") {
                        throw new Error("Cache option can be switch on only for get parameters");
                    }

                    if (rest.cache && rest.method === "get" && !CacheService.isCached(cacheItem)) {
                        CacheService.addUrl(cacheItem);
                    }

                    return actionPromise.promise;
                };
            }, this);
        };
        return BasicModel;
    }]);

    jsHyphen.factory("CacheService", ['HyphenDataStore', function (HyphenDataStore) {
        var urls = [];
        this.addUrl = function (url) {
            urls.push(url);
        }

        this.isCached = function (url) {
            var u = _(urls).filter(function (data) {
                return data === url;
            });

            return u.length > 0 ? true : false;
        }

        this.clearCache = function () {
            HyphenDataStore.clearStores();
            urls = [];
        }

        return this;
    }]);

    jsHyphen.factory("ApiCallFactory", ['HyphenPost', 'HyphenGet', 'HyphenPut', 'HyphenDelete',
        function (HyphenPost, HyphenGet, HyphenPut, HyphenDelete) {
            var ApiCallFactory = function () {

            }
            ApiCallFactory.prototype.callType = HyphenGet;
            ApiCallFactory.prototype.createApiCall = function (options, configuration, dataModel) {

                switch (options.method) {
                    case "get":
                        this.callType = HyphenGet;
                        break;
                    case "post":
                        this.callType = HyphenPost;
                        break;
                    case "put":
                        this.callType = HyphenPut;
                        break;
                    case "delete":
                        this.callType = HyphenDelete;
                        break;
                }

                return new this.callType(options, configuration, dataModel);
            };

            return ApiCallFactory;
        }])

    jsHyphen.factory("OfflineOnlineService", ["$rootScope", '$timeout', function ($rootScope, $timeout) {
        var online = true;
        var manualOffline = false;
        var timer;

        this.getState = function () {
            return online;
        }
        this.setOffline = function () {
            online = false;
            manualOffline = true;
            $rootScope.$broadcast("hyphenOffline");
        };

        this.setOnline = function () {
            manualOffline = false;
            online = true;
            $rootScope.$broadcast("hyphenOnline");
        };

        window.addEventListener('online', function () {
            if (!manualOffline) {
                timer = $timeout(function () {
                    online = true;
                    $rootScope.$broadcast("hyphenOnline");
                }, 5000);
            }
        });

        window.addEventListener('offline', function () {
            if (!manualOffline) {
                if (timer) {
                    $timeout.cancel(timer);
                }
                $timeout(function () {
                    online = false;
                    $rootScope.$broadcast("hyphenOffline");
                });
            }
        });

        return this;

    }]);

})
();


