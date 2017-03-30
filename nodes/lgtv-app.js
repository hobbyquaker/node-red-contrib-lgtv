module.exports = function (RED) {

    function LgtvAppNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                node.tvConn.subscribe(node.id, 'ssap://com.webos.applicationManager/getForegroundAppInfo', function (err, res) {
                    if (res.appId) node.send({payload: res.appId});
                });
            }

            node.on('input', function (msg) {
                node.tvConn.request('ssap://system.launcher/launch', {id: msg.payload});
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-app', LgtvAppNode);
};
