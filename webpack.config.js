const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Disable React Fast Refresh completely
  const definePlugin = config.plugins.find(
    plugin => plugin.constructor.name === 'DefinePlugin'
  );

  if (definePlugin) {
    definePlugin.definitions['process.env.__REACT_REFRESH__'] = 'false';
  }

  // Remove ReactRefreshPlugin
  config.plugins = config.plugins.filter(
    plugin => plugin.constructor.name !== 'ReactRefreshPlugin'
  );

  // Remove react-refresh from babel-loader
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(oneOfRule => {
        if (oneOfRule.use) {
          const use = Array.isArray(oneOfRule.use) ? oneOfRule.use : [oneOfRule.use];
          use.forEach(loader => {
            if (loader.loader && loader.loader.includes('babel-loader')) {
              if (loader.options && loader.options.plugins) {
                loader.options.plugins = loader.options.plugins.filter(
                  plugin => {
                    if (typeof plugin === 'string') {
                      return !plugin.includes('react-refresh');
                    }
                    if (Array.isArray(plugin) && typeof plugin[0] === 'string') {
                      return !plugin[0].includes('react-refresh');
                    }
                    return true;
                  }
                );
              }
            }
          });
        }
      });
    }
  });

  // Add CSS loader for Tailwind/NativeWind
  config.module.rules.push({
    test: /\.css$/,
    use: ['style-loader', 'css-loader', 'postcss-loader'],
  });

  return config;
};
