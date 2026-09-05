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

            const sendChannel = (res) => {
                res.payload = res[node.payloadType];
                node.send(res);
            };

            const onConnect = () => {
                node.tvConn.request('ssap://com.webos.applicationManager/getForegroundAppInfo', (err, res) => {
                    if (!err && res && res.appId === 'com.webos.app.livetv') {
                        node.tvConn.request('ssap://tv/getCurrentChannel', (err, res) => {
                            if (!err && res) {
                                sendChannel(res);
                            }
                        });
                    }
                });
            };

            this.on('close', (done) => {
                node.tvConn.removeListener('tvconnect', onConnect);
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                node.tvConn.subscribe(
                    node.id,
                    'ssap://com.webos.applicationManager/getForegroundAppInfo',
                    (err, res) => {
                        if (!err && res && res.appId === 'com.webos.app.livetv') {
                            setTimeout(() => {
                                node.tvConn.subscribe(node.id, 'ssap://tv/getCurrentChannel', (err, res) => {
                                    if (!err && res) {
                                        sendChannel(res);
                                    }
                                });
                            }, 1000);
                        }
                    },
                );

                node.tvConn.on('tvconnect', onConnect);
            }

            node.on('input', (msg) => {
                // a number selects by channel number, a string is the channelId
                const payload =
                    typeof msg.payload === 'number'
                        ? {channelNumber: String(msg.payload)}
                        : {channelId: String(msg.payload)};
                node.tvConn.request('ssap://tv/openChannel', payload, (err) => {
                    if (err) {
                        node.error(err, msg);
                    } else if (node.passthru) {
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
