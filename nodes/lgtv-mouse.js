module.exports = function (RED) {
    function LgtvMouseNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', (done) => {
                node.tvConn.deregister(node, done);
            });

            node.on('input', (msg) => {
                const socket = node.tvConn.buttonSocket;
                if (!socket) {
                    node.error(new Error('not connected to ' + node.tvConn.host), msg);
                    return;
                }

                switch (msg.topic) {
                    case 'drag':
                        if (msg.payload) {
                            socket.send('drag', {dx: msg.payload.dx, dy: msg.payload.dy, drag: 1});
                        }
                        break;
                    case 'move':
                        if (msg.payload) {
                            socket.send('move', {dx: msg.payload.dx, dy: msg.payload.dy});
                        }
                        break;
                    case 'scroll':
                        if (msg.payload) {
                            socket.send('scroll', {dx: msg.payload.dx || 0, dy: msg.payload.dy || 0});
                        }
                        break;
                    case 'click':
                        socket.send('click');
                        break;
                    default:
                        node.warn('unknown topic: ' + msg.topic);
                }
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-mouse', LgtvMouseNode);
};
