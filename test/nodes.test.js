const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// keep lgtv2's mac/cert cache files out of the real home directory
process.env.LGTV2_KEY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'node-red-contrib-lgtv-test-'));

const helper = require('node-red-node-test-helper');
const {createMockTv, CLIENT_KEY} = require('./mock-tv.js');

helper.init(require.resolve('node-red'));

const nodeNames = [
    'config',
    'control',
    'button',
    'mouse',
    'toast',
    'browser',
    'youtube',
    'app',
    'volume',
    'mute',
    'channel',
    'request',
];
const nodes = nodeNames.map((n) => require('../nodes/lgtv-' + n + '.js'));

const HOST = '127.0.0.1';
const CREDENTIALS = {tv: {token: CLIENT_KEY}};

let mock;

/** config node pointed at the running mock TV */
function configNode(id = 'tv') {
    return {id, type: 'lgtv-config', host: HOST, secure: 'ws', port: String(mock.port)};
}

/** flow: one config node plus one node of the given type wired to a helper node */
function flowWith(type, extra = {}) {
    return [
        configNode(),
        Object.assign({id: 'n1', type: 'lgtv-' + type, tv: 'tv', wires: [['out']]}, extra),
        {id: 'out', type: 'helper'},
    ];
}

function waitFor(predicate, ms = 5000, what = 'condition') {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        (function check() {
            if (predicate()) {
                resolve();
            } else if (Date.now() - started > ms) {
                reject(new Error('timeout waiting for ' + what));
            } else {
                setTimeout(check, 20);
            }
        })();
    });
}

function nextMessage(node, ms = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout waiting for message')), ms);
        node.once('input', (msg) => {
            clearTimeout(timer);
            resolve(msg);
        });
    });
}

function nextError(node, ms = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout waiting for error')), ms);
        node.once('call:error', (call) => {
            clearTimeout(timer);
            resolve(call.args[0]);
        });
    });
}

function load(flow, credentials = CREDENTIALS) {
    return new Promise((resolve, reject) => {
        helper.load(nodes, flow, credentials, (err) => (err ? reject(err) : resolve()));
    });
}

async function loadConnected(flow, credentials) {
    await load(flow, credentials);
    const tv = helper.getNode('tv');
    await waitFor(() => tv.connected, 5000, 'tv connection');
    // the pointer socket is opened right after connect
    await waitFor(() => tv.buttonSocket, 5000, 'pointer socket');
    return tv;
}

test.describe('node-red-contrib-lgtv', () => {
    test.beforeEach(async () => {
        mock = await createMockTv();
    });

    test.afterEach(async () => {
        await helper.unload();
        await mock.close();
    });

    test('all nodes load and connect to the TV with a stored token (no pairing prompt)', async () => {
        const flow = [configNode()];
        for (const n of nodeNames.slice(1)) {
            flow.push({id: n, type: 'lgtv-' + n, tv: 'tv', wires: [[]]});
        }
        const tv = await loadConnected(flow);
        assert.equal(tv.host, HOST);
        const register = mock.received.find((m) => m.type === 'register');
        assert.equal(register.payload['client-key'], CLIENT_KEY);
        for (const n of nodeNames.slice(1)) {
            const node = helper.getNode(n);
            assert.ok(node, n + ' loaded');
            const last = node.status.lastCall && node.status.lastCall.args[0];
            assert.equal(last.fill, 'green', n + ' shows connected');
        }
    });

    test('pairs via the prompt and stores the new token in the credentials', async () => {
        await load(flowWith('control'), {});
        const tv = helper.getNode('tv');
        await waitFor(() => tv.connected, 5000, 'pairing');
        await waitFor(() => helper.credentials.get('tv') && helper.credentials.get('tv').token, 5000, 'token');
        assert.equal(helper.credentials.get('tv').token, CLIENT_KEY);
    });

    test('control: connection state output, commands and turnOn via wake', async () => {
        await load(flowWith('control'));
        const out = helper.getNode('out');
        const connected = await nextMessage(out);
        assert.equal(connected.payload, true);

        const n1 = helper.getNode('n1');
        n1.receive({payload: 'turnOff'});
        await waitFor(() => mock.requests('ssap://system/turnOff').length === 1, 2000, 'turnOff');
        n1.receive({payload: 'play'});
        await waitFor(() => mock.requests('ssap://media.controls/play').length === 1, 2000, 'play');

        // the MACs are learned after pairing, wake() sends magic packets without a configured MAC
        const tv = helper.getNode('tv');
        await waitFor(() => mock.requests('ssap://com.webos.service.connectionmanager/getinfo').length === 1);
        await new Promise((r) => setTimeout(r, 50));
        await new Promise((resolve, reject) => tv.wake((err) => (err ? reject(err) : resolve())));

        // connection lost → false
        mock.dropAll();
        const closed = await nextMessage(out);
        assert.equal(closed.payload, false);
    });

    test('control: unknown command warns, error while disconnected reaches the catch path', async () => {
        await loadConnected(flowWith('control'));
        const n1 = helper.getNode('n1');
        n1.receive({payload: 'doesNotExist'});
        await waitFor(() => n1.warn.called, 2000, 'warn');

        await mock.close();
        mock = await createMockTv(); // recreate so afterEach can close it
        const tv = helper.getNode('tv');
        await waitFor(() => !tv.connected, 5000, 'disconnect');
        const errPromise = nextError(n1);
        n1.receive({payload: 'pause'});
        const err = await errPromise;
        assert.match(String(err.message || err), /not connected/);
    });

    test('volume: clamps input, passes msg through, emits volume changes and the value on connect', async () => {
        await load(flowWith('volume', {passthru: true}));
        const out = helper.getNode('out');
        // initial value after connect
        const initial = await nextMessage(out);
        assert.equal(initial.payload, 7);

        const n1 = helper.getNode('n1');
        n1.receive({payload: '150'});
        const passed = await nextMessage(out);
        assert.equal(passed.payload, 100);
        assert.deepEqual(mock.requests('ssap://audio/setVolume')[0].payload, {volume: 100});
        // the TV confirms the new volume through the subscription
        const echoed = await nextMessage(out);
        assert.equal(echoed.payload, 100);

        mock.setVolume(42);
        const changed = await nextMessage(out);
        assert.equal(changed.payload, 42);
    });

    test('volume/mute: webOS 6 volumeStatus payloads are normalized by lgtv2', async () => {
        await mock.close();
        mock = await createMockTv({volumeShape: 'new'});
        await load([
            configNode(),
            {id: 'vol', type: 'lgtv-volume', tv: 'tv', wires: [['out1']]},
            {id: 'mute', type: 'lgtv-mute', tv: 'tv', wires: [['out2']]},
            {id: 'out1', type: 'helper'},
            {id: 'out2', type: 'helper'},
        ]);
        const out1 = helper.getNode('out1');
        const out2 = helper.getNode('out2');
        const [v, m] = await Promise.all([nextMessage(out1), nextMessage(out2)]);
        assert.equal(v.payload, 7);
        assert.equal(m.payload, false);

        mock.setMuted(true);
        const muted = await nextMessage(out2);
        assert.equal(muted.payload, true);
        mock.setVolume(3);
        const vol = await nextMessage(out1);
        assert.equal(vol.payload, 3);
    });

    test('mute: sets and reports mute state', async () => {
        await load(flowWith('mute', {passthru: true}));
        const out = helper.getNode('out');
        await nextMessage(out); // initial
        const n1 = helper.getNode('n1');
        n1.receive({payload: 1});
        const passed = await nextMessage(out);
        assert.equal(passed.payload, true);
        assert.deepEqual(mock.requests('ssap://audio/setMute')[0].payload, {mute: true});
    });

    test('button: sends button presses including the digit 0 over the pointer socket', async () => {
        await loadConnected(flowWith('button'));
        const n1 = helper.getNode('n1');
        n1.receive({payload: 'home'});
        n1.receive({payload: 0});
        n1.receive({payload: ''}); // ignored
        await waitFor(() => mock.pointer.length === 2, 2000, 'button frames');
        assert.deepEqual(mock.pointer, ['type:button\nname:HOME\n\n', 'type:button\nname:0\n\n']);
    });

    test('mouse: move, drag, scroll and click', async () => {
        await loadConnected(flowWith('mouse'));
        const n1 = helper.getNode('n1');
        n1.receive({topic: 'move', payload: {dx: 10, dy: -5}});
        n1.receive({topic: 'drag', payload: {dx: 1, dy: 2}});
        n1.receive({topic: 'scroll', payload: {dy: 3}});
        n1.receive({topic: 'click'});
        await waitFor(() => mock.pointer.length === 4, 2000, 'pointer frames');
        assert.deepEqual(mock.pointer, [
            'type:move\ndx:10\ndy:-5\n\n',
            'type:drag\ndx:1\ndy:2\ndrag:1\n\n',
            'type:scroll\ndx:0\ndy:3\n\n',
            'type:click\n\n',
        ]);
    });

    test('app: launches apps and reports the foreground app', async () => {
        await load(flowWith('app', {passthru: true}));
        const out = helper.getNode('out');
        const tv = helper.getNode('tv');
        await waitFor(() => tv.connected);
        const n1 = helper.getNode('n1');
        n1.receive({payload: 'netflix'});
        const passed = await nextMessage(out);
        assert.equal(passed.payload, 'netflix');
        assert.deepEqual(mock.requests('ssap://system.launcher/launch')[0].payload, {id: 'netflix'});

        mock.setForegroundApp('youtube.leanback.v4');
        const fg = await nextMessage(out);
        assert.equal(fg.payload, 'youtube.leanback.v4');
    });

    test('youtube: video id via contentId, URL via contentTarget', async () => {
        await loadConnected(flowWith('youtube'));
        const n1 = helper.getNode('n1');
        n1.receive({payload: 'dQw4w9WgXcQ'});
        n1.receive({payload: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'});
        await waitFor(() => mock.requests('ssap://system.launcher/launch').length === 2);
        const [byId, byUrl] = mock.requests('ssap://system.launcher/launch').map((m) => m.payload);
        assert.deepEqual(byId, {id: 'youtube.leanback.v4', contentId: 'dQw4w9WgXcQ'});
        assert.deepEqual(byUrl, {
            id: 'youtube.leanback.v4',
            params: {contentTarget: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},
        });
    });

    test('browser: opens a URL and closes the browser on empty payload', async () => {
        await loadConnected(flowWith('browser'));
        const n1 = helper.getNode('n1');
        n1.receive({payload: 'https://example.org'});
        n1.receive({payload: ''});
        await waitFor(() => mock.requests('ssap://system.launcher/close').length === 1);
        assert.deepEqual(mock.requests('ssap://system.launcher/open')[0].payload, {target: 'https://example.org'});
        assert.deepEqual(mock.requests('ssap://system.launcher/close')[0].payload, {id: 'com.webos.app.browser'});
    });

    test('toast: message, click target and icon', async () => {
        await loadConnected(flowWith('toast'));
        const n1 = helper.getNode('n1');
        n1.receive({payload: 'Hello', url: 'https://example.org', iconData: Buffer.from('png'), iconExtension: 'PNG'});
        n1.receive({payload: 'Plain'});
        await waitFor(() => mock.requests('ssap://system.notifications/createToast').length === 2);
        const [withIcon, plain] = mock.requests('ssap://system.notifications/createToast').map((m) => m.payload);
        assert.deepEqual(withIcon, {
            message: 'Hello',
            onClick: {target: 'https://example.org'},
            iconData: Buffer.from('png').toString('base64'),
            iconExtension: 'PNG',
        });
        assert.deepEqual(plain, {message: 'Plain'});
    });

    test('channel: switches by id or number and reports the current channel', async () => {
        await load(flowWith('channel', {payloadType: 'channelNumber', passthru: false}));
        const out = helper.getNode('out');
        const current = await nextMessage(out);
        assert.equal(current.payload, '5');
        assert.equal(current.channelName, 'Mock TV');

        const n1 = helper.getNode('n1');
        n1.receive({payload: '1_10_7_0_0_1_1'});
        n1.receive({payload: 12});
        await waitFor(() => mock.requests('ssap://tv/openChannel').length === 2);
        const [byId, byNumber] = mock.requests('ssap://tv/openChannel').map((m) => m.payload);
        assert.deepEqual(byId, {channelId: '1_10_7_0_0_1_1'});
        assert.deepEqual(byNumber, {channelNumber: '12'});
    });

    test('request: arbitrary uri with response, errors from the TV go to node.error', async () => {
        await loadConnected(flowWith('request'));
        const out = helper.getNode('out');
        const n1 = helper.getNode('n1');
        n1.receive({topic: 'ssap://api/getServiceList', payload: {}});
        const res = await nextMessage(out);
        assert.equal(res.topic, 'ssap://api/getServiceList');
        assert.deepEqual(res.payload.services, [{name: 'api', version: 1}]);

        const errPromise = nextError(n1);
        n1.receive({topic: 'ssap://does/notExist'});
        const err = await errPromise;
        assert.equal(err.code, 'ESSAP');
        assert.match(err.message, /404/);

        const err2Promise = nextError(n1);
        n1.receive({payload: {}});
        const err2 = await err2Promise;
        assert.match(err2.message, /msg.topic/);
    });

    test('redeploy: listeners are removed, no duplicate connection state messages', async () => {
        await load(flowWith('control'));
        const tv = helper.getNode('tv');
        await waitFor(() => tv.connected);
        assert.equal(tv.listenerCount('tvconnect'), 1);
        await helper.unload();
        assert.equal(tv.listenerCount('tvconnect'), 0);
        await waitFor(() => mock.connections === 0, 5000, 'connection closed on unload');
    });

    test('editor pairing endpoint: returns the token once the TV accepted', async () => {
        await load([{id: 'x', type: 'lgtv-config', host: 'unused.invalid', secure: 'ws', port: '1'}]);
        const url = '/lgtv-connect?id=new&host=' + HOST + '&secure=ws&port=' + mock.port;
        let data;
        const started = Date.now();
        while (!(data && data.token)) {
            const response = await helper.request().get(url).expect(200);
            data = response.body;
            if (Date.now() - started > 5000) {
                assert.fail('timeout waiting for pairing token, last state: ' + JSON.stringify(data));
            }
            await new Promise((r) => setTimeout(r, 50));
        }
        assert.equal(data.token, CLIENT_KEY);
        assert.equal(data.state, 'Connected');
        await helper.request().get('/lgtv-connect').expect(400);
    });
});
