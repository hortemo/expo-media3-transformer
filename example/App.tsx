import { type ReactNode, useCallback, useMemo, useState } from "react";
import Media3Transformer, {
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

type UserProvidedTransformOptions = Partial<TransformerOptions>;

type NumericExpectation = {
  equals?: number;
  tolerance?: number;
  min?: number;
  max?: number;
};

type TestExpectations = Partial<
  Record<keyof TransformerResult, NumericExpectation>
>;

type TestCaseDefinition = {
  id: string;
  label: string;
  videoUrl: string;
  options: UserProvidedTransformOptions;
  expectedResult: TestExpectations;
};

type TestStatus = {
  status: TransformationStatus;
  errorMessage: string | null;
};

type TestStatusMap = Record<string, TestStatus>;

const SAMPLE_VIDEO_URL =
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

const TEST_CASES: TestCaseDefinition[] = [
  {
    id: "basic",
    label: "Basic transform",
    videoUrl: SAMPLE_VIDEO_URL,
    options: {},
    expectedResult: {
      width: { equals: 640 },
      height: { equals: 360 },
      durationMs: { equals: 13_313 },
      fileSizeBytes: { equals: 572_481 },
    },
  },
  {
    id: "clip",
    label: "Clip with bitrate",
    videoUrl: SAMPLE_VIDEO_URL,
    options: {
      mediaItem: {
        clippingConfiguration: {
          startPositionMs: 1000,
          endPositionMs: 6000,
        },
      },
      encoderFactory: {
        requestedVideoEncoderSettings: {
          bitrate: 1_000_000,
        },
      },
    },
    expectedResult: {
      width: { equals: 640 },
      height: { equals: 360 },
      durationMs: { min: 4900, max: 5100 },
      averageVideoBitrate: { min: 950_000, max: 1_050_000 },
    },
  },
  {
    id: "effects",
    label: "Scale and rotate",
    videoUrl: SAMPLE_VIDEO_URL,
    options: {
      mediaItem: {
        videoEffects: [
          {
            type: "ScaleAndRotateTransformation",
            scaleX: 0.5,
            scaleY: 0.5,
            rotationDegrees: 0,
          },
        ],
      },
    },
    expectedResult: {
      width: { equals: 320 },
      height: { equals: 180 },
      durationMs: { equals: 13_313 },
    },
  },
];

const createInitialStatuses = (): TestStatusMap =>
  TEST_CASES.reduce<TestStatusMap>((acc, testCase) => {
    acc[testCase.id] = { status: "idle", errorMessage: null };
    return acc;
  }, {} as TestStatusMap);

const isRunningStatus = (status: TransformationStatus) =>
  status === "downloading" ||
  status === "transforming" ||
  status === "verifying";

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

const validateNumberExpectation = (
  key: keyof TransformerResult,
  expectation: NumericExpectation,
  actualValue: number
): string | null => {
  if (
    expectation.equals !== undefined &&
    Math.abs(actualValue - expectation.equals) > (expectation.tolerance ?? 0)
  ) {
    const toleranceText = expectation.tolerance
      ? `±${expectation.tolerance}`
      : "";
    return `${String(key)} expected ${
      expectation.equals
    }${toleranceText} but got ${actualValue}`;
  }

  if (expectation.min !== undefined && actualValue < expectation.min) {
    return `${String(key)} expected ≥ ${
      expectation.min
    } but got ${actualValue}`;
  }

  if (expectation.max !== undefined && actualValue > expectation.max) {
    return `${String(key)} expected ≤ ${
      expectation.max
    } but got ${actualValue}`;
  }

  return null;
};

const assertResultMatches = (
  result: TransformerResult,
  expectation: TestExpectations
): void => {
  const failures: string[] = [];

  (
    Object.entries(expectation) as Array<
      [keyof TransformerResult, NumericExpectation]
    >
  ).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    const actualValue = result[key];

    if (typeof actualValue !== "number") {
      failures.push(
        `${String(key)} expected numeric value but got ${String(actualValue)}`
      );
      return;
    }

    const failure = validateNumberExpectation(key, value, actualValue);
    if (failure) {
      failures.push(failure);
    }
  });

  if (failures.length > 0) {
    throw new Error(`Expectation failed: ${failures.join("; ")}`);
  }
};

export default function App() {
  const supported = Platform.OS === "android";
  const cacheDirectoryUri = useMemo(() => {
    try {
      return FileSystem.Paths.cache.uri;
    } catch {
      return null;
    }
  }, []);
  const [testStatuses, setTestStatuses] = useState<TestStatusMap>(
    createInitialStatuses
  );

  const updateStatus = useCallback(
    (
      testCaseId: string,
      status: TransformationStatus,
      errorMessage: string | null = null
    ) => {
      setTestStatuses((previousStatuses) => ({
        ...previousStatuses,
        [testCaseId]: { status, errorMessage },
      }));
    },
    []
  );

  const runTestCase = useCallback(
    async (testCase: TestCaseDefinition) => {
      if (!supported) {
        updateStatus(
          testCase.id,
          "error",
          "Media3 Transformer is only supported on Android."
        );
        return;
      }

      if (!cacheDirectoryUri) {
        updateStatus(testCase.id, "error", "Cache directory unavailable.");
        return;
      }

      updateStatus(testCase.id, "downloading");

      const inputFile = new FileSystem.File(
        cacheDirectoryUri,
        `${testCase.id}-input.mp4`
      );
      const outputFile = new FileSystem.File(
        cacheDirectoryUri,
        `${testCase.id}-output.mp4`
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
          testCase.videoUrl,
          inputFile,
          { idempotent: true }
        );

        updateStatus(testCase.id, "transforming");

        const options = normalizeTransformOptions(
          testCase.options,
          downloadedFile.uri,
          outputFile.uri
        );

        const transformResult = await Media3Transformer.transform(options);

        updateStatus(testCase.id, "verifying");

        const info = outputFile.info();
        const exists = info.exists;

        if (!exists) {
          throw new Error("Output file was not created.");
        }

        assertResultMatches(transformResult, testCase.expectedResult);

        updateStatus(testCase.id, "done");
      } catch (error) {
        updateStatus(
          testCase.id,
          "error",
          error instanceof Error
            ? error.message
            : "Unknown error while transforming video."
        );
      }
    },
    [cacheDirectoryUri, supported, updateStatus]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Media3 Transformer</Text>

        <Group name="Automated test cases">
          {TEST_CASES.map((testCase) => {
            const status =
              testStatuses[testCase.id] ??
              ({ status: "idle", errorMessage: null } as TestStatus);
            const running = isRunningStatus(status.status);

            return (
              <View key={testCase.id} style={styles.testCase}>
                <Text style={styles.testCaseTitle}>{testCase.label}</Text>

                <Button
                  testID={`testButton-${testCase.id}`}
                  title={running ? "Running..." : "Run test"}
                  onPress={() => runTestCase(testCase)}
                  disabled={!supported || running}
                />

                <Text
                  testID={`testStatus-${testCase.id}`}
                  style={styles.statusText}
                >
                  {status.status}
                </Text>

                {status.errorMessage && (
                  <Text
                    testID={`testError-${testCase.id}`}
                    style={[styles.statusText, styles.errorText]}
                  >
                    Error message: {status.errorMessage}
                  </Text>
                )}
              </View>
            );
          })}
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

function Group(props: { name: string; children: ReactNode }) {
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
  testCase: {
    marginBottom: 24,
  },
  testCaseTitle: {
    fontWeight: "600",
    marginBottom: 12,
  },
} as const;
