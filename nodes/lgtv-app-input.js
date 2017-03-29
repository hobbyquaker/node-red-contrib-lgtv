module.exports = function (RED) {

    function LgtvAppInputNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);


            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            node.tvConn.subscribe(node.id, 'ssap://com.webos.applicationManager/getForegroundAppInfo', function (err, res) {
                if (res.appId) node.send({payload: res.appId});
            });

        } else {
            this.error('No TV Configuration');
        }

    }
    RED.nodes.registerType('lgtv-app-input', LgtvAppInputNode);
};