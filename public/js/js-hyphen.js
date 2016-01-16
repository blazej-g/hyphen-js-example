var jsHyphen = angular.module('jsHyphen', []);

(function () {

    //var publicApi = {};
    //jsHyphen.value('jsHyphen', publicApi);

    jsHyphen.provider("Hyphen", [function () {
        var provider = {};
        provider.initialize = function () {

        }
        provider.$get = ['$http', '$q', 'HyphenIndexDb', 'BasicModel', 'HyphenIndexDb', '$injector', '$timeout', 'CacheService', function ($http, $q, HyphenIndexDb, BasicModel, HyphenIndexDb, $injector, $timeout, CacheService) {
            var service = {};
            var enqueuedActionsList = [];
            var hyphenConfiguration;
            var hyphenIndexDb;
            var stores = [];
            var syncStart, syncEnd;

            service.syncStartEvent = function (fun) {
                syncStart = fun;
            };
            service.syncEndEvent = function (fun) {
                syncEnd = fun;
            }

            service.initialize = function (configuration) {
                var self = this;
                this.configuration = configuration;
                hyphenConfiguration = configuration;

                configuration.model.forEach(function (entity) {
                    service[entity.model] = new BasicModel(entity, configuration);
                    if (entity.sync)
                        stores.push({
                            name: entity.model,
                            key: entity.key,
                            priority: entity.priority,
                            sync: entity.sync
                        });
                });
            };

            service.dispose = function () {
                CacheService.clearCache();
                HyphenIndexDb.closeDb();
            };

            service.initializeDb = function (identifier) {
                if (!identifier)
                    throw new Error("Db identifier not provided for initializeDb function")
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

                    HyphenIndexDb.openEvent(function (event) {

                        var prom = readFromIndexDb(stores);
                        prom.then(function (data) {
                            _(stores).each(function (store) {
                                HyphenIndexDb.clear(store.name);
                            });

                            HyphenIndexDb.initialized = true;
                            loadData();
                            console.log("Load data and start app");
                        }, function (reason) {
                            //clear stores even when sync fail
                            _(stores).each(function (store) {
                                HyphenIndexDb.clear(store.name);
                            });
                            console.log(reason);
                        });

                    });
                } else {
                    console.log("db already initialized");
                }
            }

            window.addEventListener('online', function () {
                if (hyphenIndexDb) {
                    $timeout(function () {
                        var prom = readFromIndexDb(stores);
                        prom.then(function (data) {
                            _(stores).each(function (store) {
                                HyphenIndexDb.clear(store.name);
                            });
                            console.log("synchronize");
                        }, function (reason) {
                            console.log(reason);
                        });
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
                    var indexReadPromise = HyphenIndexDb.getStoreData(store.name, store.priority, store.sync);
                    readPromises.push(indexReadPromise);
                });

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

                        if (!entityModel.syncNew)
                            throw Error("Not defined synchronise method for 'syncNew' for model " + dbData.model);

                        if (!entityModel.syncUpdated)
                            throw Error("Not defined synchronise method for 'syncUpdated' for model " + dbData.model);

                        if (!entityModel.syncDeleted)
                            throw Error("Not defined synchronise method for 'syncDeleted' for model " + dbData.model);

                        var newData = [];
                        var updateData = [];
                        var deleteData = [];

                        _(dbData.data).each(function (record) {
                            dataToSync.push(record);
                            if (syncStart)
                                syncStart();
                            if (record.action == "new") {
                                newData.push(record);
                            }
                            if (record.action == "updated") {
                                updateData.push(record);
                            }

                            if (record.action == "deleted") {
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
                        if (syncEnd)
                            syncEnd(dataToSync);
                        syncModelsPromise.resolve(dataToSync);
                    }

                }, function (r) {
                    console.log("cannot read from db");
                });

                return syncModelsPromise.promise;
            }

            var promiseQueChain = function (promisesList) {
                var item = promisesList[0];
                if (item) {
                    var syncNewPromise = item.syncNew(item.newData);
                    var syncUpdatedPromise = item.syncUpdated(item.updateData);
                    var syncDeleted = item.syncDeleted(item.deleteData);

                    $q.all([syncNewPromise, syncUpdatedPromise, syncDeleted]).then(function () {
                        //clear synced store
                        //HyphenIndexDb.clear(item.name);
                        promisesList.shift();
                        promiseQueChain(promisesList);
                    }, function (reason) {
                        syncEnd(reason);
                        syncModelsPromise.reject(reason);
                    })
                } else {
                    if (syncEnd)
                        syncEnd(dataToSync);
                    syncModelsPromise.resolve(dataToSync);
                }
            }

            var loadData = function () {
                _(enqueuedActionsList).each(function (data) {
                    var method = data.method;
                    var params = data.params;
                    method.data = data.data;
                    method.call(params).then(function (data) {
                        self.defer.resolve(data);
                    }, function (reason) {
                        self.defer.reject(reason);
                    });
                });
            }

            service.enqueue = function (enqueueList) {
                if (navigator.onLine) {
                    enqueuedActionsList = enqueueList;
                    self.defer = $q.defer();
                    if (HyphenIndexDb.initialized)
                        loadData();
                } else {
                    console.error("app is offline");
                    self.defer.resolve("app is offline");
                }
                return self.defer.promise;
            }

            return service;
        }];
        return provider;
    }]);

    jsHyphen.factory("HyphenDataStore", ['HyphenDataModel', function (HyphenDataModel) {
        var HyphenDataStore = function (store, entityModel) {
            HyphenDataStore.prototype.stores[store] = new HyphenDataModel(entityModel, store);
        }

        HyphenDataStore.prototype.stores = {}
        HyphenDataStore.actions = {};

        HyphenDataStore.actions.delete = function (data, store, options) {
            HyphenDataStore.prototype.stores[store].removeDataOnline(data);
        }

        HyphenDataStore.actions.save = function (data, store, options) {
            HyphenDataStore.prototype.stores[store].addData(data);
        }

        HyphenDataStore.actions.custom = function (data, store, options) {
            options.responseHandler(data, HyphenDataStore.actions);
        }

        HyphenDataStore.saveResult = function (data, store, options) {
            if (options.processResponse != false) {
                if (options.responseHandler) {
                    options.responseHandler(data, HyphenDataStore.prototype.stores);

                } else {
                    if (options.method == "delete" || options.action == "delete") {
                        HyphenDataStore.prototype.stores[store].remove(data);
                    }
                    else {
                        HyphenDataStore.prototype.stores[store].add(data);
                    }
                }
            }
        }

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

    jsHyphen.factory("BasicModel", ['ApiCallFactory', 'HyphenDataStore', '$injector', 'HyphenSynchronizer', '$q', 'CacheService', function (ApiCallFactory, HyphenDataStore, $injector, HyphenSynchronizer, $q, CacheService) {
        var promises = [];
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
            var promises = [];
            _(modelData.rest).each(function (rest) {
                var self = this;
                var apiCall = apiCallFactory.createApiCall(rest, configuration, modelData.model);
                this.api[rest.name] = {};
                self.api[rest.name].loading = false;

                this.api[rest.name].call = function (params) {
                    //initialize promise for every call!!!
                    var actionPromise = $q.defer();

                    var args = Array.prototype.slice.call(arguments);
                    var cacheItem = rest.name + modelData.model + args.join("");

                    if (navigator.onLine) {
                        if (!CacheService.isCached(cacheItem)) {
                            apiCall.dataSet = self.api[rest.name].data;
                            var promise = apiCall.invoke.call(apiCall, params);
                            self.api[rest.name].loading = true;
                            promise.then(function (result) {
                                self.api[rest.name].loading = false;

                                actionPromise.resolve(angular.copy(result));
                                result.data = configuration.responseInterceptor ? configuration.responseInterceptor(result.data, rest, dataStore.stores[modelData.model]) : result.data;
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
                    if (rest.cache && rest.method != "get")
                        throw new Error("Cache option can be switch on only for get parameters");

                    if (rest.cache && rest.method == "get" && !CacheService.isCached(cacheItem)) {
                        CacheService.addUrl(cacheItem);
                    }

                    promises.push(promise);
                    $q.all(promises);

                    return actionPromise.promise;
                };
            }, this);
        };

        BasicModel.getPromises = function () {
            return promises;
        }

        return BasicModel;

    }]);

    jsHyphen.factory("ModelsAbstractFactory", [function () {
        var ModelsAbstractFactory = function () {
            this.types = {};
        }

        ModelsAbstractFactory.prototype.registerModel = function (type, model) {
            var proto = model.prototype;
            //if (proto.dataModel
            this.types[type] = model;

        }

        ModelsAbstractFactory.prototype.getModel = function (modelData, configuration) {
            var model = this.types[modelData.model];
            return model ? new model(modelData, configuration) : null;
        }

        return ModelsAbstractFactory;
    }]);

    jsHyphen.factory("CacheService", ['HyphenDataStore', function (HyphenDataStore) {
        var urls = [];
        this.addUrl = function (url) {
            urls.push(url);
        }

        this.isCached = function (url) {
            var u = _(urls).filter(function (data) {
                return data == url;
            });

            return u.length > 0 ? true : false;
        }

        this.clearCache = function () {
            HyphenDataStore.clearStores();
            urls = [];
        }

        return this;
    }]);

    jsHyphen.factory("ApiCallFactory", ['HyphenPost', 'HyphenGet', 'HyphenPut', 'HyphenDelete', function (HyphenPost, HyphenGet, HyphenPut, HyphenDelete) {
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
        }

        return ApiCallFactory;
    }])

})
();