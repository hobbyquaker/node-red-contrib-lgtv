module.exports = function (RED) {
    function LgtvAppNode(n) {
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

            if (node._wireCount) {
                node.tvConn.subscribe(node.id, 'ssap://com.webos.applicationManager/getForegroundAppInfo', (err, response) => {
                    if (!err && response && response.appId) {
                        node.send({payload: response.appId});
                    }
                });
            }

            node.on('input', message => {
                message.payload = String(message.payload);
                node.tvConn.request('ssap://system.launcher/launch', {id: message.payload}, (err, response) => {
                    if (!err && !response.errorCode && node.passthru) {
                        node.send(message);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-app', LgtvAppNode);
};
