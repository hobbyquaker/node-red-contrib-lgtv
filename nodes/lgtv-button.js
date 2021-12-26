module.exports = function (RED) {
    function LgtvButtonNode(n) {
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
                if (message.payload && node.tvConn.buttonSocket) {
                    node.tvConn.buttonSocket.send('button', {name: (String(message.payload)).toUpperCase()});
                }
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-button', LgtvButtonNode);
};
