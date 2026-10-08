const {selectTv} = require('./lib/tv-select.js');

module.exports = function (RED) {
    function LgtvButtonNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', (done) => {
                node.tvConn.deregister(node, done);
            });

            node.on('input', (msg) => {
                // 0 is a valid button, so don't test for truthiness
                if (msg.payload === undefined || msg.payload === null || msg.payload === '') {
                    return;
                }
                const tv = selectTv(RED, node, msg);
                if (!tv) {
                    return;
                }
                if (!tv.buttonSocket) {
                    node.error(new Error('not connected to ' + tv.host), msg);
                    return;
                }
                tv.buttonSocket.send('button', {name: String(msg.payload).toUpperCase()});
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-button', LgtvButtonNode);
};
