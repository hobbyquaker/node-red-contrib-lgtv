module.exports = function (RED) {

    function LgtvVolumeNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                node.tvConn.subscribe(node.id, 'ssap://audio/getVolume', function (err, res) {
                    if (!err && res && res && res.changed.indexOf('volume') !== -1) {
                        node.send({payload: res.volume});
                    }
                });

                node.tvConn.on('tvconnect', function () {
                    node.tvConn.request('ssap://audio/getVolume', function (err, res) {
                        node.send({payload: res.volume});
                    });
                });
            }

            node.on('input', function (msg) {
                node.tvConn.request('ssap://audio/setVolume', {volume: msg.payload});
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-volume', LgtvVolumeNode);
};
