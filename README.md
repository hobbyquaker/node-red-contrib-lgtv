# node-red-contrib-lgtv

[![NPM version](https://badge.fury.io/js/node-red-contrib-lgtv.svg)](http://badge.fury.io/js/node-red-contrib-lgtv)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/node-red-contrib-lgtv.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/node-red-contrib-lgtv)
[![License][mit-badge]][mit-url]

> Node-RED Nodes to Control LG WebOS Smart TVs

With these Nodes you can:
* Start Apps (this also includes changing the HDMI Inputs - these are also apps under WebOS)
* Change Volume / Mute
* Turn your TV off (turning on over the Websocket API is not possible because the network interfaces are down when the 
TV is in standby. You can work around this via WakeOnLAN or Infrared)
* Switch Channels on LiveTV
* Press Remote Buttons
* Move the mouse, drag, scroll and click.
* Show Popup Toasts on your TV

But that's not all - some of the nodes have an output, meaning you can also receive events:
* Volume and mute changes
* Foreground app changes
* Channel changes on LiveTV


## License

MIT (c) Sebastian Raff

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
