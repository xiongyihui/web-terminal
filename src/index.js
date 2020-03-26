import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { webusb } from './webusb';
import { serial } from './ble';

import './style.css';
import '../node_modules/xterm/css/xterm.css';

const terminal = new Terminal();
const fitAddon = new FitAddon();

window.onload = () => {
  terminal.loadAddon(fitAddon);
  terminal.open(document.getElementById('terminal'));
  fitAddon.fit();
  window.addEventListener("resize", () => fitAddon.fit(), true);

  var showConnectUI = () => {
    document.getElementById('disconnect').style.display = 'none';
    document.getElementById('container').style.display = 'flex';
    terminal.onData(() => {});
  }

  var showDisconnectUI = () => {
    document.getElementById('container').style.display = 'none';
    document.getElementById('disconnect').style.display = 'block';
  }

  var setup = device => {
      console.log('connected');
      showDisconnectUI();
      terminal.focus();
      console.log(device);
      document.getElementById('disconnect').onclick = () => {
        if (device) {
          device.disconnect();
        }
        showConnectUI();
      };

      device.onReceive = data => {
        let textDecoder = new TextDecoder();
        let text = textDecoder.decode(data);
        console.log(`receive:${text}`);
        terminal.write(text);
      };

      device.onDisconnect = () => {
        showConnectUI();
      };

      terminal.onData(data => {
        device.send(data);
      });
    };

  document.getElementById('connect').onclick = () => {
    webusb.connect().then(setup);
  };

  document.getElementById('bt-connect').onclick = () => {
    serial.connect().then(setup);
  };
};
