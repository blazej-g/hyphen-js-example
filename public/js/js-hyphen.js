var jsHyphen = angular.module('jsHyphen', []);

(function () {

    //var publicApi = {};
    //jsHyphen.value('jsHyphen', publicApi);

    jsHyphen.provider("Hyphen", [function () {
        var provider = {};
        provider.initialize = function () {

        };
        provider.$get = ['$http', '$q', 'BasicModel', 'HyphenIndexDb', '$injector', '$timeout', 'CacheService', 'HyphenSynchronizer',
            function ($http, $q, BasicModel, HyphenIndexDb, $injector, $timeout, CacheService, HyphenSynchronizer) {
                var service = {};
                var hyphenConfiguration;
                var hyphenIndexDb;
                var stores = [];
                var syncStart, syncEnd;

                service.syncStartEvent = function (fun) {
                    syncStart = fun;
                };
                service.syncEndEvent = function (fun) {
                    syncEnd = fun;
                };

                service.initialize = function (configuration) {
                    this.configuration = configuration;
                    hyphenConfiguration = configuration;

                    configuration.model.forEach(function (entity) {
                        service[entity.model] = new BasicModel(entity, configuration);
                        if (entity.sync) {
                            stores.push({
                                name: entity.model,
                                key: entity.key,
                                priority: entity.priority,
                                sync: entity.sync
                            });
                        }
                    });
                };

                service.dispose = function () {
                    CacheService.clearCache();
                    HyphenIndexDb.closeDb();
                };

                service.initializeDb = function (identifier) {
                    if (!identifier) {
                        throw new Error("Db identifier not provided for initializeDb function");
                    }
                    if (!HyphenIndexDb.isInitialized()) {
                        var dbName = this.configuration.dbName + identifier;
                        hyphenIndexDb = new HyphenIndexDb(dbName, this.configuration.dbVersion, stores, identifier);
                        HyphenIndexDb.upgradeEvent(function (event) {
                            _(stores).each(function (st) {
                                if (!_(event.target.transaction.db.objectStoreNames).contains(st.name)) {
                                    HyphenIndexDb.createStore(st.name, st.key);
                                } else {
                                    console.log("Store " + st + "already exist and will be not created again");
                                }
                            })
                        });

                        //event called from indexed db
                        HyphenIndexDb.openEvent(function () {
                            readFromIndexDb(stores);
                            /*
                             prom.then(function () {
                             _(stores).each(function (store) {
                             HyphenIndexDb.clear(store.name);
                             });

                             HyphenIndexDb.initialized = true;
                             console.log("Load data and start app");
                             }, function (reason) {
                             //clear stores even when sync fail
                             _(stores).each(function (store) {
                             HyphenIndexDb.clear(store.name);
                             });
                             console.log(reason);
                             });
                             */
                        });
                    } else {
                        console.log("db already initialized");
                    }
                };

                window.addEventListener('online', function () {
                    if (hyphenIndexDb) {
                        $timeout(function () {
                            readFromIndexDb(stores);
                            /*
                             prom.then(function (data) {
                             _(stores).each(function (store) {
                             HyphenIndexDb.clear(store.name);
                             });
                             console.log("synchronize " + data);
                             }, function (reason) {
                             console.log(reason);
                             });
                             */
                        }, 5000);
                    }
                });

                window.addEventListener('offline', function () {
                    console.log("is offline");
                });

                var syncModelsPromise;
                var dataToSync = [];
                var readFromIndexDb = function (dbStores) {
                    syncModelsPromise = $q.defer();
                    var readPromises = [];
                    _(dbStores).each(function (store) {
                        var indexReadPromise = HyphenIndexDb.getStoreData(store);
                        readPromises.push(indexReadPromise);
                    });

                    $q.all(readPromises).then(function (result) {
                        var sync = new HyphenSynchronizer(result).synchronize();
                    });
                    return readPromises;
                }

                var synchronizeData = function () {
                    $q.all(readPromises).then(function (result) {
                        var syncQue = [];
                        dataToSync = [];
                        _(result).each(function (dbData) {
                            var entityModel;
                            try {
                                entityModel = $injector.get(dbData.model);
                            } catch (e) {
                                entityModel = $injector.get('DefaultModel');
                            }

                            if (!entityModel.syncNew) {
                                throw Error("Not defined synchronise method for 'syncNew' for model " + dbData.model);
                            }

                            if (!entityModel.syncUpdated) {
                                throw Error("Not defined synchronise method for 'syncUpdated' for model " + dbData.model);
                            }

                            if (!entityModel.syncDeleted) {
                                throw Error("Not defined synchronise method for 'syncDeleted' for model " + dbData.model);
                            }

                            var newData = [];
                            var updateData = [];
                            var deleteData = [];

                            _(dbData.data).each(function (record) {
                                dataToSync.push(record);
                                if (syncStart) {
                                    syncStart();
                                }
                                if (record.action === "new") {
                                    newData.push(record);
                                }
                                if (record.action === "updated") {
                                    updateData.push(record);
                                }
                                if (record.action === "deleted") {
                                    deleteData.push(record);
                                }
                            });
                            if (dbData.sync) {
                                syncQue.push({
                                    name: dbData.model,
                                    syncNew: entityModel.syncNew,
                                    syncUpdated: entityModel.syncUpdated,
                                    syncDeleted: entityModel.syncDeleted,
                                    newData: newData,
                                    updateData: updateData,
                                    deleteData: deleteData,
                                    priority: dbData.priority
                                });
                            }
                        });

                        if (dataToSync.length > 0) {
                            syncQue = _(syncQue).sortBy(function (d) {
                                return d.priority;
                            });
                            promiseQueChain(syncQue);
                        }
                        else {
                            if (syncEnd) {
                                syncEnd(dataToSync);
                            }
                            syncModelsPromise.resolve(dataToSync);
                        }

                    }, function (r) {
                        console.log("Cannot read from db. Error: " + r);
                    });

                    return syncModelsPromise.promise;
                };

                var promiseQueChain = function (promisesList) {
                    var item = promisesList[0];
                    if (item) {
                        var syncNewPromise = item.syncNew(item.newData);
                        var syncUpdatedPromise = item.syncUpdated(item.updateData);
                        var syncDeleted = item.syncDeleted(item.deleteData);

                        $q.all([syncNewPromise, syncUpdatedPromise, syncDeleted]).then(function (data) {
                            //clear synced store
                            HyphenIndexDb.clear(item.name);
                            promisesList.shift();
                            promiseQueChain(promisesList);
                        }, function (reason) {
                            syncEnd(reason);
                            syncModelsPromise.reject(reason);
                        })
                    } else {
                        if (syncEnd) {
                            syncEnd(dataToSync);
                        }
                        syncModelsPromise.resolve(dataToSync);
                    }
                }

                return service;
            }];
        return provider;
    }]);

    jsHyphen.factory("HyphenSynchronizer", ['HyphenDataStore', '$injector', 'HyphenIndexDb', function (HyphenDataStore, $injector, HyphenIndexDb) {
        var HyphenSynchronizer = function (stores) {
            this.stores = stores;
        }

        HyphenSynchronizer.prototype.synchronize = function () {
            var self = this;
            _(this.stores).each(function (syncStore) {
                if (syncStore.data.length > 0) {
                    var entitySyncModel = $injector.get(syncStore.model.name + "Sync");
                    // if (entitySyncModel.syncRecord && entitySyncModel.syncStore)
                    //     throw new Error("You can sync by record or by store, not by both. Model: " + syncStore.model);

                    _(syncStore.data).each(function (record) {
                        var id = record[syncStore.model.key];
                        switch (record.action) {
                            case "new":
                                entitySyncModel.new(angular.copy(record)).then(function (result) {
                                    self.updateIds(id, result.data[syncStore.model.key], syncStore.model.key);
                                    HyphenDataStore.getStores()[syncStore.model.name].remove(id);
                                    HyphenIndexDb.deleteRecord(syncStore.model.name, id);
                                }, function (error) {
                                    console.log("can not remove synchronized record for 'Add' action with id = " + record[self.syncStore.model.key] + error);
                                });
                                break;
                            case "updated":
                                entitySyncModel.update(record).then(function (result) {
                                    HyphenIndexDb.deleteRecord(syncStore.model.name, id);
                                }, function (error) {
                                    console.log("can not remove synchronized record for 'Update' action with id = " + record[self.syncStore.model.key] + error);
                                });
                                break;
                            case "deleted":
                                entitySyncModel.delete(record).then(function (result) {
                                    HyphenIndexDb.deleteRecord(syncStore.model.name, record[syncStore.model.key]);
                                }, function (error) {
                                    console.log("can not remove synchronized record for 'Delete' action with id = record[syncStore.model.key]. " + error);
                                });

                                break;
                            default:
                                console.log("action not defined");
                        }

                    })
                }
            });
        }

        HyphenSynchronizer.prototype.updateIds = function (oldId, newId, key) {
            _(this.stores).each(function (store) {
                _(store.data).each(function (data) {
                    if (data[key] === oldId) {
                        data[key] = newId;
                    }
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
        var HyphenDataStore = function (store, entityModel) {
            HyphenDataStore.prototype.stores[store] = new HyphenDataModel(entityModel, store);
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

    jsHyphen.factory("BasicModel", ['ApiCallFactory', 'HyphenDataStore', '$injector', '$q', 'CacheService', function
        (ApiCallFactory, HyphenDataStore, $injector, $q, CacheService) {
        var BasicModel = function (modelData, configuration) {
            this.entityModel = null;
            try {
                this.entityModel = $injector.get(modelData.model);
            } catch (e) {
                throw new Error("Model not defned for: " + modelData.model);
            }
            var dataStore = new HyphenDataStore(modelData.model, this.entityModel);

            //entities public properties
            this.dataModel = dataStore.stores[modelData.model];
            this.api = {};

            var apiCallFactory = new ApiCallFactory();
            _(modelData.rest).each(function (rest) {
                var self = this;
                var apiCall = apiCallFactory.createApiCall(rest, configuration, modelData.model);
                this.api[rest.name] = {};
                self.api[rest.name].loading = false;

                this.api[rest.name].call = function (params) {
                    var promise;
                    //initialize promise for every call!!!
                    var actionPromise = $q.defer();

                    var args = Array.prototype.slice.call(arguments);
                    var cacheItem = rest.name + modelData.model + args.join("");

                    if (navigator.onLine) {
                        if (!CacheService.isCached(cacheItem)) {
                            apiCall.dataSet = self.api[rest.name].data;
                            promise = apiCall.invoke.call(apiCall, params);
                            self.api[rest.name].loading = true;
                            promise.then(function (result) {
                                self.api[rest.name].loading = false;

                                actionPromise.resolve(angular.copy(result));
                                result.data = configuration.responseInterceptor ?
                                    configuration.responseInterceptor(result.data, rest, dataStore.stores[modelData.model]) :
                                    result.data;
                                HyphenDataStore.saveResult(result.data, modelData.model, rest);

                            }, function (reason) {
                                self.api[rest.name].loading = false;
                                actionPromise.reject(reason);
                            });
                        } else {
                            actionPromise.resolve([]);
                        }
                    } else {
                        if (self.entityModel[rest.name + "Offline"]) {
                            try {
                                self.entityModel[rest.name + "Offline"](params, self.api[rest.name].data, HyphenDataStore.prototype.stores);
                                actionPromise.resolve(self.api[rest.name].data);
                            } catch (error) {
                                console.warn(error);
                                actionPromise.reject("can not save data in offline" + error);
                            }

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

})
();