module.exports = function (RED) {
    function LgtvMuteNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);
        this.passthru = n.passthru;

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', done => {
                node.tvConn.deregister(node, done);
            });

            if (node._wireCount) {
                node.tvConn.subscribe(node.id, 'ssap://audio/getVolume', (err, res) => {
//                     if (!err && res && res && res.changed.indexOf('muted') !== -1) {
//                         node.send({payload: res.muted});
//                     }
                    if (!err && res) {
						if (res.muted !== undefined){
							node.send({payload: res.muted});
						}
                        if (res.volumeStatus !== undefined){
							node.send({payload: res.volumeStatus.muteStatus});
						}
                    }
                });

                node.tvConn.on('tvconnect', () => {
                    node.tvConn.request('ssap://audio/getVolume', (err, res) => {
                        if (!err && res) {
//                             node.send({payload: res.muted});
                            if (res.muted !== undefined){
								node.send({payload: res.muted});
							}
							if (res.volumeStatus !== undefined){
								node.send({payload: res.volumeStatus.muteStatus});
							}
                        }
                    });
                });
            }

            node.on('input', msg => {
                msg.payload = Boolean(msg.payload);
                node.tvConn.request('ssap://audio/setMute', {mute: msg.payload}, (err, res) => {
                    if (!err && !res.errorCode && node.passthru) {
                        node.send(msg);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-mute', LgtvMuteNode);
};
