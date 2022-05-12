const { Instance, Controller } = require('../dist');

(async () => {
    const options = {
        revision: 346071,
        port: 9222,
        debug: false
    };

    const instance = new Instance(options);
    await instance.launch();

    const controller = new Controller(options);
    await controller.connect();
    await controller.navigate('https://github.com/Stremio');

    const h1Element = await controller.getElementBySelector('h1');
    console.log(h1Element?.text({
        removeWhitespaces: true
    }));

    await controller.setStorageItem('hey', 'nice');

    await controller.disconnect();
    await instance.exit();
})();