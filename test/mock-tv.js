/**
 * Minimal in-process mock of a webOS TV's SSAP websocket endpoint, adapted from the lgtv2 test suite.
 * Just enough protocol to exercise the nodes without a real TV.
 *
 * Plain ws:// on a random port (the config node is pointed at it with secure 'ws' + port); the
 * pointer input socket gets its own random port.
 */

const {WebSocketServer} = require('ws');

const CLIENT_KEY = 'mock-client-key-0123456789abcdef';

function createMockTv(options = {}) {
    const opts = Object.assign(
        {
            port: 0,
            acceptKeys: [CLIENT_KEY],
            // 'accept' | 'prompt-then-accept' | 'reject'
            pairing: 'prompt-then-accept',
            volumeShape: 'old', // 'old' (volume/muted/changed) | 'new' (volumeStatus, webOS 6+)
            foregroundApp: 'com.webos.app.livetv',
        },
        options,
    );

    const wss = new WebSocketServer({host: '127.0.0.1', port: opts.port});
    const pointerServer = new WebSocketServer({host: '127.0.0.1', port: 0});
    const pointer = []; // raw text frames received on the pointer input socket
    const pointerSockets = new Set();
    pointerServer.on('connection', (ws) => {
        pointerSockets.add(ws);
        ws.on('close', () => pointerSockets.delete(ws));
        ws.on('message', (raw) => pointer.push(raw.toString()));
    });

    const sockets = new Set();
    const received = []; // every parsed message from the client
    const subscriptions = new Map(); // socket -> Map(uri -> Set(cid))
    let volume = 7;
    let muted = false;
    let channel = {channelId: '1_10_5_0_0_1_1', channelNumber: '5', channelName: 'Mock TV'};

    function send(ws, obj) {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(obj));
        }
    }

    function volumePayload(subscribed) {
        if (opts.volumeShape === 'new') {
            return {
                returnValue: true,
                callerId: 'secondscreen.client',
                volumeStatus: {volume, muteStatus: muted, soundOutput: 'tv_speaker', maxVolume: 100},
            };
        }
        return {returnValue: true, subscribed, volume, muted, changed: []};
    }

    function notify(uri, payloadFn) {
        for (const [sock, byUri] of subscriptions) {
            for (const cid of byUri.get(uri) || []) {
                send(sock, {id: cid, type: 'response', payload: payloadFn()});
            }
        }
    }

    wss.on('connection', (ws) => {
        sockets.add(ws);
        subscriptions.set(ws, new Map());
        ws.on('close', () => {
            sockets.delete(ws);
            subscriptions.delete(ws);
        });
        ws.on('message', (raw) => {
            const msg = JSON.parse(raw.toString());
            received.push(msg);
            const {id, type, uri, payload} = msg;

            if (type === 'register') {
                const key = payload && payload['client-key'];
                if (key && opts.acceptKeys.includes(key)) {
                    send(ws, {id, type: 'registered', payload: {'client-key': key}});
                    return;
                }
                if (opts.pairing === 'reject') {
                    send(ws, {id, type: 'error', error: '403 cancelled'});
                    return;
                }
                if (opts.pairing === 'accept') {
                    send(ws, {id, type: 'registered', payload: {'client-key': CLIENT_KEY}});
                    return;
                }
                send(ws, {id, type: 'response', payload: {pairingType: 'PROMPT', returnValue: true}});
                setTimeout(() => send(ws, {id, type: 'registered', payload: {'client-key': CLIENT_KEY}}), 20);
                return;
            }

            if (type === 'unsubscribe') {
                for (const cids of subscriptions.get(ws).values()) {
                    cids.delete(id);
                }
                return;
            }

            if (type !== 'request' && type !== 'subscribe') {
                return;
            }

            if (type === 'subscribe') {
                const byUri = subscriptions.get(ws);
                if (!byUri.has(uri)) {
                    byUri.set(uri, new Set());
                }
                byUri.get(uri).add(id);
            }

            const ok = (extra) => send(ws, {id, type: 'response', payload: Object.assign({returnValue: true}, extra)});

            switch (uri) {
                case 'ssap://audio/getVolume':
                    send(ws, {id, type: 'response', payload: volumePayload(type === 'subscribe')});
                    break;
                case 'ssap://audio/setVolume':
                    volume = payload.volume;
                    ok();
                    notify('ssap://audio/getVolume', () => volumePayload(true));
                    break;
                case 'ssap://audio/setMute':
                    muted = payload.mute;
                    ok();
                    notify('ssap://audio/getVolume', () => volumePayload(true));
                    break;
                case 'ssap://com.webos.applicationManager/getForegroundAppInfo':
                    ok({appId: opts.foregroundApp, subscribed: type === 'subscribe'});
                    break;
                case 'ssap://tv/getCurrentChannel':
                    ok(Object.assign({subscribed: type === 'subscribe'}, channel));
                    break;
                case 'ssap://tv/openChannel':
                    channel = Object.assign({}, channel, payload);
                    ok();
                    notify('ssap://tv/getCurrentChannel', () => Object.assign({returnValue: true}, channel));
                    break;
                case 'ssap://com.webos.service.networkinput/getPointerInputSocket':
                    ok({socketPath: 'ws://127.0.0.1:' + pointerServer.address().port + '/resources/pointer'});
                    break;
                case 'ssap://com.webos.service.connectionmanager/getinfo':
                    ok({
                        subscribed: false,
                        wiredInfo: {macAddress: opts.wiredMac || '74:E6:B8:44:0A:7E'},
                        wifiInfo: {macAddress: opts.wifiMac || '20:28:BC:1B:5F:46'},
                    });
                    break;
                case 'ssap://api/getServiceList':
                    ok({services: [{name: 'api', version: 1}]});
                    break;
                case 'ssap://system.launcher/launch':
                case 'ssap://system.launcher/open':
                case 'ssap://system.launcher/close':
                case 'ssap://system.notifications/createToast':
                case 'ssap://system/turnOff':
                case 'ssap://media.controls/play':
                case 'ssap://media.controls/pause':
                    ok();
                    break;
                case 'ssap://test/returnValueFalse':
                    send(ws, {
                        id,
                        type: 'response',
                        payload: {returnValue: false, errorCode: -101, errorText: 'Invalid app id'},
                    });
                    break;
                default:
                    send(ws, {id, type: 'error', error: '404 no such service or method', payload: {}});
            }
        });
    });

    return new Promise((resolve, reject) => {
        wss.on('error', reject);
        let pending = 2;
        const ready = () => {
            if (--pending > 0) {
                return;
            }
            const {port} = wss.address();
            resolve({
                port,
                url: 'ws://127.0.0.1:' + port,
                received,
                pointer,
                /** messages the client sent for one uri */
                requests(uri) {
                    return received.filter((m) => m.uri === uri);
                },
                get connections() {
                    return sockets.size;
                },
                get pointerConnections() {
                    return pointerSockets.size;
                },
                setForegroundApp(appId) {
                    opts.foregroundApp = appId;
                    notify('ssap://com.webos.applicationManager/getForegroundAppInfo', () => ({
                        returnValue: true,
                        appId,
                    }));
                },
                setVolume(v) {
                    volume = v;
                    notify('ssap://audio/getVolume', () => volumePayload(true));
                },
                setMuted(m) {
                    muted = m;
                    notify('ssap://audio/getVolume', () => volumePayload(true));
                },
                dropAll() {
                    for (const ws of sockets) {
                        ws.terminate();
                    }
                },
                close() {
                    return new Promise((res) => {
                        for (const ws of sockets) {
                            ws.terminate();
                        }
                        for (const ws of pointerSockets) {
                            ws.terminate();
                        }
                        wss.close(() => pointerServer.close(() => res()));
                    });
                },
            });
        };
        wss.on('listening', ready);
        pointerServer.on('listening', ready);
    });
}

module.exports = {createMockTv, CLIENT_KEY};
