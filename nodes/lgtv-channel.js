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
                node.tvConn.subscribe(node.id, 'ssap://com.webos.applicationManager/getForegroundAppInfo', (err, response) => {
                    if (!err && response && response.appId === 'com.webos.app.livetv') {
                        setTimeout(() => {
                            node.tvConn.subscribe(node.id, 'ssap://tv/getCurrentChannel', (err, currentChannelResponse) => {
                                if (!err && currentChannelResponse) {
                                    currentChannelResponse.payload = currentChannelResponse[node.payloadType];
                                    node.send(currentChannelResponse);
                                }
                            });
                        }, 1000);
                    }
                });

                node.tvConn.on('tvconnect', () => {
                    node.tvConn.request('ssap://com.webos.applicationManager/getForegroundAppInfo', (err, response) => {
                        if (!err && response && response.appId === 'com.webos.app.livetv') {
                            node.tvConn.request('ssap://tv/getCurrentChannel', (err, currentChannelResponse) => {
                                if (!err && currentChannelResponse) {
                                    currentChannelResponse.payload = currentChannelResponse[node.payloadType];
                                    node.send(currentChannelResponse);
                                }
                            });
                        }
                    });
                });
            }

            node.on('input', message => {
                node.tvConn.request('ssap://tv/openChannel', {channelId: message.payload}, (err, openChannelResponse) => {
                    if (!err && !openChannelResponse.errorCode && node.passthru) {
                        node.send(message);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-channel', LgtvChannelNode);
};
