module.exports = function (RED) {
    function LgtvMouseNode(n) {
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
                if (!node.tvConn.buttonSocket) {
                    return;
                }
                switch (msg.topic) {
                    case 'drag':
                        if (msg.payload) {
                            node.tvConn.buttonSocket.send('drag', {dx: msg.payload.dx, dy: msg.payload.dy, drag: 1});
                        }
                        break;
                    case 'move':
                        if (msg.payload) {
                            node.tvConn.buttonSocket.send('move', {dx: msg.payload.dx, dy: msg.payload.dy});
                        }
                        break;
                    case 'click':
                        node.tvConn.buttonSocket.send('click');
                        break;
                    default:
                }
            });
        } else {
            this.error('No TV Configuration');
        }
    }
    RED.nodes.registerType('lgtv-mouse', LgtvMouseNode);
};
