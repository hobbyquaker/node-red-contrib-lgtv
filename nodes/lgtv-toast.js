module.exports = function (RED) {

    function LgtvToastNode(n) {
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
                var payload = {message: msg.payload};
                if (msg.url) payload.onClick = {target: msg.url};
                node.tvConn.request('palm://system.notifications/createToast', payload);
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-toast', LgtvToastNode);
};
