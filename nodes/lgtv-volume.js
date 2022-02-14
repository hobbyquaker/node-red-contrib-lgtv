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
                node.tvConn.subscribe(node.id, 'ssap://audio/getVolume', (err, res) => {
                    if (!err && res && res && res.changed && res.changed.indexOf('volume') !== -1) {
                        node.send({payload: res.volume});
                    }
                });

                node.tvConn.on('tvconnect', () => {
                    node.tvConn.request('ssap://audio/getVolume', (err, res) => {
                        if (!err && res) {
                            node.send({payload: res.volume});
                        }
                    });
                });
            }

            node.on('input', msg => {
                msg.payload = parseInt(msg.payload, 10) || 0;
                if (msg.payload > 100) {
                    msg.payload = 100;
                } else if (msg.payload < 0) {
                    msg.payload = 0;
                }

                node.tvConn.request('ssap://audio/setVolume', {volume: msg.payload}, (err, res) => {
                    if (!err && !res.errorCode && node.passthru) {
                        node.send(msg);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-volume', LgtvVolumeNode);
};
