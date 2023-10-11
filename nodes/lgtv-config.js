module.exports = function (RED) {
    let status;
    let token;
    let lgtv;

    function LgtvConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.host = config.host;
        node.users = {};
        const subscriptions = {};

        const lgtv = require('lgtv2')({
            url: 'wss://' + node.host + ':3001',
            clientKey: node.credentials.token,
            saveKey(key, cb) {
                token = key;
                RED.nodes.addCredentials(node.id, {
                    token: key
                });
                if (typeof cb === 'function') {
                    cb();
                }
            }
        });

        lgtv.on('connecting', () => {
            node.setStatus('connecting');
        });

        lgtv.on('connect', () => {
            node.setStatus('connect');
            node.connected = true;

            Object.keys(subscriptions).forEach(url => {
                lgtv.subscribe(url, (err, res) => {
                    node.subscriptionHandler(url, err, res);
                });
            });

            lgtv.getSocket('ssap://com.webos.service.networkinput/getPointerInputSocket',
                (err, sock) => {
                    if (!err) {
                        node.buttonSocket = sock;
                    }
                }
            );

            node.emit('tvconnect');
        });

        lgtv.on('error', e => {
            node.connected = false;
            node.setStatus(e.code);
        });

        lgtv.on('close', () => {
            node.emit('tvclose');
            node.connected = false;
            node.buttonSocket = null;
            node.setStatus('close');
        });

        lgtv.on('prompt', () => {
            node.setStatus('prompt');
        });

        this.subscriptionHandler = function (url, err, res) {
            if (subscriptions[url]) {
                Object.keys(subscriptions[url]).forEach(id => {
                    subscriptions[url][id](err, res);
                });
            }
        };

        this.subscribe = function (id, url, callback) {
            if (!subscriptions[url]) {
                subscriptions[url] = {};
                if (node.connected) {
                    lgtv.subscribe(url, (err, res) => {
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
            Object.keys(subscriptions).forEach(url => {
                delete subscriptions[url][lgtvNode.id];
            });
            return done();
        };

        this.setStatus = function (c) {
            status = c;
            let s;
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

            Object.keys(node.users).forEach(id => {
                node.users[id].status(s);
            });
        };
    }

    RED.httpAdmin.get('/lgtv-connect', (req, res) => {
        if (!status || status === 'Close') {
            lgtv = require('lgtv2')({
                url: 'wss://' + req.query.host + ':3001',
                saveKey(key, cb) {
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

            setTimeout(() => {
                lgtv.disconnect();
                status = '';
            }, 31000);

            lgtv.on('connecting', () => {
                status = 'Connecting';
            });

            lgtv.on('connect', () => {
                lgtv.disconnect();
                status = 'Connected';
            });

            lgtv.on('error', e => {
                status = 'Error: ' + e.code.toLowerCase();
            });

            lgtv.on('prompt', () => {
                status = 'Please answer the prompt on your TV';
            });
        }

        res.status(200).send(JSON.stringify({
            state: status,
            token
        }));
    });

    RED.nodes.registerType('lgtv-config', LgtvConfigNode, {
        credentials: {
            token: {type: 'text'}
        }
    });
};
