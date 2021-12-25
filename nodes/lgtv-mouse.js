module.exports = function (RED) {
    function LgtvMouseNode(n) {
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
                if (!node.tvConn.buttonSocket) {
                    return;
                }

                switch (message.topic) {
                    case 'drag':
                        if (message.payload) {
                            node.tvConn.buttonSocket.send('drag', {dx: message.payload.dx, dy: message.payload.dy, drag: 1});
                        }

                        break;
                    case 'move':
                        if (message.payload) {
                            node.tvConn.buttonSocket.send('move', {dx: message.payload.dx, dy: message.payload.dy});
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
