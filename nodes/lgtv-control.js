module.exports = function (RED) {
    function LgtvControlNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', function (done) {
                node.tvConn.deregister(node, done);
            });

            node.on('input', function (msg) {
                var url;

                switch (msg.payload) {
                    case 'play':
                    case 'pause':
                    case 'stop':
                    case 'rewind':
                    case 'fastForward':
                        url = 'ssap://media.controls/' + msg.payload;
                        break;

                    case 'set3DOn':
                    case 'set3DOff':
                        url = 'ssap://com.webos.service.tv.display/' + msg.payload;
                        break;

                    case 'volumeUp':
                    case 'volumeDown':
                        url = 'ssap://audio/' + msg.payload;
                        break;

                    case 'channelUp':
                    case 'channelDown':
                        url = 'ssap://tv/' + msg.payload;
                        break;

                    case 'turnOff':
                        url = 'ssap://system/' + msg.payload;
                        break;

                    case 'sendEnterKey':
                    case 'deleteCharacters':
                        url = 'ssap://com.webos.service.ime/' + msg.payload;
                        break;

                    default:
                }
                if (url) {
                    node.tvConn.request(url);
                }
            });

            node.tvConn.on('tvconnect', function () {
                node.send({payload: true});
            });

            node.tvConn.on('tvclose', function () {
                node.send({payload: false});
            });
        } else {
            this.error('No TV Configuration');
        }
    }
    RED.nodes.registerType('lgtv-control', LgtvControlNode);
};
