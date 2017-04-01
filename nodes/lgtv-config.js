module.exports = function (RED) {
    var status;
    var token;
    var lgtv;

    function LgtvConfigNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.host = config.host;
        node.users = {};
        var subscriptions = {};

        var lgtv = require('lgtv2')({
            url: 'ws://' + node.host + ':3000',
            clientKey: node.credentials.token,
            saveKey: function (key, cb) {
                token = key;
                RED.nodes.addCredentials(node.id, {
                    token: key
                });
                if (typeof cb === 'function') {
                    cb();
                }
            }
        });

        lgtv.on('connecting', function () {
            node.setStatus('connecting');
        });

        lgtv.on('connect', function () {
            node.setStatus('connect');
            node.connected = true;

            Object.keys(subscriptions).forEach(function (url) {
                lgtv.subscribe(url, function (err, res) {
                    node.subscriptionHandler(url, err, res);
                });
            });

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
            node.setStatus(e.code);
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

        this.subscriptionHandler = function (url, err, res) {
            if (subscriptions[url]) {
                Object.keys(subscriptions[url]).forEach(function (id) {
                    subscriptions[url][id](err, res);
                });
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
        };

        this.deregister = function (lgtvNode, done) {
            delete node.users[lgtvNode.id];
            Object.keys(subscriptions).forEach(function (url) {
                delete subscriptions[url][lgtvNode.id];
            });
            return done();
        };

        this.setStatus = function (c) {
            status = c;
            var s;
            switch (c) {
                case 'connecting':
                    s = {
                        fill: 'yellow',
                        shape: 'ring',
                        text: 'node-red:common.status.connecting'
                    };
                    break;
                case 'prompt':
                    s = {
                        fill: 'yellow',
                        shape: 'ring',
                        text: c
                    };
                    break;
                case 'connect':
                    s = {
                        fill: 'green',
                        shape: 'dot',
                        text: 'node-red:common.status.connected'
                    };
                    break;
                case 'disconnected':
                    s = {
                        fill: 'red',
                        shape: 'ring',
                        text: 'node-red:common.status.disconnected'
                    };
                    break;
                default:
                    s = {
                        fill: 'red',
                        shape: 'ring',
                        text: c
                    };
            }

            Object.keys(node.users).forEach(function (id) {
                node.users[id].status(s);
            });
        };
    }

    RED.httpAdmin.get('/lgtv-connect', function (req, res) {
        if (!status || status === 'Close') {
            lgtv = require('lgtv2')({
                url: 'ws://' + req.query.host + ':3000',
                saveKey: function (key, cb) {
                    token = key;
                    RED.nodes.addCredentials(req.query.id, {
                        token: key
                    });
                    if (typeof cb === 'function') {
                        cb();
                    }
                }
            });

            status = 'Connecting';

            setTimeout(function () {
                lgtv.disconnect();
                status = '';
            }, 31000);

            lgtv.on('connecting', function () {
                status = 'Connecting';
            });

            lgtv.on('connect', function () {
                lgtv.disconnect();
                status = 'Connected';
            });

            lgtv.on('error', function (e) {
                status = 'Error: ' + e.code.toLowerCase();
            });

            lgtv.on('prompt', function () {
                status = 'Please answer the prompt on your TV';
            });
        }

        res.status(200).send(JSON.stringify({
            state: status,
            token: token
        }));
    });

    RED.nodes.registerType('lgtv-config', LgtvConfigNode, {
        credentials: {
            token: {type: 'text'}
        }
    });
};
