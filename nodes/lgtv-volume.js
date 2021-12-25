module.exports = function (RED) {
    function LgtvVolumeNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.passthru = n.passthru;

        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', done => {
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                node.tvConn.subscribe(node.id, 'ssap://audio/getVolume', (err, response) => {
                    if (!err && response && response && response.changed.includes('volume')) {
                        node.send({payload: response.volume});
                    }
                });

                node.tvConn.on('tvconnect', () => {
                    node.tvConn.request('ssap://audio/getVolume', (err, response) => {
                        if (!err && response) {
                            node.send({payload: response.volume});
                        }
                    });
                });
            }

            node.on('input', message => {
                message.payload = Number.parseInt(message.payload, 10) || 0;
                if (message.payload > 100) {
                    message.payload = 100;
                } else if (message.payload < 0) {
                    message.payload = 0;
                }

                node.tvConn.request('ssap://audio/setVolume', {volume: message.payload}, (err, response) => {
                    if (!err && !response.errorCode && node.passthru) {
                        node.send(message);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-volume', LgtvVolumeNode);
};
