// lgtv2 >= 2.0 is an ES module; require() returns the constructor via require(esm) (Node >= 20.19)
const LGTV = require('lgtv2');

const PAIRING_TIMEOUT = 31000;

/**
 * lgtv2 connection options from the config node's host/secure/port.
 * secure: 'auto' (default: try wss:3001, fall back to ws:3000) | 'wss' | 'ws'
 * port: overrides the port (and disables the automatic fallback)
 */
function connectionOptions(host, secure, port) {
    const options = {host};
    if (secure === 'wss') {
        options.secure = true;
    } else if (secure === 'ws') {
        options.secure = false;
    }
    port = parseInt(port, 10);
    if (port > 0) {
        options.port = port;
    }
    return options;
}

module.exports = function (RED) {
    // pairing attempts started from the editor's "Connect" button, keyed by config node id
    const pairings = new Map();

    function LgtvConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.host = config.host;
        node.secure = config.secure || 'auto';
        node.port = config.port;
        node.mac = config.mac;
        node.users = {};
        node.connected = false;
        node.buttonSocket = null;
        // many nodes listen for tvconnect/tvclose on one config node
        node.setMaxListeners(0);

        const subscriptions = {};

        const lgtv = new LGTV({
            ...connectionOptions(node.host, node.secure, node.port),
            // '' (instead of undefined) keeps lgtv2 from reading a key file - the key lives in the credentials
            clientKey: (node.credentials && node.credentials.token) || '',
            mac: node.mac || undefined,
            saveKey(key, cb) {
                lgtv.clientKey = key;
                RED.nodes.addCredentials(node.id, {token: key});
                if (typeof cb === 'function') {
                    cb();
                }
            },
        });

        lgtv.on('connecting', () => {
            node.setStatus('connecting');
        });

        lgtv.on('connect', () => {
            node.connected = true;
            node.setStatus('connect');

            Object.keys(subscriptions).forEach((url) => {
                lgtv.subscribe(url, (err, res) => {
                    node.subscriptionHandler(url, err, res);
                });
            });

            lgtv.getSocket('ssap://com.webos.service.networkinput/getPointerInputSocket', (err, sock) => {
                if (err) {
                    node.warn('pointer input socket: ' + err.message);
                } else {
                    node.buttonSocket = sock;
                }
            });

            node.emit('tvconnect');
        });

        lgtv.on('error', (err) => {
            node.connected = false;
            node.setStatus(err.code || err.message);
        });

        lgtv.on('close', () => {
            const wasConnected = node.connected;
            node.connected = false;
            node.buttonSocket = null;
            node.setStatus('close');
            if (wasConnected) {
                node.emit('tvclose');
            }
        });

        lgtv.on('prompt', () => {
            node.setStatus('prompt');
        });

        node.on('close', (removed, done) => {
            lgtv.disconnect(() => done());
        });

        this.subscriptionHandler = function (url, err, res) {
            if (subscriptions[url]) {
                Object.keys(subscriptions[url]).forEach((id) => {
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
            if (typeof payload === 'function') {
                callback = payload;
                payload = undefined;
            }
            if (!node.connected) {
                if (typeof callback === 'function') {
                    callback(new Error('not connected to ' + node.host));
                }
                return;
            }
            lgtv.request(url, payload || {}, (err, res) => {
                if (typeof callback === 'function') {
                    callback(err, res);
                }
            });
        };

        // Wake-on-LAN; uses the configured MAC or the ones lgtv2 learned from the TV
        this.wake = function (callback) {
            lgtv.wake().then(
                () => callback(),
                (err) => callback(err),
            );
        };

        this.register = function (lgtvNode) {
            node.users[lgtvNode.id] = lgtvNode;
            lgtvNode.status(node.statusObject());
        };

        this.deregister = function (lgtvNode, done) {
            delete node.users[lgtvNode.id];
            Object.keys(subscriptions).forEach((url) => {
                delete subscriptions[url][lgtvNode.id];
            });
            if (typeof done === 'function') {
                done();
            }
        };

        let status = 'connecting';

        this.statusObject = function () {
            switch (status) {
                case 'connecting':
                    return {fill: 'yellow', shape: 'ring', text: 'node-red:common.status.connecting'};
                case 'prompt':
                    return {fill: 'yellow', shape: 'ring', text: 'accept the prompt on the TV'};
                case 'connect':
                    return {fill: 'green', shape: 'dot', text: 'node-red:common.status.connected'};
                case 'close':
                    return {fill: 'red', shape: 'ring', text: 'node-red:common.status.disconnected'};
                default:
                    return {fill: 'red', shape: 'ring', text: String(status)};
            }
        };

        this.setStatus = function (s) {
            status = s;
            const statusObject = node.statusObject();
            Object.keys(node.users).forEach((id) => {
                node.users[id].status(statusObject);
            });
        };
    }

    // Pairing from the editor: the editor polls this endpoint until a token arrives, then stores it as credential.
    RED.httpAdmin.get('/lgtv-connect', RED.auth.needsPermission('lgtv-config.write'), (req, res) => {
        const {id, host, secure, port} = req.query;
        if (!id || !host) {
            res.status(400).json({error: 'id and host are required'});
            return;
        }

        // a successful pairing is reported until it expires; a failed one is retried
        let pairing = pairings.get(id);
        if (!pairing || (pairing.finished && !pairing.token)) {
            pairing = startPairing(id, connectionOptions(host, secure, port));
        }

        res.json({state: pairing.state, token: pairing.token});
    });

    function startPairing(id, options) {
        const pairing = {state: 'Connecting', token: undefined, finished: false};
        pairings.set(id, pairing);

        const lgtv = new LGTV({
            ...options,
            clientKey: '',
            reconnect: false,
            learnMac: false,
            saveKey(key, cb) {
                pairing.token = key;
                pairing.state = 'Connected';
                cb();
            },
        });

        const finish = () => {
            if (pairing.finished) {
                return;
            }
            pairing.finished = true;
            clearTimeout(timer);
            lgtv.disconnect(() => {});
            // keep the result around for the polling editor, then forget it
            setTimeout(() => {
                if (pairings.get(id) === pairing) {
                    pairings.delete(id);
                }
            }, 60000).unref();
        };

        const timer = setTimeout(() => {
            if (!pairing.token) {
                pairing.state = 'Timeout';
            }
            finish();
        }, PAIRING_TIMEOUT);

        lgtv.on('connecting', () => {
            pairing.state = 'Connecting';
        });
        lgtv.on('prompt', () => {
            pairing.state = 'Please accept the prompt on your TV';
        });
        lgtv.on('error', (err) => {
            pairing.state = 'Error: ' + (err.code || err.message);
        });
        lgtv.on('connect', () => {
            // saveKey is called right after connect; finish once the token is stored
            setImmediate(finish);
        });

        return pairing;
    }

    RED.nodes.registerType('lgtv-config', LgtvConfigNode, {
        credentials: {
            token: {type: 'text'},
        },
    });
};
