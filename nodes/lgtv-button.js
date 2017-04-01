module.exports = function (RED) {
    function LgtvButtonNode(n) {
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
                if (msg.payload && node.tvConn.buttonSocket) {
                    node.tvConn.buttonSocket.send('button', {name: (String(msg.payload)).toUpperCase()});
                }
            });
        } else {
            this.error('No TV Configuration');
        }
    }
    RED.nodes.registerType('lgtv-button', LgtvButtonNode);
};
