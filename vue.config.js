module.exports = {
  configureWebpack: {
    resolve: {
      mainFields: ['main', 'browser'],
    },
  },
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        appId: 'com.touchelf.center',
        productName: '触摸精灵',
      },
    },
  },
}
