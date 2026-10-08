const {selectTv} = require('./lib/tv-select.js');

module.exports = function (RED) {
    function LgtvRequestNode(n) {
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
                if (typeof msg.topic !== 'string' || !msg.topic) {
                    node.error(new Error('msg.topic must be the ssap:// uri'), msg);
                    return;
                }
                const tv = selectTv(RED, node, msg);
                if (!tv) {
                    return;
                }
                const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
                tv.request(msg.topic, payload, (err, res) => {
                    if (err) {
                        // errors from the TV (e.g. 404 no such service) arrive with code ESSAP
                        node.error(err, msg);
                    } else {
                        msg.payload = res;
                        node.send(msg);
                    }
                });
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-request', LgtvRequestNode);
};
