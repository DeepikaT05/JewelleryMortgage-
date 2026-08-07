// Expo config plugin: raise the Gradle & Kotlin compiler JVM heap for Expo 52.
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    const setProp = (key, value) => {
      const idx = cfg.modResults.findIndex(
        (item) => item.type === 'property' && item.key === key
      );
      const entry = { type: 'property', key, value };
      if (idx >= 0) {
        cfg.modResults[idx] = entry;
      } else {
        cfg.modResults.push(entry);
      }
    };

    setProp('org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC -Dfile.encoding=UTF-8');
    setProp('kotlin.daemon.jvmargs', '-Xmx3072m -XX:MaxMetaspaceSize=768m');

    return cfg;
  });
};
