module.exports = function (RED) {
    function LgtvControlNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            const onConnect = () => {
                node.send({payload: true});
            };
            const onClose = () => {
                node.send({payload: false});
            };
            node.tvConn.on('tvconnect', onConnect);
            node.tvConn.on('tvclose', onClose);

            this.on('close', (done) => {
                node.tvConn.removeListener('tvconnect', onConnect);
                node.tvConn.removeListener('tvclose', onClose);
                node.tvConn.deregister(node, done);
            });

            node.on('input', (msg) => {
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
                        node.tvConn.wake((err) => {
                            if (err) {
                                node.error(err, msg);
                            }
                        });
                        return;

                    default:
                        node.warn('unknown command: ' + msg.payload);
                        return;
                }

                node.tvConn.request(url, (err) => {
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
