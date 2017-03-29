module.exports = function (RED) {

    function LgtvChannelInputNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;
        this.payloadType = n.payloadType;

        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            node.tvConn.subscribe(node.id, 'ssap://tv/getCurrentChannel', function (err, res) {
                console.log('channel', res);
                res.payload = res[node.payloadType];
                node.send(res);
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-channel-input', LgtvChannelInputNode);
};
