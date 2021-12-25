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

            node.on('input', message => {
                node.tvConn.request(message.topic, message.payload, (err, response) => {
                    if (!err) {
                        node.send({payload: response});
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-request', LgtvRequestNode);
};
