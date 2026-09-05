const VIDEO_ID = /^[\w-]{11}$/;

module.exports = function (RED) {
    function LgtvYoutubeNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.passthru = n.passthru;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', (done) => {
                node.tvConn.deregister(node, done);
            });

            node.on('input', (msg) => {
                const value = String(msg.payload).trim();
                // a video id is launched via contentId, a full URL is handed to the app as contentTarget
                const payload = VIDEO_ID.test(value)
                    ? {id: 'youtube.leanback.v4', contentId: value}
                    : {id: 'youtube.leanback.v4', params: {contentTarget: value}};
                node.tvConn.request('ssap://system.launcher/launch', payload, (err) => {
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

    RED.nodes.registerType('lgtv-youtube', LgtvYoutubeNode);
};
