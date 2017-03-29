module.exports = function (RED) {

    function LgtvMuteInputNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            node.tvConn.subscribe(node.id, 'ssap://audio/getVolume', function (err, res) {
                if (!err && res && res && res.changed.indexOf('muted') !== -1) {
                    node.send({payload: res.muted});
                }
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-mute-input', LgtvMuteInputNode);
};