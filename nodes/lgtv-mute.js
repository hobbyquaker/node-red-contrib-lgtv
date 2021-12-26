module.exports = function (RED) {
    function LgtvMuteNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);
        this.passthru = n.passthru;

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', done => {
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                node.tvConn.subscribe(node.id, 'ssap://audio/getVolume', (err, response) => {
                    if (!err && response && response && response.changed.includes('muted')) {
                        node.send({payload: response.muted});
                    }
                });

                node.tvConn.on('tvconnect', () => {
                    node.tvConn.request('ssap://audio/getVolume', (err, response) => {
                        if (!err && response) {
                            node.send({payload: response.muted});
                        }
                    });
                });
            }

            node.on('input', message => {
                message.payload = Boolean(message.payload);
                node.tvConn.request('ssap://audio/setMute', {mute: message.payload}, (err, response) => {
                    if (!err && !response.errorCode && node.passthru) {
                        node.send(message);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-mute', LgtvMuteNode);
};
