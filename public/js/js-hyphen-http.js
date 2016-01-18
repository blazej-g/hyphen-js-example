/**
 * Created by blazejgrzelinski on 25/11/15.
 */
jsHyphen.factory('HyphenCallBase', ['$http', function ($http) {
    var HyphenCallBase = function (httpOptions, hyphenConfiguration) {
        this.httpOptions = httpOptions;
        this.hyphenConfiguration = hyphenConfiguration;
        this.$http = $http;
        this.config = {};
    };

    HyphenCallBase.prototype.urlParser = function (url, params) {
        var parameters = Array.isArray(params) ? params : [params];
        var segments = url.split("/");
        var paramCounter = 0;
        _(segments).each(function (seg, index) {
            if (seg.indexOf(":") !== -1) {
                segments[index] = parameters[paramCounter];
                paramCounter++;
            }
        });

        return segments.join("/");
    };

    var strEndsWith = function(str, suffix) {
        return str.match(suffix+"$")===suffix;
    };

    HyphenCallBase.prototype.invoke = function (params) {
        if(strEndsWith(this.hyphenConfiguration.baseUrl, "/")) {
            this.hyphenConfiguration.baseUrl = this.hyphenConfiguration.baseUrl.substring(0, this.hyphenConfiguration.baseUrl.length - 1);
        }

        this.config.url = this.hyphenConfiguration.baseUrl + "/" + this.urlParser(this.httpOptions.url, params);
        this.config.data = this.dataSet;
        if (this.hyphenConfiguration.requestInterceptor) {
            this.config = this.hyphenConfiguration.requestInterceptor(this.config);
        }

        return this.$http(this.config);
    };

    return HyphenCallBase;

}]);

jsHyphen.factory("HyphenGet", ['HyphenCallBase', function (HyphenCallBase) {
    var HyphenGet = function (httpOptions, hyphenConfiguration) {
        HyphenCallBase.call(this, httpOptions, hyphenConfiguration);
        this.config.method = "GET";
    };
    HyphenGet.prototype = Object.create(HyphenCallBase.prototype);

    return HyphenGet;

}]);

jsHyphen.factory("HyphenPost", ['HyphenCallBase', function (HyphenCallBase) {
    var HyphenPost = function (httpOptions, hyphenConfiguration) {
        HyphenCallBase.call(this, httpOptions, hyphenConfiguration);
        this.config.method = "POST";
    };

    HyphenPost.prototype = Object.create(HyphenCallBase.prototype);

    HyphenPost.prototype.dataSet = null;

    return HyphenPost;
}]);

jsHyphen.factory("HyphenPut", ['HyphenCallBase', function (HyphenCallBase) {
    var HyphenPut = function (httpOptions, hyphenConfiguration) {
        HyphenCallBase.call(this, httpOptions, hyphenConfiguration);
        this.httpOptions = httpOptions;
        this.config.method = "PUT";
    };

    HyphenPut.prototype = Object.create(HyphenCallBase.prototype);

    HyphenPut.prototype.dataSet = null;

    return HyphenPut;
}]);

jsHyphen.factory("HyphenDelete", ['HyphenCallBase', function (HyphenCallBase) {
    var HyphenDelete = function (httpOptions, hyphenConfiguration) {
        HyphenCallBase.call(this, httpOptions, hyphenConfiguration);
        this.httpOptions = httpOptions;
        this.config.method = "DELETE";
    };

    HyphenDelete.prototype = Object.create(HyphenCallBase.prototype);

    return HyphenDelete;
}]);