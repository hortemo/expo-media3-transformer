import { useCallback, useMemo, useState } from "react";
import Media3Transformer, {
  Layout,
  VideoEffectType,
  createPresentationForAspectRatio,
  type TransformerOptions,
  type TransformerResult,
} from "@hortemo/expo-media3-transformer";
import * as FileSystem from "expo-file-system";
import {
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

type TransformationStatus =
  | "idle"
  | "downloading"
  | "transforming"
  | "verifying"
  | "done"
  | "error";

const SAMPLE_VIDEO_URL =
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

export default function App() {
  const supported = Platform.OS === "android";
  const [status, setStatus] = useState<TransformationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transformResult, setTransformResult] =
    useState<TransformerResult | null>(null);
  const [outputFileExists, setOutputFileExists] = useState<boolean | null>(
    null
  );
  const [outputFileSize, setOutputFileSize] = useState<number | null>(null);

  const cacheDirectoryUri = useMemo(() => {
    try {
      return FileSystem.Paths.cache.uri;
    } catch {
      return null;
    }
  }, []);

  const statusMessage = useMemo(() => {
    switch (status) {
      case "downloading":
        return "Downloading sample video";
      case "transforming":
        return "Transforming sample video";
      case "verifying":
        return "Verifying output file";
      case "done":
        return "Transformation succeeded";
      case "error":
        return "Transformation failed";
      default:
        return "Idle";
    }
  }, [status]);

  const transformSampleVideo = useCallback(async () => {
    if (!supported) {
      return;
    }

    if (!cacheDirectoryUri) {
      setStatus("error");
      setErrorMessage("Cache directory unavailable.");
      return;
    }

    const inputFile = new FileSystem.File(
      cacheDirectoryUri,
      "sample-input.mp4"
    );
    const outputFile = new FileSystem.File(
      cacheDirectoryUri,
      "sample-output.mp4"
    );
    const outputDirectory = outputFile.parentDirectory;

    setStatus("downloading");
    setErrorMessage(null);
    setTransformResult(null);
    setOutputFileExists(null);
    setOutputFileSize(null);

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
        SAMPLE_VIDEO_URL,
        inputFile,
        { idempotent: true }
      );

      setStatus("transforming");

      const result = await Media3Transformer.transform({
        mediaItem: {
          uri: downloadedFile.uri,
        },
        outputPath: outputFile.uri,
      });

      setTransformResult(result);

      setStatus("verifying");

      const info = outputFile.info();

      setOutputFileExists(info.exists);

      if (!info.exists) {
        setOutputFileSize(null);
        throw new Error("Output file was not created.");
      }

      setOutputFileSize(typeof info.size === "number" ? info.size : null);

      setStatus("done");
    } catch (error) {
      setStatus("error");
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unknown error while transforming sample video.");
      }
    }
  }, [cacheDirectoryUri, supported]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Media3 Transformer</Text>

        <Group name="End-to-end test">
          <Text>
            The button below downloads a sample video, transforms it, and checks
            that the output file exists.
          </Text>
          <Button
            title="Transform sample video"
            onPress={transformSampleVideo}
            disabled={
              !supported ||
              status === "downloading" ||
              status === "transforming" ||
              status === "verifying"
            }
          />
          <Text style={styles.statusText}>
            Transformation status: {statusMessage}
          </Text>
          {outputFileExists !== null && (
            <Text style={styles.statusText}>
              Output file exists: {outputFileExists ? "yes" : "no"}
            </Text>
          )}
          {outputFileSize !== null && (
            <Text style={styles.statusText}>
              Output file size (bytes): {outputFileSize}
            </Text>
          )}
          {transformResult && (
            <Text style={styles.statusText}>
              Transformer result duration (ms): {transformResult.durationMs}
            </Text>
          )}
          {errorMessage && (
            <Text style={[styles.statusText, styles.errorText]}>
              Error message: {errorMessage}
            </Text>
          )}
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
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#eee",
  },
  hint: {
    marginTop: 16,
    color: "#666",
  },
  statusText: {
    marginTop: 12,
  },
  errorText: {
    color: "#d22",
  },
};
