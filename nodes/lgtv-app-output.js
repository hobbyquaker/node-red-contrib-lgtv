module.exports = function (RED) {

    function LgtvAppOutputNode(n) {
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
                node.tvConn.request('ssap://system.launcher/launch', {id: msg.payload});
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-app-output', LgtvAppOutputNode);
};