
var serial = {};

const bleNusServiceUUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const bleNusCharRXUUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const bleNusCharTXUUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const MTU = 20;

serial.get = function () {
  return serial.request();
  // return navigator.bluetooth.getDevices().then(devices => {
  //   if (devices.length == 1) {
  //     return new serial.Device(devices[0]);
  //   } else {
  //     return serial.request();
  //   }
  // });
};

serial.request = function () {
  return navigator.bluetooth.requestDevice({
    //filters: [{services: []}]
    optionalServices: [bleNusServiceUUID],
    acceptAllDevices: true
  })
    .then(
      device => new serial.Device(device)
    );
}

serial.Device = function (dev) {
  this.device = dev;
  this.queue = [];
};

serial.Device.prototype.connect = function () {
  this.onReceive = (data) => console.log(data);
  this.onDisconnected = () => console.log('disconnected');
  this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
  this.device.gatt.connect()
    .then(server => {
      console.log('Locate NUS service');
      return server.getPrimaryService(bleNusServiceUUID);
    })
    .then(service => {
      this.nusService = service;
      console.log('Found NUS service: ' + service.uuid);
      console.log('Locate RX characteristic');
      return service.getCharacteristic(bleNusCharRXUUID);
    })
    .then(characteristic => {
      this.rxCharacteristic = characteristic;
      console.log('Found RX characteristic');
      console.log('Locate TX characteristic');
      return this.nusService.getCharacteristic(bleNusCharTXUUID);
    })
    .then(characteristic => {
      this.txCharacteristic = characteristic;
      console.log('Found TX characteristic');
      console.log('Enable notifications');
      return this.txCharacteristic.startNotifications();
    })
    .then(() => {
      console.log('Notifications started');
      this.txCharacteristic.addEventListener('characteristicvaluechanged',
        (e) => this.onReceive(e.target.value));
      this.send('\r');
    });
  // .catch(error => {
  //   console.log(error);
  //   if (this.device && this.device.gatt.connected) {
  //     this.device.gatt.disconnect();
  //   }
  // });

  return Promise.resolve(this);
}

serial.Device.prototype.disconnect = function () {
  if (this.device && this.device.gatt.connected) {
    return this.device.gatt.disconnect();
  }
};

serial.Device.prototype.sendRaw = function (data) {
  return this.rxCharacteristic.writeValue(data);
};

serial.Device.prototype.send = function (data) {
  var sendLoop = () => {
    if (this.queue.length > 0) {
      let data = this.queue[0];
      return this.sendRaw(data).then((result) => {
        console.log(result);
        this.queue.shift();
        return sendLoop();
      });
    }
  }

  let view = new TextEncoder('utf-8').encode(data);
  if (view.length > MTU) {
    let index = 0;
    do {
      this.queue.push(view.slice(index, index + MTU));
      index += MTU;
    } while (view.length > MTU);
    this.queue.push(view.slice(index));
  } else if (this.queue.length >= 2 && (this.queue[this.queue.length - 1].length + view.length) < MTU) {
    this.queue[this.queue.length - 1] = Int8Array.from([...this.queue[this.queue.length - 1], ...view]);
  } else {
    this.queue.push(view);
  }

  if (this.queue.length == 1) {
    return sendLoop();
  }
};

serial.connect = function () {
  return serial.get().then(device => {
    return device.connect();
  });
};

export { serial };

