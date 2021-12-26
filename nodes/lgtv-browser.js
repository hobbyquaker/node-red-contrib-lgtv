module.exports = function (RED) {
    function LgtvBrowserNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.passthru = n.passthru;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', done => {
                node.tvConn.deregister(node, done);
            });

            node.on('input', message => {
                if (message.payload) {
                    node.tvConn.request('ssap://system.launcher/open', {target: message.payload});
                    node.tvConn.fullscreen();
                } else {
                    node.tvConn.request('ssap://system.launcher/close', {id: 'com.webos.app.browser'});
                }
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-browser', LgtvBrowserNode);
};
