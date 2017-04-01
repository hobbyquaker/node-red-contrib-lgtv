module.exports = function (RED) {
    function LgtvRequestNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;

        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            node.on('input', function (msg) {
                node.tvConn.request(msg.topic, msg.payload, function (err, res) {
                    if (!err) {
                        node.send({payload: res});
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }
    RED.nodes.registerType('lgtv-request', LgtvRequestNode);
};
