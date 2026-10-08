const LGTV = require('lgtv2');
const {selectTv} = require('./lib/tv-select.js');

const POWER_STATE_URL = 'ssap://com.webos.service.tvpower/power/getPowerState';

module.exports = function (RED) {
    function LgtvControlNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            const onConnect = () => {
                node.send([{payload: true}, null]);
            };
            const onClose = () => {
                node.send([{payload: false}, null]);
            };
            // called by the config node on register when the TV is already connected (deploy while connected)
            node.onTvConnect = onConnect;
            this.tvConn.register(node);

            node.tvConn.on('tvconnect', onConnect);
            node.tvConn.on('tvclose', onClose);

            // second output: the TV's power state (lgtv2 maps it to on/standby/screen_off/screen_saver/off/unknown)
            if (Array.isArray(n.wires) && Array.isArray(n.wires[1]) && n.wires[1].length) {
                node.tvConn.subscribe(node.id, POWER_STATE_URL, (err, res) => {
                    if (!err && res && res.state) {
                        node.send([null, {payload: LGTV.POWER_STATES[res.state] || 'unknown', raw: res}]);
                    }
                });
            }

            this.on('close', (done) => {
                node.tvConn.removeListener('tvconnect', onConnect);
                node.tvConn.removeListener('tvclose', onClose);
                node.tvConn.deregister(node, done);
            });

            node.on('input', (msg) => {
                const tv = selectTv(RED, node, msg);
                if (!tv) {
                    return;
                }
                let url;

                switch (msg.payload) {
                    case 'play':
                    case 'pause':
                    case 'stop':
                    case 'rewind':
                    case 'fastForward':
                        url = 'ssap://media.controls/' + msg.payload;
                        break;

                    case 'set3DOn':
                    case 'set3DOff':
                        url = 'ssap://com.webos.service.tv.display/' + msg.payload;
                        break;

                    case 'volumeUp':
                    case 'volumeDown':
                        url = 'ssap://audio/' + msg.payload;
                        break;

                    case 'channelUp':
                    case 'channelDown':
                        url = 'ssap://tv/' + msg.payload;
                        break;

                    case 'turnOff':
                        url = 'ssap://system/turnOff';
                        break;

                    case 'turnOnScreen':
                    case 'turnOffScreen':
                        url = 'ssap://com.webos.service.tvpower/power/' + msg.payload;
                        break;

                    case 'sendEnterKey':
                    case 'deleteCharacters':
                        url = 'ssap://com.webos.service.ime/' + msg.payload;
                        break;

                    case 'turnOn':
                        // the TV is unreachable while off: Wake-on-LAN instead of an API call
                        tv.wake((err) => {
                            if (err) {
                                node.error(err, msg);
                            }
                        });
                        return;

                    default:
                        node.warn('unknown command: ' + msg.payload);
                        return;
                }

                tv.request(url, (err) => {
                    if (err) {
                        node.error(err, msg);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-control', LgtvControlNode);
};
