/**
 * Created by blazejgrzelinski on 06/12/15.
 */
jsHyphen.factory("HyphenSynchronizer", ['HyphenIndexDb', 'HyphenDataStore', function (HyphenIndexDb, HyphenDataStore) {
    var HyphenSynchronizer = {};


    HyphenSynchronizer.checkIndexDb = function(){
        var stores = HyphenDataStore.getStores();
        _(stores).each(function(store){
            HyphenIndexDb.getStoreData(store);
        });
    };

    return HyphenSynchronizer;
}]);