var _ = require('lodash');
var util = require('../util');
var DefaultHelper = require('./default');

module.exports = {

    setData: function(pageObject, data) {
        if (typeof data !== 'object') {
            data = [data];
        }

        return util.walkByPromise(data, function (originalNodePath) {
            return selectNode(
                pageObject.getElement().element(by.css('.angular-ui-tree')),
                _.clone(originalNodePath)
            );

            function selectNode(nodeElement, nodePath) {
                if (nodePath.length > 0) {

                    var firstStep = nodePath.shift(),
                        childNodes = nodeElement.all(by.xpath('./ol/li')),
                        d = protractor.promise.defer(),
                        resolved = false;

                    childNodes.count().then(function (total) {
                        childNodes.each(function (childNodeElement, index) {
                            childNodeElement.element(by.xpath('./div')).getText().then(function (text) {
                                if (!resolved) {
                                    if (firstStep === _.trim(text)) {
                                        selectNode(childNodeElement, nodePath).then(function () {
                                            resolved = true;
                                            d.fulfill(true);
                                        });
                                    } else if (index >= total - 1) {
                                        throw new Error('Could not find node on path "' + originalNodePath.join(' -> ') + '" in ui-field-tree');
                                    }
                                }
                            });
                        });
                    });

                    return d.promise;
                } else {
                    return nodeElement.element(by.xpath('./div')).click();
                }
            }
        });
    },

    getData: function(pageObject) {
        var data = [];

        return getSelectedNodesPaths(
            pageObject.getElement().element(by.css('.angular-ui-tree'))
        )
        .then(function () {
            return data;
        });

        function getSelectedNodesPaths(nodeElement, parentPath) {
            if (typeof parentPath === 'undefined') {
                parentPath = []; // Root node's parent path
            }

            var textElement = nodeElement.element(by.xpath('./div'));

            return textElement.isPresent().then(function (hasText) {
                return (hasText ? textElement.getText() : protractor.promise.when('')).then(function (nodeText) {
                    var promise,
                        nodeFullPath = (nodeText === '' ? parentPath : parentPath.concat(nodeText));

                    if (hasText) {
                        promise = nodeElement.element(by.xpath('./div/i[contains(@class, "glyphicon-ok")]')).isPresent().then(function (nodeSelected) {
                            if (nodeSelected) {
                                data.push(nodeFullPath);
                            }
                        });
                    } else {
                        promise = protractor.promise.when(true);
                    }

                    return promise.then(function () {

                        var childNodes = nodeElement.all(by.xpath('./ol/li')),
                            d = protractor.promise.defer(),
                            done = 0;

                        childNodes.count().then(function (total) {
                            if (total > 0) {
                                childNodes.each(function (childNodeElement) {
                                    getSelectedNodesPaths(childNodeElement, nodeFullPath).then(function () {
                                        done++;

                                        if (done >= total) {
                                            d.fulfill(true);
                                        }
                                    });
                                });
                            } else {
                                d.fulfill(true);
                            }
                        });

                        return d.promise;
                    });
                });
            });
        }
    },

    clearData: function(pageObject) {
        return pageObject.getElement().all(by.css('.tree-node-anchor > i')).map(function (element) {
            return element.click();
        });
    },
    getErrors: DefaultHelper.getErrors
};