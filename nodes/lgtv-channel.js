module.exports = function (RED) {
    function LgtvChannelNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.payloadType = n.payloadType;
        this.passthru = n.passthru;

        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', done => {
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                node.tvConn.subscribe(node.id, 'ssap://com.webos.applicationManager/getForegroundAppInfo', (err, res) => {
                    if (!err && res && res.appId === 'com.webos.app.livetv') {
                        setTimeout(() => {
                            node.tvConn.subscribe(node.id, 'ssap://tv/getCurrentChannel', (err, res) => {
                                if (!err && res) {
                                    res.payload = res[node.payloadType];
                                    node.send(res);
                                }
                            });
                        }, 1000);
                    }
                });

                node.tvConn.on('tvconnect', () => {
                    node.tvConn.request('ssap://com.webos.applicationManager/getForegroundAppInfo', (err, res) => {
                        if (!err && res && res.appId === 'com.webos.app.livetv') {
                            node.tvConn.request('ssap://tv/getCurrentChannel', (err, res) => {
                                if (!err && res) {
                                    res.payload = res[node.payloadType];
                                    node.send(res);
                                }
                            });
                        }
                    });
                });
            }

            node.on('input', msg => {
                node.tvConn.request('ssap://tv/openChannel', {channelId: msg.payload}, (err, res) => {
                    if (!err && !res.errorCode && node.passthru) {
                        node.send(msg);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-channel', LgtvChannelNode);
};
