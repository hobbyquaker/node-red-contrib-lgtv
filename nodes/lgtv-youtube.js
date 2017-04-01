module.exports = function (RED) {
    function LgtvYoutubeNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;
        this.passthru = n.passthru;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            node.on('input', function (msg) {
                node.tvConn.request('ssap://system.launcher/launch', {id: 'youtube.leanback.v4', contentId: msg.payload});
            });
        } else {
            this.error('No TV Configuration');
        }
    }
    RED.nodes.registerType('lgtv-youtube', LgtvYoutubeNode);
};
