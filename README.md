# node-red-contrib-lgtv-updated

This repository is a fork from [node-red-contrib-lgtv](https://github.com/hobbyquaker/node-red-contrib-lgtv).     
It merges the existing forks to provide fullscreen, dependency updates, etc.
> Node-RED Nodes to Control LG webOS Smart TVs :tv:

With these Nodes you can:
* Start Apps (this also includes changing the HDMI Inputs - these are also apps under webOS)
* Change Volume / Mute
* Turn your TV off (turning on over the Websocket API is not possible because the network interfaces are down when the 
TV is in standby. You can work around this via WakeOnLAN or Infrared)
* Switch Channels on LiveTV
* Press Remote Buttons
* Move the mouse, drag, scroll and click
* Show Popup Toasts on your TV
* Open a URL in the Browser
* Play a Video in YouTube
* Send arbitrary commands to the API and receive the response

Some of the nodes have an output, so you can subscribe to events:
* Volume and mute changes
* Foreground app changes
* Channel changes on LiveTV


## Setup

You need to allow "LG Connect Apps" on your TV - see 
http://www.lg.com/uk/support/product-help/CT00008334-1437131798537-others

For the initial configuration you then just need the Hostname or IP-Address of your TV and 
click *Connect* in the `lgtv-config` node. The token should be filled automatically on first connect.

**Note**: After turning on the TV it takes ~25 seconds until the API is available.


## Usage Example

I made a flow using node-red-dashboard to create a simple Remote Control: 
http://flows.nodered.org/flow/f497989bef43fb9310837adbff69ce73


## Support, Contributing

For questions and suggestions open an [Issue](https://github.com/hobbyquaker/node-red-contrib-lgtv/issues/new) or chat 
me on Slack: [@hobbyquaker](https://node-red.slack.com/team/hobbyquaker).

Pull Requests welcome!


## License

MIT (c) Sebastian Raff

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
