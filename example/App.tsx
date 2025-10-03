import { useCallback, useMemo, useState } from "react";
import Media3Transformer, {
  type TransformerOptions,
} from "@hortemo/expo-media3-transformer";
import * as FileSystem from "expo-file-system";
import {
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type TransformationStatus =
  | "idle"
  | "downloading"
  | "transforming"
  | "verifying"
  | "done"
  | "error";

type UserProvidedTransformOptions = Partial<TransformerOptions>;

const SAMPLE_VIDEO_URL =
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

const MONOSPACE_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const normalizeTransformOptions = (
  input: UserProvidedTransformOptions,
  inputUri: string,
  outputUri: string
): TransformerOptions => {
  const mediaItemFromInput: Partial<TransformerOptions["mediaItem"]> =
    input.mediaItem ? { ...input.mediaItem } : {};

  const resolvedMediaItem: TransformerOptions["mediaItem"] = {
    ...mediaItemFromInput,
    uri:
      typeof mediaItemFromInput.uri === "string" &&
      mediaItemFromInput.uri.trim().length > 0
        ? mediaItemFromInput.uri
        : inputUri,
  } as TransformerOptions["mediaItem"];

  const resolvedOutputPath =
    typeof input.outputPath === "string" && input.outputPath.trim().length > 0
      ? input.outputPath
      : outputUri;

  return {
    ...input,
    mediaItem: resolvedMediaItem,
    outputPath: resolvedOutputPath,
  } as TransformerOptions;
};

export default function App() {
  const supported = Platform.OS === "android";
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [transformOptionsText, setTransformOptionsText] = useState<string>("");
  const [status, setStatus] = useState<TransformationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transformerResultJson, setTransformerResultJson] =
    useState<string>("");

  const cacheDirectoryUri = useMemo(() => {
    try {
      return FileSystem.Paths.cache.uri;
    } catch {
      return null;
    }
  }, []);

  const runTransform = useCallback(async () => {
    if (!supported) {
      return;
    }

    if (!cacheDirectoryUri) {
      setStatus("error");
      setErrorMessage("Cache directory unavailable.");
      return;
    }

    setStatus("downloading");
    setErrorMessage(null);
    setTransformerResultJson("");

    let parsedOptions: UserProvidedTransformOptions;

    try {
      parsedOptions = JSON.parse(
        transformOptionsText
      ) as UserProvidedTransformOptions;
    } catch (parseError) {
      setStatus("error");
      setErrorMessage(
        parseError instanceof Error
          ? `Invalid transform options JSON: ${parseError.message}`
          : "Invalid transform options JSON."
      );
      return;
    }

    const inputFile = new FileSystem.File(
      cacheDirectoryUri,
      "configurable-input.mp4"
    );
    const outputFile = new FileSystem.File(
      cacheDirectoryUri,
      "configurable-output.mp4"
    );
    const outputDirectory = outputFile.parentDirectory;

    try {
      if (!outputDirectory.exists) {
        outputDirectory.create({ intermediates: true, idempotent: true });
      }

      if (inputFile.exists) {
        inputFile.delete();
      }
      if (outputFile.exists) {
        outputFile.delete();
      }

      const downloadedFile = await FileSystem.File.downloadFileAsync(
        videoUrl,
        inputFile,
        { idempotent: true }
      );

      setStatus("transforming");

      const options = normalizeTransformOptions(
        parsedOptions,
        downloadedFile.uri,
        outputFile.uri
      );

      const transformResult = await Media3Transformer.transform(options);

      setStatus("verifying");

      const info = outputFile.info();
      const exists = info.exists;

      if (!exists) {
        throw new Error("Output file was not created.");
      }

      setTransformerResultJson(JSON.stringify(transformResult));
      setStatus("done");
    } catch (error) {
      setTransformerResultJson("");
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unknown error while transforming video."
      );
    }
  }, [cacheDirectoryUri, supported, transformOptionsText, videoUrl]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Media3 Transformer</Text>

        <Group name="Transform configuration">
          <Text>Video URL</Text>
          <TextInput
            testID="videoUrlInput"
            accessibilityLabel="Video URL input"
            value={videoUrl}
            onChangeText={setVideoUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.textInput}
            placeholder="https://example.com/video.mp4"
          />

          <Text style={styles.sectionLabel}>TransformerOptions JSON</Text>
          <TextInput
            testID="transformOptions"
            accessibilityLabel="Transformer options input"
            value={transformOptionsText}
            onChangeText={setTransformOptionsText}
            autoCapitalize="none"
            autoCorrect={false}
            
            textAlignVertical="top"
            style={[styles.textInput, styles.textArea]}
            placeholder="{}"
          />

          <Button
            testID="transformButton"
            title="Download and transform"
            onPress={runTransform}
            disabled={
              !supported ||
              status === "downloading" ||
              status === "transforming" ||
              status === "verifying"
            }
          />

          <Text testID="transformStatus" style={styles.statusText}>
            {status}
          </Text>

          {errorMessage && (
            <Text style={[styles.statusText, styles.errorText]}>
              Error message: {errorMessage}
            </Text>
          )}

          <Text style={styles.sectionLabel}>TransformerResult JSON</Text>
          <TextInput
            testID="transformerResultOutput"
            accessibilityLabel="Transformer result output"
            value={transformerResultJson}
            editable={false}
            multiline
            textAlignVertical="top"
            style={[styles.textInput, styles.textArea, styles.resultTextArea]}
            placeholder="TransformerResult will appear here"
          />
        </Group>

        {!supported && (
          <Text style={[styles.statusText, styles.hint]}>
            Media3 Transformer is only supported on Android.
          </Text>
        )}
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
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#eee",
  },
  statusText: {
    marginTop: 12,
  },
  errorText: {
    color: "#d22",
  },
  hint: {
    marginTop: 16,
    color: "#666",
  },
  sectionLabel: {
    marginTop: 16,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    minHeight: 44,
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  textArea: {},
  resultTextArea: {
    backgroundColor: "#f7f7f7",
  },
} as const;
