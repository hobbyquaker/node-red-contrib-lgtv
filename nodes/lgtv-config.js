module.exports = function (RED) {

    function LgtvConfigNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;

        node.host =         config.host;
        node.users = {};

        var lgtv = require("lgtv2")({
            url: 'ws://' + node.host + ':3000',
            clientKey: node.credentials.token,
            saveKey: function (key, cb) {
                RED.nodes.addCredentials(node.id, {
                    token: key
                });
                if (typeof cb === 'function') cb();
            }
        });

        lgtv.on('connecting', function () {
            node.setStatus('connecting');
        });

        lgtv.on('connect', function () {
            node.setStatus('connect');
            node.connected = true;

            for (var url in subscriptions) {
                lgtv.subscribe(url, function (err, res) {
                    node.subscriptionHandler(url, err, res);
                });
            }

            lgtv.getSocket('ssap://com.webos.service.networkinput/getPointerInputSocket',
                function (err, sock) {
                    if (!err) {
                        node.buttonSocket = sock;
                    }
                }
            );

            node.emit('tvconnect');

        });

        lgtv.on('error', function (e) {
            node.connected = false;
            node.setStatus(e.code)

        });

        lgtv.on('close', function () {
            node.emit('tvclose');
            node.connected = false;
            node.buttonSocket = null;
            node.setStatus('close');
        });

        lgtv.on('prompt', function () {
            node.setStatus('prompt');
        });

        var subscriptions = {};

        this.subscriptionHandler = function (url, err, res) {
            if (subscriptions[url]) {
                for (var id in subscriptions[url]) {
                    subscriptions[url][id](err, res);
                }
            }
        };

        this.subscribe = function (id, url, callback) {
            if (!subscriptions[url]) {
                subscriptions[url] = {};
                if (node.connected) {
                    lgtv.subscribe(url, function (err, res) {
                        node.subscriptionHandler(url, err, res);
                    });
                }
            }
            subscriptions[url][id] = callback;
        };

        this.request = function (url, payload, callback) {
            if (node.connected) {
                lgtv.request(url, payload, callback);
            }
        };

        this.register = function (lgtvNode) {
            node.users[lgtvNode.id] = lgtvNode;
            if (Object.keys(node.users).length === 1) {

            }
        };

        this.deregister = function (lgtvNode, done) {
            delete node.users[lgtvNode.id];
            for (var url in subscriptions) {
                delete subscriptions[url][lgtvNode.id];
            }
            if (node.closing) {
                return done();
            }
            if (Object.keys(node.users).length === 0) {
                if (node.client && node.client.connected) {
                    //return node.client.end(done);
                } else {
                    //node.client.end();
                    //return done();
                }
            }
            done();
        };

        this.setStatus = function (c) {
            var status;
            switch (c) {
                case 'connecting':
                    status = {
                        fill: 'yellow',
                        shape: 'ring',
                        text: 'node-red:common.status.connecting'
                    };
                    break;
                case 'prompt':
                    status = {
                        fill: 'yellow',
                        shape: 'ring',
                        text: c
                    };
                    break;
                case 'connect':
                    status = {
                        fill: 'green',
                        shape: 'dot',
                        text: 'node-red:common.status.connected'
                    };
                    break;
                case 'disconnected':
                    status = {
                        fill: 'red',
                        shape: 'ring',
                        text: 'node-red:common.status.disconnected'
                    };
                    break;
                default:
                    status = {
                        fill: 'red',
                        shape: 'ring',
                        text: c
                    };
            }

            for (var id in node.users) {
                if (node.users.hasOwnProperty(id)) {
                    node.users[id].status(status);
                }
            }
        }
    }

    RED.nodes.registerType('lgtv-config', LgtvConfigNode, {
        credentials: {
            token: {type: 'text'}
        }
    });
};
