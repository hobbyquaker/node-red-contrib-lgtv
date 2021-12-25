module.exports = function (RED) {
    function LgtvControlNode(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        this.tv = n.tv;
        this.tvConn = RED.nodes.getNode(this.tv);

        if (this.tvConn) {
            this.tvConn.register(node);

            this.on('close', done => {
                node.tvConn.deregister(node, done);
            });

            node.on('input', message => {
                let url;

                switch (message.payload) {
                    case 'play':
                    case 'pause':
                    case 'stop':
                    case 'rewind':
                    case 'fastForward':
                        url = 'ssap://media.controls/' + message.payload;
                        break;

                    case 'set3DOn':
                    case 'set3DOff':
                        url = 'ssap://com.webos.service.tv.display/' + message.payload;
                        break;

                    case 'volumeUp':
                    case 'volumeDown':
                        url = 'ssap://audio/' + message.payload;
                        break;

                    case 'channelUp':
                    case 'channelDown':
                        url = 'ssap://tv/' + message.payload;
                        break;

                    case 'turnOff':
                    case 'turnOn':
                        url = 'ssap://system/' + message.payload;
                        break;

                    case 'sendEnterKey':
                    case 'deleteCharacters':
                        url = 'ssap://com.webos.service.ime/' + message.payload;
                        break;

                    default:
                }

                if (url) {
                    node.tvConn.request(url);
                }
            });

            node.tvConn.on('tvconnect', () => {
                node.send({payload: true});
            });

            node.tvConn.on('tvclose', () => {
                node.send({payload: false});
            });
        } else {
            this.error('No TV Configuration');
        }
    }

    RED.nodes.registerType('lgtv-control', LgtvControlNode);
};
