import Media3Transformer, {
  Layout,
  VideoEffectType,
  createPresentationForAspectRatio,
  type TransformerOptions,
} from '@hortemo/expo-media3-transformer';
import { Platform, SafeAreaView, ScrollView, Text, View } from 'react-native';

const sampleOptions: TransformerOptions = {
  mediaItem: {
    uri: 'file:///absolute/path/to/input.mp4',
    videoEffects: [createPresentationForAspectRatio(1, Layout.SCALE_TO_FIT)],
  },
  outputPath: 'file:///absolute/path/to/output.mp4',
};

export default function App() {
  const supported = Platform.OS === 'android';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Media3 Transformer</Text>
        <Group name="Platform support">
          <Text>
            {supported
              ? 'Media3Transformer runs natively on Android using ExoPlayer Media3.'
              : 'Media3Transformer is available on Android. Update your app logic to guard calls on other platforms.'}
          </Text>
        </Group>
        <Group name="Exports">
          <Text>Layouts: {JSON.stringify(Layout)}</Text>
          <Text>Video effects: {JSON.stringify(VideoEffectType)}</Text>
        </Group>
        <Group name="Usage">
          <Text selectable>
{`await Media3Transformer.transform({
  ...sampleOptions,
  mediaItem: {
    ...sampleOptions.mediaItem,
    // Provide valid URIs and optional effects/processors.
  },
});`}
          </Text>
          <Text style={styles.hint}>
            Provide valid file:// URIs before calling transform. The sample options above show the
            structure expected by the native module.
          </Text>
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = {
  header: {
    fontSize: 30,
    margin: 20,
  },
  groupHeader: {
    fontSize: 20,
    marginBottom: 20,
  },
  group: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#eee',
  },
  hint: {
    marginTop: 16,
    color: '#666',
  },
};
