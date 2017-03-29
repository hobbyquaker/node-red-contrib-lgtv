module.exports = function (RED) {

    function LgtvMuteOutputNode(n) {
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
                node.tvConn.request('ssap://audio/setMute', {mute: msg.payload});
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-mute-output', LgtvMuteOutputNode);
};