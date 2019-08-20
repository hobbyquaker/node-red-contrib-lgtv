module.exports = function (RED) {
    function LgtvRequestNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;

        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', done => {
                node.tvConn.deregister(node, done);
            });

            node.on('input', msg => {
                node.tvConn.request(msg.topic, msg.payload, (err, res) => {
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
