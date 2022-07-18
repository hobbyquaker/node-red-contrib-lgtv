module.exports = function (RED) {
    function LgtvYoutubeNode(n) {
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

            node.on('input', msg => {
                node.tvConn.request('ssap://com.webos.applicationManager/launch', {
                    id: 'youtube.leanback.v4',
                    'params': {
                        'contentTarget': 'https://www.youtube.com/tv?v=' + msg.payload
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-youtube', LgtvYoutubeNode);
};
