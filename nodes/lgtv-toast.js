module.exports = function (RED) {
    function LgtvToastNode(n) {
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
                const payload = {message: message.payload};
                if (message.url) {
                    payload.onClick = {target: message.url};
                }

                node.tvConn.request('palm://system.notifications/createToast', payload);
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-toast', LgtvToastNode);
};
