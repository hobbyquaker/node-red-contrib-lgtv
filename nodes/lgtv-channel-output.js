module.exports = function (RED) {

    function LgtvChannelOutputNode(n) {
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
                // FIXME
                node.tvConn.request('ssap://tv/openChannel', {channelNumber: msg.payload});
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-channel-output', LgtvChannelOutputNode);
};