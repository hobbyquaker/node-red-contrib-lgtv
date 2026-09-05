module.exports = function (RED) {
    function LgtvMuteNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);
        this.passthru = n.passthru;

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', (done) => {
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                // lgtv2 normalizes the payload to {volume, muted, changed} on every firmware; the first
                // response after (re)connect carries the current value, so no extra request is needed
                node.tvConn.subscribe(node.id, 'ssap://audio/getVolume', (err, res) => {
                    if (!err && res && Array.isArray(res.changed) && res.changed.includes('muted')) {
                        node.send({payload: res.muted});
                    }
                });
            }

            node.on('input', (msg) => {
                msg.payload = Boolean(msg.payload);
                node.tvConn.request('ssap://audio/setMute', {mute: msg.payload}, (err) => {
                    if (err) {
                        node.error(err, msg);
                    } else if (node.passthru) {
                        node.send(msg);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-mute', LgtvMuteNode);
};
