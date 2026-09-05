module.exports = function (RED) {
    function LgtvBrowserNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.passthru = n.passthru;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', (done) => {
                node.tvConn.deregister(node, done);
            });

            node.on('input', (msg) => {
                const done = (err) => {
                    if (err) {
                        node.error(err, msg);
                    } else if (node.passthru) {
                        node.send(msg);
                    }
                };
                if (msg.payload) {
                    node.tvConn.request('ssap://system.launcher/open', {target: String(msg.payload)}, done);
                } else {
                    node.tvConn.request('ssap://system.launcher/close', {id: 'com.webos.app.browser'}, done);
                }
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-browser', LgtvBrowserNode);
};
