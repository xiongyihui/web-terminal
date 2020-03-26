var webusb = {};

webusb.get = function () {
  return navigator.usb.getDevices().then(devices => {
    if (devices.length == 1) {
      return new webusb.Device(devices[0]);
    } else {
      return webusb.request();
    }
  });
};

webusb.request = function () {
  const filters = [
    { 'vendorId': 0x2fe3, 'productId': 0x0100 },
    { 'vendorId': 0x2fe3, 'productId': 0x00a },
    { 'vendorId': 0x8086, 'productId': 0xF8A1 },
    { 'vendorId': 0x1915, 'productId': 0x0060 },
  ];
  return navigator.usb.requestDevice({ 'filters': filters }).then(
    device => new webusb.Device(device)
  );
}

webusb.Device = function (dev) {
  this.device = dev;
};

webusb.Device.prototype.connect = function () {
  let readLoop = () => {
    const {
      endpointNumber
    } = this.device.configuration.interfaces[0].alternate.endpoints[0]
    this.device.transferIn(endpointNumber, 64).then(result => {
      this.onReceive(result.data);
      readLoop();
    }, error => {
      this.onReceiveError(error);
    });
  };

  this.onReceive = data => {
    console.log(data);
  };

  this.onReceiveError = error => {
    console.log(error);
  };

  return this.device.open()
    .then(() => {
      if (this.device.configuration === null) {
        return this.device.selectConfiguration(1);
      }
    })
    .then(() => this.device.claimInterface(0))
    .then(() => {
      readLoop();

      return Promise.resolve(this);
    });
};

webusb.Device.prototype.disconnect = function () {
  return this.device.close();
};

webusb.Device.prototype.send = function (data) {
  const {
    endpointNumber
  } = this.device.configuration.interfaces[0].alternate.endpoints[1];
  return this.device.transferOut(endpointNumber, data);
};

webusb.connect = function () {
  return webusb.get().then(device => {
    return device.connect();
  });
};

export { webusb };
