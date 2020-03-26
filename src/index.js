import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { webusb } from './webusb';

const terminal = new Terminal();
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(document.getElementById('terminal'));
fitAddon.fit();
window.addEventListener("resize", () => fitAddon.fit(), true);

terminal.write("\r\n\
WebUSB Terminal\r\n\
\r\n\
A Web terminal over WebUSB.\r\n\
\r\n\
  * Source: https://github.com/xiongyihui/webusb-terminal\r\n\
");

document.getElementById('connect').onclick = (event) => {
  var element = event.srcElement;
  if (element.innerText === 'DISCONNECT') {
    element.innerText = 'CONNECT';
    element.blur();
    webusb.device.disconnect();
    console.log('disconnected');
    return;
  }
  webusb.connect().then(device => {
    console.log('connected');
    element.innerText = 'DISCONNECT';
    terminal.focus();
    if (!webusb.device) {
      terminal.clear();
    }
    webusb.device = device;

    device.onReceive = data => {
      let textDecoder = new TextDecoder();
      let text = textDecoder.decode(data);
      console.log(`receive:${text}`);
      terminal.write(text);
    };

    device.onReceiveError = error => {
      element.innerText = 'CONNECT';
      console.log(error);
    };

    var queue = [];
    var send = () => {
      if (queue.length > 0) {
        let data = queue[0];
        device.send(data).then((result) => {
          console.log(result);
          queue.shift();
          send();
        }, error => {
          element.innerText = 'CONNECT';
          console.log(error);
        });
      }
    }

    terminal.onData(data => {
      if (element.innerText === 'CONNECT') {
        return;
      }
      let view = new TextEncoder('utf-8').encode(data);
      if (queue.length >= 2) {
        queue[queue.length - 1] = Int8Array.from([...queue[queue.length - 1], ...view]);
      } else if (queue.length == 1) {
        queue.push(view);
      } else {
        queue.push(view);
        send();
      }
    });
  });
};
