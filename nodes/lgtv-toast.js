module.exports = function (RED) {
    function LgtvToastNode(n) {
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
                const payload = {message: String(msg.payload)};
                if (msg.url) {
                    payload.onClick = {target: msg.url};
                }
                if (msg.iconData) {
                    // base64 encoded image, or a Buffer e.g. from a file in node
                    payload.iconData = Buffer.isBuffer(msg.iconData)
                        ? msg.iconData.toString('base64')
                        : String(msg.iconData);
                    payload.iconExtension = msg.iconExtension || 'png';
                }

                node.tvConn.request('ssap://system.notifications/createToast', payload, (err) => {
                    if (err) {
                        node.error(err, msg);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-toast', LgtvToastNode);
};
